import { Author, mirrorChain } from "./author";
import { CH_TORSO, chArm, chFinger, chFoot, chLeg } from "./chains";
import { FINGERS, THUMB } from "./hand";
import { MUSCLE_INDEX } from "./muscle-index";
import {
  L_MUSCLE,
  L_OVERLAY,
  L_SHORTS_FILL,
  MAT_EYE,
  MAT_LIP,
  MAT_NAIL,
  OP_SUB,
  Sculpt,
  type BumpSpec,
  type LoftSection,
  type PrimMeta,
  type PrimOpts,
  type V3,
} from "./sdf";
import { A_FINGER, A_FORE, A_HAND, A_UPPER, B_HEAD, L_FOOT, L_SHIN, L_THIGH, armBone, legBone, type BindFrame } from "./skeleton";

/**
 * The sculpt: an athletic male in the bind pose (A-pose).
 *
 * Each body segment is a loft (generalised cylinder) whose surface carries
 * the superficial muscles as "bumps" authored in the segment's own
 * coordinates: angle around the segment (0° front, 90° lateral / +z side,
 * ±180° back) and distance along it (cm). Adjacent muscles meet at carved
 * grooves, and joints, bony landmarks, the face, hands and feet are added as
 * primitives. Everything is authored for the midline and side 0 (+z, the
 * figure's right); paired primitives are mirrored automatically.
 *
 * Units are centimetres in bind space (y up from the floor, x forward).
 */

type Frames = BindFrame[];
type Profile = (t: number) => number;

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => scale(a, 1 / (len(a) || 1));
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Belly radius along a spindle: r0 at the origin, rmax at `peak`, r1 at the insertion. */
function belly(r0: number, rmax: number, r1: number, peak = 0.5, full = 1.6): Profile {
  return (t) => {
    const s = t < peak ? t / peak : (1 - t) / (1 - peak);
    const b = 1 - Math.pow(1 - Math.min(1, Math.max(0, s)), full);
    const base = r0 + (r1 - r0) * t;
    return base + (rmax - base) * b;
  };
}

/** Quadratic Bézier sampled into n points. */
function curve(a: V3, c: V3, b: V3, n = 4): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(add(add(scale(a, (1 - t) * (1 - t)), scale(c, 2 * t * (1 - t))), scale(b, t * t)));
  }
  return out;
}

/** Base torso cross-sections (ribcage, abdomen, pelvis under the muscles): y, front, back, side, exponent. */
const TORSO: [number, number, number, number, number][] = [
  [78, 7.5, 8.5, 11.5, 2.2],
  [84, 9.2, 10.4, 14.2, 2.3],
  [90, 10, 10.4, 15.4, 2.4],
  [96, 10, 9.6, 15.2, 2.4],
  [102, 9.8, 9.0, 14.2, 2.3],
  [108, 9.9, 8.8, 13.4, 2.2],
  [114, 10.4, 9.0, 13.6, 2.2],
  [120, 11.0, 9.4, 14.2, 2.2],
  [126, 11.6, 9.8, 14.8, 2.2],
  [132, 11.9, 10.1, 15.2, 2.2],
  [138, 11.6, 10.3, 15.2, 2.3],
  [144, 10.9, 10.3, 14.8, 2.3],
  [150, 9.8, 10.0, 14.0, 2.4],
  [156, 8.2, 9.2, 12.6, 2.4],
  [162, 6.6, 7.8, 9.4, 2.2],
  [168, 5.8, 6.4, 6.4, 2.0],
];
const TORSO_TOP = 168;
const TORSO_BOTTOM = 78;

function torsoRow(y: number) {
  let i = 0;
  while (i < TORSO.length - 2 && TORSO[i + 1][0] < y) i++;
  const a = TORSO[i];
  const b = TORSO[i + 1];
  const t = Math.min(1, Math.max(0, (y - a[0]) / (b[0] - a[0])));
  return [1, 2, 3, 4].map((k) => a[k] + (b[k] - a[k]) * t);
}

/** Point on the base torso at angle θ° (0 front, 90 = +z side) and height y, pushed out by `off`. */
function torsoAt(theta: number, y: number, off = 0): V3 {
  const [f, b, s] = torsoRow(y);
  const a = (theta * Math.PI) / 180;
  const ux = Math.cos(a);
  const uz = Math.sin(a);
  const ex = ux > 0 ? f : b;
  const r = 1 / Math.sqrt((ux / ex) ** 2 + (uz / s) ** 2);
  return [ux * (r + off), y, uz * (r + off)];
}

type Bump = { pts: [number, number][]; w: number[]; th: number[]; p?: number };

export function sculptBody(frames: Frames): Sculpt {
  const A = new Author();
  const F = (b: number) => frames[b];
  const M = MUSCLE_INDEX;
  const ARM = chArm(0);
  const LEG = chLeg(0);
  const FOOT = chFoot(0);
  const T = CH_TORSO;

  /** Point in a limb bone's frame (side 0): front, along the bone, lateral. */
  const U = (b: number, front: number, along: number, lat: number): V3 => {
    const f = F(b);
    return add(add(add(f.o, scale(f.x, front)), scale(f.y, along)), scale(f.z, -lat));
  };
  const ua = armBone(0, A_UPPER);
  const fa = armBone(0, A_FORE);
  const hand = armBone(0, A_HAND);
  const thigh = legBone(0, L_THIGH);
  const shin = legBone(0, L_SHIN);
  const foot = legBone(0, L_FOOT);
  const head = F(B_HEAD);
  /** Head-local point: forward, up, side (from the head centre). */
  const HL = (x: number, y: number, z: number): V3 => add(head.o, [x, y, z]);
  const hf = F(hand);
  /** Hand-local point: palmar, along, radial. */
  const HP = (p: number, a: number, r: number): V3 => add(add(add(hf.o, scale(hf.x, p)), scale(hf.y, a)), scale(hf.z, -r));
  const ff = F(foot);
  /** Foot-local point: forward, up, lateral. */
  const FP = (fw: number, up: number, lat: number): V3 => add(add(add(ff.o, scale(ff.x, fw)), scale(ff.y, up)), scale(ff.z, lat));
  const S = F(ua).o;

  const X: V3 = [1, 0, 0];
  const Y: V3 = [0, 1, 0];
  const Z: V3 = [0, 0, 1];
  const ID: [V3, V3, V3] = [X, Y, Z];
  const axes = (x: V3, y: V3): [V3, V3, V3] => {
    const nx = norm(x);
    const ny = norm(sub(y, scale(nx, nx[0] * y[0] + nx[1] * y[1] + nx[2] * y[2])));
    return [nx, ny, cross(nx, ny)];
  };
  const base = (o: PrimOpts & { chain?: number }): PrimOpts => ({ k: o.k ?? 1.5, op: o.op, layer: o.layer, meta: { chainA: o.chain ?? T, ...o.meta } });

  /** Muscle bumps for a loft: one group per muscle part, several strips per group. */
  const bumps = (
    list: BumpSpec[],
    part: string,
    muscle: number,
    strips: Bump[],
    o: { groove?: number; fibre?: number; tendon?: [number, number]; chain?: [number, number, number, number]; mirror?: boolean; ws?: number; ts?: number } = {},
  ) => {
    const group = A.group(part);
    const [chainA, chainB, chainT0, chainT1] = o.chain ?? [T, T, 0.5, 0.5];
    const meta: Partial<PrimMeta> = { name: part, muscle, chainA, chainB, chainT0, chainT1, fibre: o.fibre ?? 1, tendon: o.tendon ?? [0.08, 0.14] };
    for (const raw of strips) {
      const s = { ...raw, w: raw.w.map((v) => v * (o.ws ?? 1)), th: raw.th.map((v) => v * (o.ts ?? 1)) };
      list.push({ pts: s.pts, width: s.w, thick: s.th, p: s.p ?? 1.4, groove: o.groove ?? 0.3, group, meta });
      if (o.mirror) {
        // Midline lofts carry both sides explicitly.
        list.push({
          pts: s.pts.map(([a, b]) => [-a, b] as [number, number]),
          width: s.w,
          thick: s.th,
          p: s.p ?? 1.4,
          groove: o.groove ?? 0.3,
          group: group + 1000,
          meta: { ...meta, chainA: mirrorChain(chainA), chainB: mirrorChain(chainB) },
        });
      }
    }
  };

  /** A free-standing muscle made of one or more spindles sharing a group. */
  const muscle = (
    part: string,
    id: number,
    bundles: { pts: V3[]; r: Profile; flat?: number; flatDir?: V3 | V3[] }[],
    o: { k?: number; groove?: number; chain?: [number, number, number, number]; fibre?: number; tendon?: [number, number]; fibreTo?: V3 } = {},
  ) => {
    const group = A.group(part);
    const [chainA, chainB, chainT0, chainT1] = o.chain ?? [T, T, 0.5, 0.5];
    for (const b of bundles) {
      A.spindle(
        { pts: b.pts, radius: b.r, flat: b.flat, flatDir: b.flatDir },
        {
          layer: L_MUSCLE,
          k: o.k ?? 0.7,
          group,
          groove: o.groove ?? 0.22,
          meta: { name: part, muscle: id, chainA, chainB, chainT0, chainT1, fibre: o.fibre ?? 1, tendon: o.tendon ?? [0.12, 0.18], fibreTo: o.fibreTo },
        },
      );
    }
  };

  // Torso bump helper: (θ°, y) → loft coordinates (the torso loft runs top → bottom).
  const TB = (pts: [number, number][], w: number[], th: number[], p?: number): Bump => ({ pts: pts.map(([a, y]) => [a, TORSO_TOP - y] as [number, number]), w, th, p });

  // ───────────────────────────── TORSO ─────────────────────────────
  const torso: BumpSpec[] = [];
  // Pectoralis major: clavicular and sternal heads fanning into the armpit.
  bumps(torso, "pec-clav", M.chest, [TB([[9, 153.2], [40, 151.4], [70, 147.5]], [3.4, 3.4, 2.4], [1.3, 1.9, 1.3], 0.8)], { mirror: true, groove: 0.12, chain: [T, ARM, 0.75, 1] });
  bumps(
    torso,
    "pec",
    M.chest,
    [
      TB([[5, 147.2], [38, 145.2], [70, 145.2]], [4.4, 4.6, 3.2], [1.7, 2.3, 1.6], 0.8),
      TB([[5, 141], [36, 139], [69, 142.4]], [4.6, 4.8, 3.2], [1.9, 2.7, 1.8], 0.8),
      TB([[6, 135.2], [34, 132.8], [66, 139]], [3.8, 4.2, 2.8], [1.8, 2.8, 1.8], 0.8),
      TB([[14, 130.8], [38, 129.9], [63, 135.8]], [2.2, 2.6, 2.0], [1.0, 1.9, 1.3], 0.9),
    ],
    { mirror: true, groove: 0.3, chain: [T, ARM, 0.75, 1] },
  );
  // Rectus abdominis: four segments per side between the tendinous intersections.
  const absRows: [number, number, number, number][] = [
    [135.6, 128.6, 3.4, 1.35],
    [127.6, 120.8, 3.5, 1.45],
    [119.8, 113.0, 3.45, 1.4],
    [111.9, 90.5, 3.1, 1.25],
  ];
  absRows.forEach(([y0, y1, w, th], i) => {
    const narrow = i === 3 ? 0.65 : 1;
    bumps(torso, `abs-${i}`, M.abs, [TB([[20, y0 - 1.2], [20.5, (y0 + y1) / 2], [18, y1 + (i === 3 ? 0 : 1.2)]], [w, w * 1.02, w * narrow], [th * 0.9, th, th * (i === 3 ? 0.6 : 0.9)], 0.7)], {
      mirror: true,
      groove: i === 3 ? 0.25 : 0.35,
      fibre: 0.7,
      tendon: [0, 0],
    });
  });
  // External obliques and the flank roll above the iliac crest.
  bumps(
    torso,
    "obliques",
    M.obliques,
    [
      TB([[82, 132], [62, 120], [46, 110]], [3.6, 4.0, 3.2], [1.0, 1.4, 1.2], 0.8),
      TB([[98, 127], [75, 115], [56, 106]], [3.8, 4.2, 3.2], [1.1, 1.6, 1.3], 0.8),
      TB([[112, 121], [90, 111], [72, 104.5]], [3.8, 4.0, 3.0], [1.1, 1.7, 1.4], 0.8),
      TB([[62, 106], [85, 107.4], [112, 108.4]], [2.4, 2.7, 2.2], [1.6, 2.1, 1.4], 1.1),
    ],
    { mirror: true, groove: 0.3, fibre: 0.85 },
  );
  // Serratus anterior digits.
  for (let i = 0; i < 4; i++) {
    const y = 139 - i * 3.5;
    bumps(torso, `serratus-${i}`, -1, [TB([[57 + i * 3, y - 2.2], [70 + i * 2, y], [86, y + 3.5]], [1.25, 1.35, 1.1], [0.7, 1.15, 0.6], 1.2)], { mirror: true, groove: 0.35, fibre: 0.8 });
  }
  // Latissimus dorsi: from the lower back sweeping up into the armpit.
  bumps(
    torso,
    "lats",
    M.lats,
    [
      TB([[162, 141.5], [128, 143.5], [98, 145.5]], [3.8, 4.2, 3.2], [0.5, 1.4, 2.4], 0.8),
      TB([[168, 133], [134, 136.5], [101, 142]], [4.2, 4.6, 3.4], [0.5, 1.6, 2.6], 0.8),
      TB([[171, 124], [140, 127.5], [104, 138]], [4.4, 4.8, 3.5], [0.5, 1.6, 2.5], 0.8),
      TB([[170, 115], [144, 119], [106, 133]], [4.4, 4.8, 3.4], [0.4, 1.3, 2.2], 0.8),
      TB([[152, 106.5], [130, 112], [106, 127]], [3.8, 4.2, 3.0], [0.4, 1.0, 1.8], 0.8),
    ],
    { mirror: true, groove: 0.3, chain: [T, ARM, 0.8, 1] },
  );
  // Erector spinae columns either side of the spine.
  bumps(torso, "erector", M["lower-back"], [TB([[170, 90], [167, 104], [167, 120], [169, 136], [172, 148]], [1.9, 2.6, 2.4, 1.8, 1.2], [0.8, 2.1, 1.9, 1.0, 0.4], 1.2)], {
    mirror: true,
    groove: 0.45,
    fibre: 0.9,
  });
  // Trapezius: upper (neck–shoulder slope), middle (upper back), lower.
  bumps(torso, "traps-upper", M.traps, [TB([[172, 168], [140, 164.5], [108, 161]], [2.8, 3.2, 2.2], [1.4, 2.3, 1.0]), TB([[160, 166.5], [118, 164], [92, 161.5]], [2.2, 2.8, 1.8], [1.2, 2.0, 0.8])], {
    mirror: true,
    groove: 0.2,
    chain: [T, ARM, 0.8, 1],
  });
  bumps(torso, "traps-mid", M["upper-back"], [TB([[176, 157.5], [150, 157.2], [124, 157.5]], [2.2, 2.6, 2.0], [0.9, 1.2, 0.7]), TB([[176, 152.5], [148, 153.2], [126, 154.8]], [2.3, 2.6, 1.8], [0.9, 1.2, 0.7])], {
    mirror: true,
    groove: 0.25,
  });
  bumps(torso, "traps-lower", M.traps, [TB([[176, 128], [168, 140], [150, 150.5]], [1.8, 2.4, 1.8], [0.5, 0.95, 0.6])], { mirror: true, groove: 0.3 });
  // Infraspinatus and teres major over the shoulder blade.
  bumps(torso, "infraspinatus", M["upper-back"], [TB([[154, 145.5], [135, 147.2], [112, 150.5]], [2.8, 3.0, 2.0], [0.9, 1.5, 0.9])], { mirror: true, groove: 0.3, chain: [T, ARM, 0.85, 1] });
  bumps(torso, "teres", M["upper-back"], [TB([[146, 139.2], [124, 141], [102, 144]], [1.4, 1.7, 1.3], [0.9, 1.7, 1.2])], { mirror: true, groove: 0.35, chain: [T, ARM, 0.8, 1] });
  // Glutes on the pelvis.
  bumps(
    torso,
    "glute-max",
    M.glutes,
    [
      TB([[176, 100.5], [150, 95.5], [118, 90]], [4.6, 5.2, 4.0], [2.2, 4.6, 2.4], 1.1),
      TB([[176, 90.5], [150, 86.5], [124, 83]], [4.2, 4.8, 3.6], [2.4, 4.8, 2.2], 1.1),
    ],
    { mirror: true, groove: 0.2, chain: [T, LEG, 0.45, 1] },
  );
  bumps(torso, "glute-med", M.glutes, [TB([[132, 104], [108, 101.5], [92, 96]], [3.0, 3.2, 2.2], [1.4, 2.0, 1.2])], { mirror: true, groove: 0.25, chain: [T, LEG, 0.5, 1] });
  bumps(torso, "tfl", M.glutes, [TB([[66, 99], [74, 93], [82, 86]], [1.8, 2.0, 1.6], [1.0, 1.4, 0.8])], { mirror: true, groove: 0.3, chain: [T, LEG, 0.5, 1] });

  A.midline(() => {
    const sections: LoftSection[] = [];
    for (let y = TORSO_TOP; y >= TORSO_BOTTOM - 0.01; y -= 6) {
      const [f, b, s, n] = torsoRow(y);
      sections.push({ f, b, s, m: s, n });
    }
    A.loft({ a: [0, TORSO_TOP, 0], b: [0, TORSO_BOTTOM, 0], front: X, sections, bumps: torso }, base({ k: 2 }));
    // Navel.
    A.ellipsoid({ center: torsoAt(0, 109.6, 1.6), axes: ID, radii: [1.0, 0.95, 0.8] }, base({ op: OP_SUB, k: 0.5 }));
    // Vertebra prominens at the neck base.
    A.ellipsoid({ center: [-7.3, 163.8, 0], axes: ID, radii: [1.3, 1.1, 1.2] }, base({ k: 1.2 }));
  });
  // Clavicle: a bony ridge from the sternal notch to the acromion.
  A.spindle({ pts: curve(torsoAt(8, 155, 0.4), [6.4, 156.4, 9.8], [1.4, 160.6, 17.4], 5), radius: belly(0.95, 1.05, 1.15, 0.5, 1) }, base({ k: 1.3, meta: { chainA: T, chainB: ARM, chainT0: 0.65, chainT1: 1 } }));
  // Acromion + humeral head under the deltoid.
  A.ellipsoid({ center: add(S, [0.2, 0.8, -0.4]), axes: ID, radii: [3.6, 3.6, 3.5] }, base({ k: 2.2, chain: ARM }));
  // Iliac crest / hip bone front.
  A.ellipsoid({ center: torsoAt(58, 101.5, -0.3), axes: axes([1, 0.1, 0.4], Y), radii: [2.4, 1.6, 1.8] }, base({ k: 2 }));

  // ───────────────────────────── NECK ─────────────────────────────
  A.midline(() => {
    A.loft(
      {
        a: [-0.4, 157, 0],
        b: HL(0.4, -7.5, 0),
        front: X,
        sections: [
          { f: 6.4, b: 7.6, s: 7.4, m: 7.4, n: 2 },
          { f: 5.8, b: 6.6, s: 6.5, m: 6.5, n: 2 },
          { f: 5.5, b: 6.2, s: 6.0, m: 6.0, n: 2 },
          { f: 5.4, b: 6.1, s: 5.8, m: 5.8, n: 2 },
        ],
      },
      base({ k: 2.5 }),
    );
    // Larynx (Adam's apple).
    A.ellipsoid({ center: [5.0, 167, 0], axes: axes([1, -0.35, 0], Y), radii: [1.15, 1.6, 1.25] }, base({ k: 1.2 }));
  });
  // Sternocleidomastoid: sternal and clavicular heads to the mastoid.
  const mastoid = HL(-1.4, -4.8, 5.3);
  muscle(
    "scm",
    -1,
    [
      { pts: curve(torsoAt(6, 155.2, 0.4), [4.4, 164.5, 3.8], mastoid, 5), r: belly(0.75, 1.3, 1.0, 0.45), flat: 0.72, flatDir: [1, 0, 0.7] },
      { pts: curve(torsoAt(22, 156, 0.4), [3.0, 163.5, 5.0], add(mastoid, [-0.3, 0.3, 0.2]), 5), r: belly(0.7, 1.05, 0.85, 0.4), flat: 0.65, flatDir: [1, 0, 0.9] },
    ],
    { k: 0.9, groove: 0.2, fibre: 0.5 },
  );

  // ───────────────────────────── HEAD ─────────────────────────────
  A.midline(() => {
    const H = (o: PrimOpts = {}) => base({ k: 1, ...o });
    // Skull + face profile as a loft (head-local y from the forehead down to the chin).
    const rows: [number, number, number, number, number, number][] = [
      // y, front, back, side, exponent, centre offset forward
      [9.5, 7.0, 8.4, 7.2, 2.1, 0],
      [6.5, 8.8, 9.5, 7.6, 2.2, 0],
      [3.5, 9.4, 9.8, 7.75, 2.3, 0],
      [0.5, 8.7, 9.7, 7.6, 2.5, 0],
      [-2.5, 8.5, 8.8, 7.25, 2.6, 0],
      [-5.0, 8.9, 5.4, 6.45, 2.6, 0],
      [-7.5, 8.8, 3.0, 5.95, 2.5, 0],
      [-10.0, 6.0, 2.2, 4.4, 2.3, 2.6],
      [-11.6, 3.2, 2.2, 2.4, 2.2, 5.2],
    ];
    const secs: LoftSection[] = [];
    const top = rows[0][0];
    const bot = rows[rows.length - 1][0];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const y = top + ((bot - top) * i) / (n - 1);
      let k = 0;
      while (k < rows.length - 2 && rows[k + 1][0] > y) k++;
      const a = rows[k];
      const b = rows[k + 1];
      const t = Math.min(1, Math.max(0, (y - a[0]) / (b[0] - a[0])));
      const l = (j: number) => a[j] + (b[j] - a[j]) * t;
      secs.push({ f: l(1), b: l(2), s: l(3), m: l(3), n: l(4), of: l(5) });
    }
    A.loft({ a: HL(0, top, 0), b: HL(0, bot, 0), front: X, sections: secs }, H({ k: 1.2 }));
    // Cranium dome and occiput.
    A.ellipsoid({ center: HL(-0.9, 2.6, 0), axes: ID, radii: [9.7, 9.3, 7.6] }, H({ k: 1.6 }));
    // Chin.
    A.ellipsoid({ center: HL(7.4, -9.9, 0), axes: axes([1, -0.3, 0], Y), radii: [1.9, 1.9, 2.4] }, H({ k: 1.2 }));
    // Nose: bridge, tip.
    A.cone(HL(8.8, 0.9, 0), HL(10.7, -3.4, 0), 0.62, 0.78, H({ k: 0.8 }));
    A.ellipsoid({ center: HL(10.55, -3.9, 0), axes: ID, radii: [1.05, 0.9, 0.95] }, H({ k: 0.55 }));
    // Mouth line.
    A.ellipsoid({ center: HL(9.45, -6.62, 0), axes: ID, radii: [0.6, 0.12, 2.0] }, H({ op: OP_SUB, k: 0.3 }));
  });
  // Brow ridge.
  A.spindle({ pts: curve(HL(9.4, 1.7, 0.5), HL(9.35, 2.0, 3.4), HL(7.9, 1.8, 6.0), 4), radius: belly(0.65, 0.8, 0.6, 0.45, 1.2), flat: 0.6, flatDir: [0.4, 1, 0] }, base({ k: 1.5 }));
  // Eye socket, eyeball, lids.
  A.ellipsoid({ center: HL(8.6, 0.0, 3.25), axes: axes([1, 0, 0.3], Y), radii: [1.9, 1.3, 1.7] }, base({ op: OP_SUB, k: 0.9 }));
  A.ellipsoid({ center: HL(7.25, -0.05, 3.25), axes: ID, radii: [1.2, 1.2, 1.2] }, { layer: L_OVERLAY, k: 0.15, meta: { chainA: T, material: MAT_EYE } });
  A.spindle({ pts: curve(HL(7.95, 0.35, 2.1), HL(8.65, 0.9, 3.25), HL(7.95, 0.35, 4.35), 4), radius: belly(0.2, 0.4, 0.2, 0.5, 1.4), flat: 0.55, flatDir: [0.6, 1, 0] }, { layer: L_OVERLAY, k: 0.25, meta: { chainA: T } });
  A.spindle({ pts: curve(HL(7.95, -0.5, 2.2), HL(8.4, -0.9, 3.25), HL(7.9, -0.45, 4.3), 4), radius: belly(0.16, 0.28, 0.16, 0.5, 1.4), flat: 0.7, flatDir: [0.5, -1, 0] }, { layer: L_OVERLAY, k: 0.25, meta: { chainA: T } });
  // Cheekbone, cheek.
  A.ellipsoid({ center: HL(6.3, -1.8, 5.2), axes: axes([0.8, 0, 0.6], Y), radii: [2.2, 1.25, 1.6] }, base({ k: 1.4 }));
  A.ellipsoid({ center: HL(6.2, -4.6, 4.2), axes: ID, radii: [1.9, 2.0, 1.8] }, base({ k: 2 }));
  // Jaw line (mandible) and masseter.
  A.spindle({ pts: curve(HL(7.4, -10.0, 1.9), HL(3.8, -9.7, 5.2), HL(0.4, -7.4, 5.8), 5), radius: belly(1.0, 1.25, 1.1, 0.5, 1.2), flat: 0.75, flatDir: [0, 1, 0.4] }, base({ k: 1.4 }));
  A.ellipsoid({ center: HL(2.5, -5.3, 5.4), axes: axes([0.3, 1, 0], Z), radii: [2.5, 1.7, 1.1] }, base({ k: 1.5 }));
  // Nose wings and nostrils.
  A.ellipsoid({ center: HL(9.7, -4.3, 1.2), axes: axes([1, 0, 0.45], Y), radii: [0.9, 0.7, 0.6] }, base({ k: 0.5 }));
  A.ellipsoid({ center: HL(10.25, -4.85, 0.7), axes: ID, radii: [0.4, 0.2, 0.32] }, base({ op: OP_SUB, k: 0.2 }));
  // Lips.
  A.spindle({ pts: curve(HL(8.9, -6.3, 0), HL(9.55, -6.2, 1.1), HL(8.65, -6.55, 2.1), 4), radius: belly(0.36, 0.5, 0.18, 0.25, 1.3), flat: 0.8, flatDir: [0, 1, 0] }, { layer: L_OVERLAY, k: 0.35, meta: { chainA: T, material: MAT_LIP } });
  A.spindle({ pts: curve(HL(8.75, -7.1, 0), HL(9.3, -7.05, 1.0), HL(8.55, -6.75, 1.9), 4), radius: belly(0.5, 0.56, 0.18, 0.2, 1.3), flat: 0.8, flatDir: [0, 1, 0] }, { layer: L_OVERLAY, k: 0.35, meta: { chainA: T, material: MAT_LIP } });
  // Ear: plate, rim, concha, lobe.
  {
    const ex = axes([0.2, 0.2, 1], [-0.2, 1, 0]);
    const c = HL(-1.2, -0.6, 7.0);
    A.ellipsoid({ center: add(c, scale(ex[0], 0.3)), axes: ex, radii: [0.45, 2.9, 1.7] }, base({ k: 0.6 }));
    A.spindle(
      { pts: curve(add(c, add(scale(ex[1], 2.0), scale(ex[2], 1.4))), add(c, add(scale(ex[1], 3.5), scale(ex[2], -0.8))), add(c, add(scale(ex[1], -1.5), scale(ex[2], -1.55))), 5), radius: () => 0.34, flat: 0.8, flatDir: ex[0] },
      { layer: L_OVERLAY, k: 0.3, meta: { chainA: T } },
    );
    A.ellipsoid({ center: add(c, add(scale(ex[0], 0.85), scale(ex[1], -0.35))), axes: ex, radii: [0.5, 1.15, 0.8] }, { layer: L_OVERLAY, op: OP_SUB, k: 0.3, meta: { chainA: T } });
    A.ellipsoid({ center: add(c, add(scale(ex[0], 0.25), scale(ex[1], -2.7))), axes: ex, radii: [0.45, 0.85, 0.8] }, { layer: L_OVERLAY, k: 0.4, meta: { chainA: T } });
  }

  // ───────────────────────────── SHOULDER (deltoid cap) ─────────────────────────────
  {
    const tub = U(ua, 0.4, 13.5, 3.0);
    const cap = (o: V3, bulge: V3, r: number) => ({ pts: curve(o, add(S, scale(sub(bulge, S), 1.15)), U(ua, 0, 7, 0), 5), r: belly(1.3, r * 1.25, 2.4, 0.45, 1.6), flat: 0.62, flatDir: norm(sub(bulge, S)) });
    muscle("delt-front", M["front-delts"], [cap([4.0, 159.6, 13.4], add(S, [5.4, 2.0, -0.8]), 2.3), cap([2.8, 160.8, 15.8], add(S, [4.6, 3.6, 1.4]), 2.1)], { k: 1.0, groove: 0.3, chain: [ARM, ARM, 0, 1], fibreTo: tub });
    muscle("delt-side", M["side-delts"], [cap([1.2, 162.2, 18.2], add(S, [2.0, 4.6, 3.6]), 2.3), cap([-1.2, 162.2, 18.4], add(S, [-1.2, 4.4, 4.2]), 2.3)], { k: 0.9, groove: 0.3, chain: [ARM, ARM, 0, 1], fibreTo: tub });
    muscle("delt-rear", M["rear-delts"], [cap([-3.8, 160.6, 16.4], add(S, [-4.8, 2.8, 1.6]), 2.1), cap([-5.8, 159.4, 13.6], add(S, [-5.6, 0.6, -0.4]), 1.9)], { k: 1.0, groove: 0.3, chain: [ARM, ARM, 0, 1], fibreTo: tub });
  }
  // Pec and lat tendons into the armpit (bridging the torso and the arm).
  muscle("pec", M.chest, [{ pts: [torsoAt(66, 142.5, 1.3), add(torsoAt(72, 145, 1.6), [1.4, 0, 1.4]), U(ua, 2.0, 6.5, 0.4)], r: belly(2.2, 2.3, 0.9, 0.3, 1.4), flat: 0.55, flatDir: [0.6, -0.8, 0.2] }], {
    k: 1.3,
    groove: 0.25,
    chain: [T, ARM, 0.2, 0.9],
    tendon: [0, 0.35],
  });
  muscle("lats", M.lats, [{ pts: [torsoAt(104, 138, 1.6), add(torsoAt(98, 143, 2), [-0.8, 0, 1.2]), U(ua, -1.2, 6.5, -1.2)], r: belly(2.2, 2.3, 0.9, 0.3, 1.4), flat: 0.6, flatDir: [-0.8, -0.3, 0.5] }], {
    k: 1.3,
    groove: 0.25,
    chain: [T, ARM, 0.2, 0.9],
    tendon: [0, 0.35],
  });

  // ───────────────────────────── ARM (one loft: shoulder → wrist) ─────────────────────────────
  {
    const arm: BumpSpec[] = [];
    const fore: BumpSpec[] = [];
    const o = { chain: [ARM, ARM, 0, 1] as [number, number, number, number], ws: 1.35, ts: 1.0 };
    bumps(arm, "delt-front", M["front-delts"], [{ pts: [[20, 1], [40, 7], [72, 13]], w: [2.8, 2.6, 1.2], th: [2.2, 1.8, 0.4] }], { ...o, groove: 0.3 });
    bumps(arm, "delt-side", M["side-delts"], [{ pts: [[88, 0], [90, 7], [90, 13.8]], w: [3.2, 3.0, 1.2], th: [2.3, 2.0, 0.4] }], { ...o, groove: 0.3 });
    bumps(arm, "delt-rear", M["rear-delts"], [{ pts: [[160, 1], [135, 7], [108, 13]], w: [2.8, 2.6, 1.2], th: [2.0, 1.7, 0.4] }], { ...o, groove: 0.3 });
    bumps(arm, "biceps", M.biceps, [{ pts: [[-8, 7], [-2, 14], [0, 21], [4, 29]], w: [1.8, 2.6, 2.6, 1.3], th: [0.6, 2.2, 2.5, 0.5], p: 1.2 }], { ...o, groove: 0.3, tendon: [0.05, 0.14] });
    bumps(arm, "brachialis", M.biceps, [{ pts: [[72, 13], [66, 21], [50, 28]], w: [1.6, 2.1, 1.4], th: [0.7, 1.5, 0.7] }], { ...o, groove: 0.35 });
    bumps(arm, "coracobrachialis", -1, [{ pts: [[-62, 1], [-55, 7], [-48, 13]], w: [1.3, 1.5, 1.0], th: [0.8, 1.2, 0.5] }], { ...o, groove: 0.3 });
    bumps(arm, "triceps-tendon", M.triceps, [{ pts: [[180, 20], [180, 25.5], [180, 30]], w: [2.0, 2.2, 1.6], th: [0.3, 0.5, 0.3], p: 0.8 }], { ...o, groove: 0.15, fibre: 0.2, tendon: [1, 1] });
    bumps(fore, "brachioradialis", M.forearms, [{ pts: [[62, -3], [48, 4], [40, 11], [22, 18], [6, 24.5]], w: [1.6, 2.2, 2.0, 1.2, 0.8], th: [1.0, 2.1, 1.6, 0.6, 0.25] }], { ...o, groove: 0.3, tendon: [0.03, 0.4] });
    bumps(fore, "ext-radial", M.forearms, [{ pts: [[98, 1], [100, 7], [108, 14], [110, 24.5]], w: [1.5, 1.7, 1.2, 0.7], th: [1.2, 1.5, 0.6, 0.2] }], { ...o, groove: 0.3, tendon: [0.03, 0.45] });
    bumps(fore, "ext-digitorum", M.forearms, [{ pts: [[140, 1.5], [140, 9], [124, 17], [100, 24.5]], w: [1.5, 1.7, 1.3, 0.8], th: [1.1, 1.4, 0.7, 0.25] }], { ...o, groove: 0.3, tendon: [0.03, 0.45] });
    bumps(fore, "ext-ulnar", M.forearms, [{ pts: [[168, 2], [172, 10], [165, 18], [150, 24.5]], w: [1.2, 1.4, 1.1, 0.7], th: [0.9, 1.1, 0.6, 0.2] }], { ...o, groove: 0.3, tendon: [0.03, 0.45] });
    bumps(fore, "flexors", M.forearms, [{ pts: [[-28, 0], [-32, 7], [-52, 15], [-80, 24.5]], w: [2.2, 2.5, 1.8, 1.1], th: [1.4, 1.9, 1.0, 0.3] }], { ...o, groove: 0.3, tendon: [0.03, 0.45] });
    bumps(fore, "flexor-ulnar", M.forearms, [{ pts: [[-100, 1], [-110, 9], [-130, 18], [-150, 24.5]], w: [1.4, 1.7, 1.3, 0.8], th: [1.0, 1.4, 0.8, 0.25] }], { ...o, groove: 0.3, tendon: [0.03, 0.45] });
    bumps(
      arm,
      "triceps",
      M.triceps,
      [
        { pts: [[-150, 2], [-160, 11], [-172, 20], [180, 25]], w: [2.0, 2.6, 2.3, 1.4], th: [1.3, 2.4, 1.8, 0.4] },
        { pts: [[118, 6], [132, 13], [152, 20], [172, 25]], w: [1.9, 2.4, 2.1, 1.2], th: [1.4, 2.4, 1.6, 0.4] },
        { pts: [[-128, 18], [-140, 24], [-158, 28.5]], w: [1.3, 1.5, 1.1], th: [0.8, 1.2, 0.5] },
      ],
      { ...o, groove: 0.35, tendon: [0.05, 0.12] },
    );
    const elbow = F(fa).o;
    const ea = (elbow[0] - S[0]) * F(ua).y[0] + (elbow[1] - S[1]) * F(ua).y[1] + (elbow[2] - S[2]) * F(ua).y[2];
    for (const b of fore) arm.push({ ...b, pts: b.pts.map(([a, t]) => [a, t + ea] as [number, number]) });
    const rows: [number, number, number, number, number][] = [
      // along from the shoulder joint: front, back, lateral, medial
      [-1.5, 5.2, 5.2, 5.6, 4.8],
      [3, 5.0, 5.1, 5.4, 4.6],
      [7.5, 4.6, 4.8, 5.0, 4.3],
      [12, 4.3, 4.6, 4.6, 4.1],
      [16.5, 4.2, 4.5, 4.4, 4.0],
      [21, 4.0, 4.3, 4.2, 3.9],
      [25.5, 3.6, 3.8, 4.0, 3.8],
      [30, 3.2, 3.4, 4.2, 4.1],
      [34.5, 3.5, 3.2, 3.9, 3.7],
      [39, 3.2, 2.9, 3.6, 3.4],
      [43.5, 2.7, 2.5, 3.1, 3.0],
      [48, 2.2, 2.1, 2.8, 2.7],
      [52.5, 1.85, 1.8, 2.6, 2.55],
      [57, 1.8, 1.75, 2.6, 2.5],
    ];
    A.loft(
      {
        a: U(ua, 0, rows[0][0], 0),
        b: U(ua, 0, rows[rows.length - 1][0], 0),
        front: F(ua).x,
        sections: rows.map(([, f, b, s, m]) => ({ f, b, s, m, n: 2 })),
        bumps: arm.map((b) => ({ ...b, pts: b.pts.map(([a, t]) => [a, t - rows[0][0]] as [number, number]) })),
      },
      base({ k: 1.6, chain: ARM }),
    );
  }
  // Elbow: epicondyles, olecranon; ulnar head at the wrist.
  A.ellipsoid({ center: U(ua, -0.5, 30.2, 3.3), axes: ID, radii: [1.0, 1.0, 1.0] }, base({ k: 1.2, chain: ARM }));
  A.ellipsoid({ center: U(ua, -0.3, 30.4, -3.6), axes: ID, radii: [1.2, 1.2, 1.2] }, base({ k: 1.2, chain: ARM }));
  A.ellipsoid({ center: U(fa, -2.6, 0.8, 0), axes: [F(fa).x, F(fa).y, F(fa).z], radii: [1.0, 1.5, 1.15] }, base({ k: 1.3, chain: ARM }));
  A.ellipsoid({ center: U(fa, -0.6, 24.6, -1.9), axes: [F(fa).x, F(fa).y, F(fa).z], radii: [0.85, 0.85, 0.85] }, base({ k: 0.8, chain: ARM }));

  // ───────────────────────────── HAND ─────────────────────────────
  {
    const hx = hf.x;
    const hy = hf.y;
    const hz = hf.z;
    const hAxes: [V3, V3, V3] = [hx, hy, hz];
    const HK = (o: PrimOpts = {}) => base({ k: 0.8, chain: ARM, ...o });
    A.ellipsoid({ center: HP(0.2, 1.4, 0.1), axes: hAxes, radii: [1.7, 2.2, 3.0] }, HK({ k: 1 }));
    A.loft(
      {
        a: HP(0.35, 1.5, -0.1),
        b: HP(0.15, 9.2, -0.1),
        front: hx,
        sections: [
          { f: 1.5, b: 1.35, s: 3.1, m: 3.0, n: 2.4, os: 0 },
          { f: 1.35, b: 1.1, s: 3.7, m: 3.6, n: 2.8, os: 0.1 },
          { f: 1.2, b: 1.0, s: 4.1, m: 3.9, n: 3.0, os: 0.15 },
          { f: 1.1, b: 0.95, s: 4.1, m: 4.0, n: 3.2, os: 0.1 },
        ],
      },
      HK({ k: 0.9 }),
    );
    A.ellipsoid({ center: HP(1.35, 3.9, 2.3), axes: axes(hx, add(hy, scale(hz, -0.5))), radii: [1.2, 2.6, 1.55] }, HK({ k: 0.7, meta: { chainA: chFinger(0, THUMB), chainB: ARM, chainT0: 0, chainT1: 1 } }));
    A.ellipsoid({ center: HP(1.2, 4.6, -3.1), axes: hAxes, radii: [1.0, 2.9, 1.1] }, HK({ k: 0.7 }));
    A.ellipsoid({ center: HP(-0.2, 5.2, 3.3), axes: axes(hx, add(hy, scale(hz, -0.6))), radii: [0.9, 2.2, 0.8] }, HK({ k: 0.6 }));
    FINGERS.forEach((spec, fi) => {
      const ch = chFinger(0, fi);
      if (fi !== THUMB) {
        const kb = F(armBone(0, A_FINGER + fi * 3));
        A.ellipsoid({ center: add(kb.o, scale(kb.x, -0.45)), axes: [kb.x, kb.y, kb.z], radii: [0.9, 1.0, spec.radii[0] * 0.95] }, base({ k: 0.45, chain: ch }));
        A.cone(add(kb.o, scale(kb.x, -0.55)), add(HP(-0.6, 2.2, 0), scale(hz, (fi - 2.3) * 0.9)), 0.55, 0.5, base({ k: 0.9, chain: ARM }));
      }
      for (let k = 0; k < 3; k++) {
        const b = F(armBone(0, A_FINGER + fi * 3 + k));
        const L = spec.lengths[k];
        const a = b.o;
        const tip = k === 2 ? L - spec.radii[3] * 0.9 : L;
        const e = add(a, scale(b.y, tip));
        A.cone(a, e, spec.radii[k] * (fi === THUMB && k === 0 ? 1.05 : 1), spec.radii[k + 1], base({ k: fi === THUMB && k === 0 ? 0.8 : 0.28, chain: ch }));
        const pad = add(add(a, scale(b.y, L * 0.52)), scale(b.x, spec.radii[k] * 0.32));
        A.ellipsoid({ center: pad, axes: [b.x, b.y, b.z], radii: [spec.radii[k] * 0.72, L * 0.36, spec.radii[k] * 0.82] }, base({ k: 0.3, chain: ch }));
        if (k > 0) A.ellipsoid({ center: add(a, scale(b.x, -spec.radii[k] * 0.2)), axes: [b.x, b.y, b.z], radii: [spec.radii[k] * 0.85, 0.55, spec.radii[k] * 1.08] }, base({ k: 0.3, chain: ch }));
        if (k === 2) {
          const nail = add(add(a, scale(b.y, L * 0.62)), scale(b.x, -spec.radii[2] * 0.66));
          A.ellipsoid({ center: nail, axes: [b.x, b.y, b.z], radii: [0.2, L * 0.34, spec.radii[2] * 0.68] }, { layer: L_OVERLAY, k: 0.12, meta: { chainA: ch, material: MAT_NAIL } });
        }
      }
    });
  }

  // ───────────────────────────── LEG (one loft: hip → ankle) ─────────────────────────────
  {
    const th: BumpSpec[] = [];
    const sh: BumpSpec[] = [];
    const o = { chain: [LEG, LEG, 0, 1] as [number, number, number, number], ws: 1.35, ts: 1.0 };
    bumps(th, "rectus-femoris", M.quads, [{ pts: [[8, -4], [2, 8], [0, 20], [0, 32], [0, 40]], w: [1.8, 2.5, 2.7, 2.3, 1.3], th: [0.8, 2.0, 2.5, 1.9, 0.5], p: 1.3 }], { ...o, groove: 0.35, chain: [T, LEG, 0.02, 0.2] });
    bumps(th, "vastus-lat", M.quads, [{ pts: [[62, 2], [70, 13], [68, 25], [52, 35], [30, 41]], w: [2.8, 3.6, 3.6, 2.8, 1.4], th: [1.0, 2.5, 2.7, 2.0, 0.6] }], { ...o, groove: 0.35 });
    bumps(th, "vastus-med", M.quads, [{ pts: [[-38, 18], [-48, 30], [-40, 37.5], [-22, 41.5]], w: [1.6, 2.9, 2.7, 1.4], th: [0.5, 2.6, 2.4, 0.6], p: 1.2 }], { ...o, groove: 0.4 });
    bumps(th, "sartorius", -1, [{ pts: [[45, -5], [18, 6], [-30, 19], [-72, 31], [-98, 43]], w: [1.3, 1.4, 1.4, 1.3, 1.1], th: [0.7, 0.9, 0.9, 0.7, 0.4] }], { ...o, groove: 0.4, chain: [T, LEG, 0.02, 0.2] });
    bumps(th, "adductors", M.adductors, [{ pts: [[-70, -2], [-88, 9], [-100, 22], [-105, 30]], w: [2.8, 3.4, 2.6, 1.6], th: [1.6, 2.3, 1.5, 0.6] }], { ...o, groove: 0.35, chain: [T, LEG, 0.02, 0.25] });
    bumps(th, "gracilis", M.adductors, [{ pts: [[-112, 0], [-116, 16], [-122, 32], [-128, 43]], w: [1.3, 1.4, 1.2, 0.9], th: [0.8, 1.0, 0.7, 0.3] }], { ...o, groove: 0.35, chain: [T, LEG, 0.02, 0.25] });
    bumps(th, "biceps-femoris", M.hamstrings, [{ pts: [[170, 3], [155, 16], [140, 29], [122, 41]], w: [2.2, 2.8, 2.4, 1.3], th: [1.2, 2.3, 1.9, 0.6] }], { ...o, groove: 0.4, chain: [T, LEG, 0.02, 0.2] });
    bumps(th, "semitendinosus", M.hamstrings, [{ pts: [[-172, 3], [-158, 16], [-146, 29], [-132, 41]], w: [2.2, 2.7, 2.3, 1.3], th: [1.2, 2.3, 1.8, 0.6] }], { ...o, groove: 0.4, chain: [T, LEG, 0.02, 0.2] });
    bumps(th, "itband", -1, [{ pts: [[98, 6], [100, 22], [96, 40]], w: [1.8, 2.0, 1.6], th: [0.35, 0.45, 0.35], p: 0.8 }], { ...o, groove: 0.2, fibre: 0.2, tendon: [1, 1] });
    bumps(th, "glute-max", M.glutes, [{ pts: [[150, -8], [125, 3], [105, 11]], w: [4.2, 3.4, 1.6], th: [3.4, 1.8, 0.4] }], { ...o, groove: 0.2, chain: [T, LEG, 0.1, 0.6] });
    bumps(sh, "tibialis", -1, [{ pts: [[48, 3], [44, 12], [36, 24], [14, 36], [-10, 42]], w: [1.6, 1.9, 1.5, 0.9, 0.6], th: [1.2, 1.7, 1.0, 0.35, 0.2] }], { ...o, groove: 0.35, tendon: [0.03, 0.4] });
    bumps(sh, "peroneus", -1, [{ pts: [[102, 3], [104, 14], [108, 27], [118, 39]], w: [1.3, 1.5, 1.1, 0.7], th: [0.8, 1.1, 0.6, 0.2] }], { ...o, groove: 0.35, tendon: [0.03, 0.45] });
    bumps(sh, "gastroc-med", M.calves, [{ pts: [[-150, -4], [-158, 6], [-168, 15], [-178, 21]], w: [2.4, 3.2, 2.8, 1.2], th: [1.4, 3.0, 2.2, 0.4], p: 1.3 }], { ...o, groove: 0.4 });
    bumps(sh, "gastroc-lat", M.calves, [{ pts: [[152, -4], [158, 5], [166, 13], [176, 18]], w: [2.2, 2.9, 2.4, 1.1], th: [1.3, 2.6, 1.8, 0.4], p: 1.3 }], { ...o, groove: 0.4 });
    bumps(sh, "achilles", -1, [{ pts: [[180, 20], [180, 32], [180, 43]], w: [1.6, 1.3, 1.3], th: [0.5, 0.7, 0.6], p: 0.9 }], { ...o, groove: 0.15, fibre: 0.2, tendon: [1, 1] });
    bumps(
      sh,
      "soleus",
      M.calves,
      [
        { pts: [[-118, 10], [-124, 20], [-140, 30], [-165, 37]], w: [1.5, 1.8, 1.4, 0.9], th: [0.7, 1.3, 0.9, 0.3] },
        { pts: [[118, 10], [124, 20], [140, 30], [165, 37]], w: [1.4, 1.6, 1.3, 0.8], th: [0.6, 1.1, 0.8, 0.3] },
      ],
      { ...o, groove: 0.35 },
    );
    const knee = F(shin).o;
    const hip = F(thigh).o;
    const ka = (knee[0] - hip[0]) * F(thigh).y[0] + (knee[1] - hip[1]) * F(thigh).y[1] + (knee[2] - hip[2]) * F(thigh).y[2];
    for (const b of sh) th.push({ ...b, pts: b.pts.map(([a, t]) => [a, t + ka] as [number, number]) });
    const rows: [number, number, number, number, number][] = [
      // along from the hip joint: front, back, lateral, medial
      [-6, 7.2, 8.4, 8.2, 6.8],
      [-0.7, 7.4, 8.2, 8.3, 7.0],
      [4.6, 7.4, 7.7, 8.0, 7.0],
      [9.9, 7.2, 7.2, 7.7, 6.8],
      [15.2, 6.9, 6.8, 7.3, 6.5],
      [20.5, 6.6, 6.5, 6.9, 6.2],
      [25.8, 6.1, 6.0, 6.4, 5.8],
      [31.1, 5.5, 5.4, 5.8, 5.4],
      [36.4, 4.8, 4.8, 5.1, 5.0],
      [41.7, 4.3, 4.4, 4.6, 4.8],
      [47, 4.2, 4.3, 4.6, 4.8],
      [52.3, 3.9, 4.4, 4.3, 4.5],
      [57.6, 3.7, 4.2, 4.0, 4.2],
      [62.9, 3.4, 3.8, 3.7, 3.8],
      [68.2, 3.0, 3.3, 3.3, 3.4],
      [73.5, 2.7, 2.9, 2.9, 3.0],
      [78.8, 2.4, 2.6, 2.6, 2.7],
      [84.1, 2.3, 2.4, 2.5, 2.6],
      [89.4, 2.3, 2.5, 2.6, 2.7],
    ];
    A.loft(
      {
        a: U(thigh, 0.3, rows[0][0], 0.3),
        b: U(thigh, 0, rows[rows.length - 1][0], 0),
        front: F(thigh).x,
        sections: rows.map(([, f, b, s, m]) => ({ f, b, s, m, n: 2 })),
        bumps: th.map((b) => ({ ...b, pts: b.pts.map(([a, t]) => [a, t - rows[0][0]] as [number, number]) })),
      },
      base({ k: 2.2, chain: LEG }),
    );
  }
  // Knee: patella, patellar tendon; tibia ridge, tibial tuberosity, fibular head, malleoli.
  A.ellipsoid({ center: U(thigh, 4.0, 43.4, 0.2), axes: [F(thigh).x, F(thigh).y, F(thigh).z], radii: [1.1, 2.2, 2.1] }, base({ k: 1.4, chain: LEG }));
  A.cone(U(thigh, 4.0, 45.2, 0.2), U(shin, 3.0, 4.2, 0), 0.95, 0.85, base({ k: 1.2, chain: LEG }));
  A.cone(U(shin, 2.6, 6, -0.9), U(shin, 1.9, 38, -1.3), 0.85, 0.7, base({ k: 1.3, chain: LEG }));
  A.ellipsoid({ center: U(shin, 2.9, 4.5, -0.2), axes: ID, radii: [1.0, 1.2, 1.1] }, base({ k: 1.2, chain: LEG }));
  A.ellipsoid({ center: U(shin, -0.8, 3, 3.8), axes: ID, radii: [0.9, 0.9, 0.9] }, base({ k: 1.2, chain: LEG }));
  A.ellipsoid({ center: U(shin, 0.3, 41.8, -2.6), axes: ID, radii: [1.1, 1.3, 0.9] }, base({ k: 0.9, chain: LEG }));
  A.ellipsoid({ center: U(shin, -0.4, 43.2, 2.5), axes: ID, radii: [1.0, 1.3, 0.9] }, base({ k: 0.9, chain: LEG }));

  // ───────────────────────────── FOOT ─────────────────────────────
  {
    const fAxes: [V3, V3, V3] = [ff.x, ff.y, ff.z];
    const FK = (o: PrimOpts = {}) => base({ k: 1, chain: FOOT, ...o });
    A.ellipsoid({ center: FP(-2.8, -2.6, 0.1), axes: fAxes, radii: [3.3, 2.7, 2.6] }, FK());
    A.loft(
      {
        a: FP(-1.5, -1.8, 0),
        b: FP(13.8, -3.3, -0.4),
        front: ff.y,
        sections: [
          { f: 2.6, b: 2.6, s: 2.9, m: 2.6, n: 2.2 },
          { f: 2.3, b: 2.0, s: 3.2, m: 3.2, n: 2.4 },
          { f: 1.8, b: 1.8, s: 3.9, m: 3.8, n: 2.6 },
          { f: 1.3, b: 1.7, s: 4.5, m: 4.5, n: 2.8 },
          { f: 1.0, b: 1.4, s: 4.7, m: 4.8, n: 3.0 },
        ],
      },
      FK({ k: 1.2 }),
    );
    const toes: [number, number, number, number, number][] = [
      [-3.3, 13.6, 5.4, 1.35, 0.5],
      [-1.2, 14.3, 4.3, 0.95, 0.7],
      [0.6, 14.0, 3.9, 0.9, 0.7],
      [2.2, 13.4, 3.5, 0.85, 0.7],
      [3.6, 12.6, 3.0, 0.8, 0.7],
    ];
    for (const [lat, fw, L, r, droop] of toes) {
      const a = FP(fw - 1.2, -3.3, lat);
      const m = FP(fw + L * 0.55, -3.2 - droop * 0.2, lat * 1.02);
      const e = FP(fw + L, -3.5 - droop * 0.5, lat * 1.04);
      A.cone(a, m, r * 1.05, r * 0.95, base({ k: 0.35, chain: FOOT }));
      A.cone(m, e, r * 0.95, r * 0.82, base({ k: 0.3, chain: FOOT }));
      const nail = add(e, add(scale(ff.y, r * 0.62), scale(ff.x, -r * 0.45)));
      A.ellipsoid({ center: nail, axes: fAxes, radii: [r * 0.55, 0.18, r * 0.6] }, { layer: L_OVERLAY, k: 0.12, meta: { chainA: FOOT, material: MAT_NAIL } });
    }
  }

  // ───────────────────────────── SHORTS ─────────────────────────────
  A.midline(() => {
    A.ellipsoid({ center: [0.6, 86.5, 0], axes: ID, radii: [5.5, 4.5, 4.2] }, { layer: L_SHORTS_FILL, k: 2, meta: { chainA: T } });
    A.ellipsoid({ center: [-10.5, 94, 0], axes: ID, radii: [3, 8, 3.5] }, { layer: L_SHORTS_FILL, k: 2, meta: { chainA: T } });
  });

  const sculpt = new Sculpt();
  A.emit(sculpt);

  // Hair: the scalp offset inside a cap-shaped region.
  sculpt.hairThickness = 0.5;
  const hc = HL(-1.6, 2.6, 0);
  sculpt.hairRegion = (x, y, z) => {
    const dx = (x - hc[0]) / 11.3;
    const dy = (y - hc[1]) / 10.2;
    const dz = z / 8.95;
    return (Math.sqrt(dx * dx + dy * dy + dz * dz) - 1) * 9.5;
  };
  sculpt.hairBox = { min: [head.o[0] - 14, head.o[1] - 6, -12], max: [head.o[0] + 12, head.o[1] + 14, 12] };

  // Shorts: between the waistband and the leg openings.
  sculpt.shortsThickness = 0.5;
  const hipJ = F(thigh).o;
  const legDir = F(thigh).y;
  sculpt.shortsRegion = (x, y, z) => {
    const waist = y - (104.5 - 1.2 * (x > 0 ? x / 10 : 0) + Math.abs(z) * 0.06);
    const zz = Math.abs(z);
    const a = (x - hipJ[0]) * legDir[0] + (y - hipJ[1]) * legDir[1] + (zz - hipJ[2]) * legDir[2];
    const hem = a - (15.5 - Math.max(0, zz - hipJ[2]) * 0.18);
    return Math.max(waist, hem);
  };
  sculpt.shortsBox = { min: [-22, 76, -26], max: [22, 112, 26] };
  return sculpt;
}
