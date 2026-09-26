/**
 * Offline builder of the sculpted body asset (see scripts/build-body-asset.mjs).
 *
 * Source: the MakeHuman base mesh, morph targets, skeleton and skin weights,
 * released under CC0 1.0 (https://github.com/makehumancommunity/makehuman,
 * LICENSE.ASSETS.md). Steps:
 *   1. download + parse base.obj, apply the morph targets (athletic young male);
 *   2. convert to bind space (cm; x forward, y up, z = side 0 = the figure's right);
 *   3. fit it onto the rig's bind skeleton: every MakeHuman bone gets an affine
 *      map from its rest segment onto the matching segment of our skeleton, and
 *      the mesh is deformed with MakeHuman's own weights (linear blend);
 *   4. map the weights onto our bones (top 4);
 *   5. transfer the muscle map, fibres, ink field, AO and seams from the
 *      procedural anatomy (nearest point in the bind pose), bake the hair and
 *      shorts fields, give the scalp and shorts a little volume;
 *   6. write a quantised, gzipped, base64 module: src/lib/three/body/asset/mh-body.ts
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { buildBodyData } from "../../src/lib/three/body/build";
import { sculptBody } from "../../src/lib/three/body/anatomy";
import {
  A_CLAVICLE,
  A_FINGER,
  A_FORE,
  A_HAND,
  A_TWIST,
  A_UA_ROOT,
  A_UPPER,
  BONE_COUNT,
  B_CHEST,
  B_HEAD,
  B_NECK,
  B_PELVIS,
  B_SPINE,
  L_FOOT,
  L_SHIN,
  L_THIGH,
  L_THIGH_ROOT,
  L_TOES,
  armBone,
  bindFrames,
  legBone,
} from "../../src/lib/three/body/skeleton";
import { FINGERS } from "../../src/lib/three/body/hand";
import { MAT_HAIR, MAT_SHORTS, MAT_SKIN } from "../../src/lib/three/body/sdf";
import { MUSCLE_INDEX_GLUTES } from "../../src/lib/three/body/muscle-index";
import { encodeAsset, type AssetData } from "../../src/lib/three/body/asset/format";

type V3 = [number, number, number];

const ROOT = process.cwd();
const BASE = "https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/";
const CACHE = join(tmpdir(), "ironform-body-asset", "makehuman");
mkdirSync(CACHE, { recursive: true });

/** Morph targets and weights: a lean, muscular young man. */
const TARGETS: [string, number][] = [
  ["macrodetails/caucasian-male-young", 1],
  ["macrodetails/universal-male-young-maxmuscle-minweight", 0.6],
  ["macrodetails/universal-male-young-maxmuscle-averageweight", 0.4],
  ["macrodetails/proportions/male-young-maxmuscle-averageweight-idealproportions", 0.8],
  ["torso/torso-vshape-incr", 0.45],
  ["torso/torso-muscle-dorsi-incr", 0.35],
  ["torso/torso-muscle-pectoral-incr", 0.4],
  ["stomach/stomach-tone-incr", 1],
  ...["r", "l"].flatMap((s): [string, number][] => [
    [`armslegs/${s}-upperarm-muscle-incr`, 1],
    [`armslegs/${s}-upperarm-shoulder-muscle-incr`, 1],
    [`armslegs/${s}-lowerarm-muscle-incr`, 0.8],
    [`armslegs/${s}-upperleg-muscle-incr`, 0.9],
    [`armslegs/${s}-lowerleg-muscle-incr`, 0.8],
  ]),
];

function fetchText(path: string): string {
  const file = join(CACHE, path.replace(/\//g, "__"));
  if (!existsSync(file)) {
    console.log("download", path);
    execFileSync("curl", ["-sSfL", "-o", file, BASE + path]);
  }
  return readFileSync(file, "utf8");
}

// ---------------------------------------------------------------------------
// 1. Base mesh + targets
const obj = fetchText("3dobjs/base.obj");
const mhV: V3[] = [];
const groups = new Map<string, Set<number>>();
const bodyQuads: number[] = [];
{
  let g = "";
  for (const line of obj.split("\n")) {
    if (line.startsWith("v ")) {
      const p = line.split(/\s+/);
      mhV.push([+p[1], +p[2], +p[3]]);
    } else if (line.startsWith("g ")) g = line.slice(2).trim();
    else if (line.startsWith("f ")) {
      const idx = line.trim().split(/\s+/).slice(1).map((t) => parseInt(t, 10) - 1);
      let set = groups.get(g);
      if (!set) groups.set(g, (set = new Set()));
      idx.forEach((i) => set!.add(i));
      if (g === "body") {
        if (idx.length !== 4) throw new Error("non-quad body face");
        bodyQuads.push(...idx);
      }
    }
  }
}
for (const [t, w] of TARGETS) {
  for (const line of fetchText(`targets/${t}.target`).split("\n")) {
    if (!line || line[0] === "#") continue;
    const p = line.trim().split(/\s+/);
    if (p.length < 4) continue;
    const v = mhV[+p[0]];
    v[0] += w * +p[1];
    v[1] += w * +p[2];
    v[2] += w * +p[3];
  }
}
const bodyVerts = [...groups.get("body")!].sort((a, b) => a - b);
const NV = bodyVerts.length;
if (bodyVerts[NV - 1] !== NV - 1) throw new Error("body vertices are not a prefix of the vertex list");

// 2. Bind-space conversion: dm → cm; our x = MH z (forward), y = MH y, z = −MH x (the figure's right).
const conv = (v: V3): V3 => [v[2] * 10, v[1] * 10, -v[0] * 10];
const P0: V3[] = mhV.map(conv);

// ---------------------------------------------------------------------------
// Skeleton (MakeHuman) and our bind skeleton.
interface MhBone {
  head: string;
  tail: string;
  parent: string | null;
}
const skel = JSON.parse(fetchText("rigs/default.mhskel")) as { bones: Record<string, MhBone>; joints: Record<string, number[]> };
const jointPos = (name: string): V3 => {
  const vs = skel.joints[name];
  const s: V3 = [0, 0, 0];
  for (const i of vs) for (let c = 0; c < 3; c++) s[c] += P0[i][c];
  return s.map((x) => x / vs.length) as V3;
};
const bHead = (b: string) => jointPos(skel.bones[b].head);
const bTail = (b: string) => jointPos(skel.bones[b].tail);

const frames = bindFrames();
const fo = (b: number) => frames[b].o as V3;

// Vector helpers.
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3) => Math.sqrt(dot(a, a));
const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
const mid = (a: V3, b: V3): V3 => mul(add(a, b), 0.5);
const perpTo = (v: V3, axis: V3): V3 => norm(sub(v, mul(axis, dot(v, axis))));

/** Affine map: p → o + R·(k·axial + q·radial) of (p − a), stored as a 3×4 matrix. */
type Affine = number[];
function segmentMap(a: V3, b: V3, A: V3, B: V3, q: number, refMh?: V3, refOur?: V3): Affine {
  const d = norm(sub(b, a));
  const D = norm(sub(B, A));
  const k = len(sub(B, A)) / len(sub(b, a));
  // Orthonormal frames (d, e, f) → (D, E, F).
  let e: V3;
  let E: V3;
  if (refMh && refOur) {
    e = perpTo(refMh, d);
    E = perpTo(refOur, D);
  } else {
    // Minimal rotation: rotate e = any ⊥ d by the rotation taking d to D.
    const axis = cross(d, D);
    const s = len(axis);
    const c = dot(d, D);
    e = perpTo(Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], d);
    if (s < 1e-9) E = c > 0 ? e : mul(e, -1);
    else {
      const u = mul(axis, 1 / s);
      const ang = Math.atan2(s, c);
      // Rodrigues.
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      E = add(add(mul(e, ca), mul(cross(u, e), sa)), mul(u, dot(u, e) * (1 - ca)));
    }
  }
  const f = cross(d, e);
  const F = cross(D, E);
  // M = [D E F] · diag(k, q, q) · [d e f]^T
  const M = new Array(9).fill(0);
  const cols: [V3, V3, number][] = [
    [d, D, k],
    [e, E, q],
    [f, F, q],
  ];
  for (const [src, dst, s] of cols)
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) M[r * 3 + c] += dst[r] * s * src[c];
  const t = sub(A, [M[0] * a[0] + M[1] * a[1] + M[2] * a[2], M[3] * a[0] + M[4] * a[1] + M[5] * a[2], M[6] * a[0] + M[7] * a[1] + M[8] * a[2]]);
  return [M[0], M[1], M[2], t[0], M[3], M[4], M[5], t[1], M[6], M[7], M[8], t[2]];
}
const apply = (m: Affine, p: V3): V3 => [
  m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3],
  m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7],
  m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11],
];

// ---------------------------------------------------------------------------
// 3. Fit: one affine map per MakeHuman bone.
const SIDES: [".R", ".L"] = [".R", ".L"];
const mhHipC = mid(bHead("upperleg01.R"), bHead("upperleg01.L"));
const mhNeck = bHead("neck01");
const ourHipC = mid(fo(legBone(0, L_THIGH)), fo(legBone(1, L_THIGH)));
const ourNeck = fo(B_NECK);
const torsoScale = len(sub(ourNeck, ourHipC)) / len(sub(mhNeck, mhHipC));
/** Overall size ratio (our bind figure vs MakeHuman), used for limb thickness. */
const SIZE = 1.1;
// The MakeHuman neck base sits a few cm above our rig's neck joint, so the shoulders
// land close to the rig's shoulder joints without being pulled up (no shrug).
const NECK_LIFT = 7;
const TORSO = segmentMap(mhHipC, mhNeck, ourHipC, add(ourNeck, [0, NECK_LIFT, 0]), 0.96, [1, 0, 0], [1, 0, 0]);
const maps = new Map<string, Affine>();
for (const b of Object.keys(skel.bones)) maps.set(b, TORSO);
// Head: scaled about the eyes and moved so the eyes sit where the rig's head expects them.
const HEAD_SCALE = 1.1;
const mhEyeMid = mid(jointPos(skel.bones["eye.R"].head), jointPos(skel.bones["eye.L"].head));
const sculptEyes = sculptBody(frames).eyes as V3[];
const targetEyeMid = mid(sculptEyes[0], sculptEyes[1]);
const HEAD = segmentMap(mhEyeMid, add(mhEyeMid, [0, 10, 0]), targetEyeMid, add(targetEyeMid, [0, 10 * HEAD_SCALE, 0]), HEAD_SCALE, [1, 0, 0], [1, 0, 0]);
const blendMap = (a: Affine, b: Affine, t: number): Affine => a.map((x, i) => x + (b[i] - x) * t);
for (const b of Object.keys(skel.bones)) if (ourBone(b) === B_HEAD) maps.set(b, HEAD);
maps.set("neck01", blendMap(TORSO, HEAD, 0.15));
maps.set("neck02", blendMap(TORSO, HEAD, 0.5));
maps.set("neck03", blendMap(TORSO, HEAD, 0.85));

/** Hand frame helpers: palm normal from the knuckle line (points out of the palm). */
const mhPalm = (s: string) => {
  const w = bHead(`wrist${s}`);
  const ix = bHead(`finger2-1${s}`);
  const pk = bHead(`finger5-1${s}`);
  const n = norm(cross(sub(ix, w), sub(pk, w)));
  return s === ".R" ? n : mul(n, -1);
};
for (let i = 0; i < 2; i++) {
  const s = SIDES[i];
  const q = SIZE;
  const shoulder = fo(armBone(i, A_UPPER));
  const elbow = fo(armBone(i, A_FORE));
  const wrist = fo(armBone(i, A_HAND));
  const handX = frames[armBone(i, A_HAND)].x as V3;
  const palmMh = mhPalm(s);
  // Shoulder girdle: from the (torso-mapped) sternal end out to our shoulder joint.
  const clav = bHead(`clavicle${s}`);
  // Keep the shoulder mass a little below the rig joint (relaxed, not shrugged).
  const girdle = segmentMap(clav, bHead(`upperarm01${s}`), apply(TORSO, clav), add(shoulder, [0, -1.5, 0]), q);
  if (i === 0) console.log("shoulder: torso-mapped", apply(TORSO, bHead(`upperarm01${s}`)).map((x) => x.toFixed(1)).join(","), "rig", shoulder.map((x) => x.toFixed(1)).join(","));
  maps.set(`clavicle${s}`, girdle);
  maps.set(`shoulder01${s}`, girdle);
  const upper = segmentMap(bHead(`upperarm01${s}`), bHead(`lowerarm01${s}`), shoulder, elbow, q);
  maps.set(`upperarm01${s}`, upper);
  maps.set(`upperarm02${s}`, upper);
  const fore = segmentMap(bHead(`lowerarm01${s}`), bHead(`wrist${s}`), elbow, wrist, q, palmMh, handX);
  maps.set(`lowerarm01${s}`, fore);
  maps.set(`lowerarm02${s}`, fore);
  // Hand: wrist → middle knuckle, rolled so the palms match.
  const f2 = 2; // our middle finger
  const ourMidBase = fo(armBone(i, A_FINGER + f2 * 3));
  const hand = segmentMap(bHead(`wrist${s}`), bHead(`finger3-1${s}`), wrist, ourMidBase, q * 1.0, palmMh, handX);
  maps.set(`wrist${s}`, hand);
  for (let m = 1; m <= 4; m++) maps.set(`metacarpal${m}${s}`, hand);
  // Fingers: each MakeHuman phalanx onto our finger bone.
  for (let f = 0; f < 5; f++) {
    for (let k = 0; k < 3; k++) {
      const name = `finger${f + 1}-${k + 1}${s}`;
      const bone = armBone(i, A_FINGER + f * 3 + k);
      const o = fo(bone);
      const y = frames[bone].y as V3;
      const A = o;
      const B = add(o, mul(y, FINGERS[f].lengths[k]));
      maps.set(name, segmentMap(bHead(name), bTail(name), A, B, q * 1.0, palmMh, handX));
    }
  }
  // Legs.
  const hip = fo(legBone(i, L_THIGH));
  const knee = fo(legBone(i, L_SHIN));
  const ankle = fo(legBone(i, L_FOOT));
  const ball = fo(legBone(i, L_TOES));
  const thigh = segmentMap(bHead(`upperleg01${s}`), bHead(`lowerleg01${s}`), hip, knee, q, [1, 0, 0], [1, 0, 0]);
  maps.set(`upperleg01${s}`, thigh);
  maps.set(`upperleg02${s}`, thigh);
  const shin = segmentMap(bHead(`lowerleg01${s}`), bHead(`foot${s}`), knee, ankle, q, [1, 0, 0], [1, 0, 0]);
  maps.set(`lowerleg01${s}`, shin);
  maps.set(`lowerleg02${s}`, shin);
  const mhBall = mul([2, 3, 4, 5].map((t) => bHead(`toe${t}-1${s}`)).reduce(add), 0.25);
  const mhSole = Math.min(...P0.slice(0, 13380).map((p) => p[1]));
  const footQ = ankle[1] / (bHead(`foot${s}`)[1] - mhSole);
  const foot = segmentMap(bHead(`foot${s}`), mhBall, ankle, ball, footQ, [0, 1, 0], [0, 1, 0]);
  if (i === 0) console.log("palm check (≈1)", dot(norm(apply(fore, add(bHead(`wrist${s}`), palmMh)).map((x, c) => x - apply(fore, bHead(`wrist${s}`))[c]) as V3), handX).toFixed(3), "foot q", footQ.toFixed(3));
  maps.set(`foot${s}`, foot);
  for (const b of Object.keys(skel.bones)) if (b.startsWith("toe") && b.endsWith(s)) maps.set(b, foot);
}

// Skin weights of MakeHuman bones.
const mhw = JSON.parse(fetchText("rigs/default_weights.mhw")) as { weights: Record<string, [number, number][]> };
const vw: [string, number][][] = Array.from({ length: mhV.length }, () => []);
for (const [bone, list] of Object.entries(mhw.weights)) for (const [vi, w] of list) if (vi < mhV.length) vw[vi].push([bone, w]);

// Fitted positions (body vertices + helper eyes).
const fitted: V3[] = P0.map((p, v) => {
  const ws = vw[v];
  if (!ws.length) return apply(TORSO, p);
  let tw = 0;
  const out: V3 = [0, 0, 0];
  for (const [b, w] of ws) {
    const q = apply(maps.get(b) ?? TORSO, p);
    out[0] += q[0] * w;
    out[1] += q[1] * w;
    out[2] += q[2] * w;
    tw += w;
  }
  return mul(out, 1 / tw);
});

// ---------------------------------------------------------------------------
// 4. Weights onto our bones.
function ourBone(mh: string): number {
  const side = mh.endsWith(".R") ? 0 : mh.endsWith(".L") ? 1 : -1;
  const n = mh.replace(/\.[LR]$/, "");
  const arm = (b: number) => armBone(side, b);
  const leg = (b: number) => legBone(side, b);
  if (n === "root" || n === "spine05" || n === "pelvis") return B_PELVIS;
  if (n === "spine04" || n === "spine03") return B_SPINE;
  if (n === "spine02" || n === "spine01" || n === "breast") return B_CHEST;
  if (n.startsWith("neck")) return B_NECK;
  if (n === "clavicle" || n === "shoulder01") return arm(A_CLAVICLE);
  if (n === "upperarm01") return arm(A_UA_ROOT);
  if (n === "upperarm02") return arm(A_UPPER);
  if (n === "lowerarm01") return arm(A_FORE);
  if (n === "lowerarm02") return arm(A_TWIST);
  if (n === "wrist" || n.startsWith("metacarpal")) return arm(A_HAND);
  const fm = /^finger(\d)-(\d)$/.exec(n);
  if (fm) return arm(A_FINGER + (+fm[1] - 1) * 3 + (+fm[2] - 1));
  if (n === "upperleg01") return leg(L_THIGH_ROOT);
  if (n === "upperleg02") return leg(L_THIGH);
  if (n.startsWith("lowerleg")) return leg(L_SHIN);
  if (n === "foot") return leg(L_FOOT);
  if (n.startsWith("toe")) return leg(L_TOES);
  return B_HEAD; // head, jaw, eyes and every facial bone
}

const bones = new Uint8Array(NV * 4);
const weights = new Uint8Array(NV * 4);
{
  const acc = new Float64Array(BONE_COUNT);
  for (let v = 0; v < NV; v++) {
    acc.fill(0);
    for (const [b, w] of vw[v]) acc[ourBone(b)] += w;
    const order = [...acc.keys()].sort((a, b) => acc[b] - acc[a]).slice(0, 4);
    const tot = order.reduce((s, b) => s + acc[b], 0) || 1;
    let left = 255;
    order.forEach((b, k) => {
      const q = k === 3 ? left : Math.min(left, Math.round((acc[b] / tot) * 255));
      bones[v * 4 + k] = b;
      weights[v * 4 + k] = q;
      left -= q;
    });
    if (tot === 1 && acc[order[0]] === 0) {
      bones[v * 4] = B_CHEST;
      weights[v * 4] = 255;
    }
  }
}

// ---------------------------------------------------------------------------
// Normals of the fitted body (for the volume offsets).
function vertexNormals(pos: V3[]): V3[] {
  const n: V3[] = pos.slice(0, NV).map(() => [0, 0, 0]);
  for (let f = 0; f < bodyQuads.length; f += 4) {
    const [a, b, c, d] = [0, 1, 2, 3].map((k) => bodyQuads[f + k]);
    const fn = cross(sub(pos[c], pos[a]), sub(pos[d], pos[b]));
    for (const v of [a, b, c, d]) n[v] = add(n[v], fn);
  }
  return n.map(norm);
}
const body: V3[] = fitted.slice(0, NV);
const normals = vertexNormals(body);

// ---------------------------------------------------------------------------
// 5. Transfer from the procedural anatomy (bind pose, same space).
console.log("building the procedural anatomy for the attribute transfer…");
const sdf = buildBodyData({ body: 0.55, head: 0.24, hand: 0.19, foot: 0.26 });
const sculpt = sculptBody(frames);
const SN = sdf.position.length / 3;
const sp = (i: number): V3 => [sdf.position[i * 3] * 100, sdf.position[i * 3 + 1] * 100, sdf.position[i * 3 + 2] * 100];
const CELL = 2;
const grid = new Map<string, number[]>();
const key = (x: number, y: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
for (let i = 0; i < SN; i++) {
  const p = sp(i);
  const k = key(p[0], p[1], p[2]);
  let l = grid.get(k);
  if (!l) grid.set(k, (l = []));
  l.push(i);
}
function nearest(p: V3, normal: V3): number {
  let best = -1;
  let bd = Infinity;
  for (let r = 1; r <= 6 && best < 0; r++) {
    const cx = Math.floor(p[0] / CELL);
    const cy = Math.floor(p[1] / CELL);
    const cz = Math.floor(p[2] / CELL);
    for (let x = cx - r; x <= cx + r; x++)
      for (let y = cy - r; y <= cy + r; y++)
        for (let z = cz - r; z <= cz + r; z++) {
          const l = grid.get(`${x},${y},${z}`);
          if (!l) continue;
          for (const i of l) {
            // Prefer surface points facing the same way (don't pick the other side of a thin part).
            const q = sp(i);
            const dn = normal[0] * sdf.normal[i * 3] + normal[1] * sdf.normal[i * 3 + 1] + normal[2] * sdf.normal[i * 3 + 2];
            const d = len(sub(q, p)) + (dn < 0.2 ? 6 : 0);
            if (d < bd) {
              bd = d;
              best = i;
            }
          }
        }
  }
  return best;
}

// Hair and shorts fields: the sculpt's regions, the hair one re-centred on the MakeHuman eyes.
const eyeCentre = (g: string): { c: V3; r: number } => {
  const vs = [...groups.get(g)!];
  const c = mul(vs.map((i) => fitted[i]).reduce(add), 1 / vs.length);
  const r = Math.max(...vs.map((i) => len(sub(fitted[i], c))));
  return { c, r };
};
const eyes = [eyeCentre("helper-r-eye"), eyeCentre("helper-l-eye")];
const sdfEyeMid = mid(sculpt.eyes[0] as V3, sculpt.eyes[1] as V3);
const eyeShift = sub(sdfEyeMid, mid(eyes[0].c, eyes[1].c));
const hairAt = (p: V3) => {
  const q = add(p, eyeShift);
  const hb = sculpt.hairBox!;
  if (q[0] < hb.min[0] || q[0] > hb.max[0] || q[1] < hb.min[1] || q[1] > hb.max[1] || q[2] < hb.min[2] || q[2] > hb.max[2]) return 3;
  return Math.max(-3, Math.min(3, sculpt.hairRegion!(q[0], q[1], q[2])));
};
const shortsAt = (p: V3) => {
  const sb = sculpt.shortsBox!;
  if (p[0] < sb.min[0] || p[0] > sb.max[0] || p[1] < sb.min[1] || p[1] > sb.max[1] || p[2] < sb.min[2] || p[2] > sb.max[2]) return 3;
  return Math.max(-3, Math.min(3, sculpt.shortsRegion!(p[0], p[1], p[2])));
};

// Soft transfer: every body vertex gathers the procedural surface within a small radius
// (gaussian weights, facing the same way) into per-muscle memberships, smoothed over the
// mesh; the two strongest give the muscle, its neighbour and a smooth border margin.
interface Soft {
  id: number;
  id2: number;
  margin: number;
  fibreStrength: number;
  tendon: number;
  dir: V3;
  uv: [number, number] | null;
}
const soft: Soft[] = (() => {
  const RAD = 1.8;
  const SIG = 0.9;
  const member: Map<number, number>[] = [];
  const extras: { fs: number; td: number; w: number; dir: V3; uvs: [number, number, number, number][] }[] = [];
  for (let v = 0; v < NV; v++) {
    const p = body[v];
    const n = normals[v];
    const mm = new Map<number, number>();
    const ex = { fs: 0, td: 0, w: 0, dir: [0, 0, 0] as V3, uvs: [] as [number, number, number, number][] };
    const cx = Math.floor(p[0] / CELL);
    const cy = Math.floor(p[1] / CELL);
    const cz = Math.floor(p[2] / CELL);
    let got = 0;
    for (let r = 1; r <= 4 && got === 0; r++)
      for (let x = cx - r; x <= cx + r; x++)
        for (let y = cy - r; y <= cy + r; y++)
          for (let z = cz - r; z <= cz + r; z++)
            for (const i of grid.get(`${x},${y},${z}`) ?? []) {
              const q = sp(i);
              const d = len(sub(q, p));
              const dn = n[0] * sdf.normal[i * 3] + n[1] * sdf.normal[i * 3 + 1] + n[2] * sdf.normal[i * 3 + 2];
              if (dn < 0.2 || d > RAD * r) continue;
              const w = Math.exp(-(d * d) / (2 * SIG * SIG * r * r));
              got++;
              const m = sdf.info[i * 4];
              mm.set(m, (mm.get(m) ?? 0) + w);
              ex.fs += (sdf.info[i * 4 + 2] / 255) * w;
              ex.td += (sdf.info[i * 4 + 3] / 255) * w;
              ex.w += w;
              ex.uvs.push([m, sdf.fuv[i * 2], sdf.fuv[i * 2 + 1], w]);
              const f: V3 = [sdf.fibre[i * 4] / 127, sdf.fibre[i * 4 + 1] / 127, sdf.fibre[i * 4 + 2] / 127];
              const sg = dot(f, ex.dir) < 0 ? -1 : 1;
              ex.dir = add(ex.dir, mul(f, w * sg));
            }
    member.push(mm);
    extras.push(ex);
  }
  // Smooth memberships over the mesh.
  const adj: number[][] = Array.from({ length: NV }, () => []);
  for (let f = 0; f < bodyQuads.length; f += 4)
    for (let k = 0; k < 4; k++) {
      const a = bodyQuads[f + k];
      const b = bodyQuads[f + ((k + 1) % 4)];
      if (!adj[a].includes(b)) adj[a].push(b);
      if (!adj[b].includes(a)) adj[b].push(a);
    }
  let cur = member.map((m) => {
    let t = 0;
    m.forEach((w) => (t += w));
    const o = new Map<number, number>();
    m.forEach((w, k) => o.set(k, w / (t || 1)));
    return o;
  });
  for (let it = 0; it < 8; it++) {
    cur = cur.map((m, v) => {
      const o = new Map<number, number>();
      m.forEach((w, k) => o.set(k, w * 0.5));
      const nb = adj[v];
      for (const u of nb) cur[u].forEach((w, k) => o.set(k, (o.get(k) ?? 0) + (w * 0.5) / nb.length));
      return o;
    });
  }
  return cur.map((m, v) => {
    const ranked = [...m.entries()].sort((a, b) => b[1] - a[1]);
    const [id, w1] = ranked[0] ?? [255, 1];
    const [id2, w2] = ranked[1] ?? [255, 0];
    const ex = extras[v];
    // Fibre coordinates: mean of the samples in the chosen muscle; dropped where they disagree (strip seams).
    let uv: [number, number] | null = null;
    let sw = 0;
    let su = 0;
    let sv = 0;
    for (const [mm, u, vv, w] of ex.uvs)
      if (mm === id && u < 1e5) {
        sw += w;
        su += u * w;
        sv += vv * w;
      }
    if (sw > 0) {
      const mu = su / sw;
      const mv = sv / sw;
      let spread = 0;
      for (const [mm, u, vv, w] of ex.uvs) if (mm === id && u < 1e5) spread += w * ((u - mu) ** 2 + (vv - mv) ** 2);
      if (Math.sqrt(spread / sw) < 1.2) uv = [mu, mv];
    }
    return {
      id,
      id2,
      // Sharpen: the membership blend is ~2 cm wide, the border should read as a line.
      margin: Math.min(1, ((w1 - w2) / (w1 + w2 || 1)) * 1.2),
      fibreStrength: ex.w ? ex.fs / ex.w : 0,
      tendon: ex.w ? ex.td / ex.w : 0,
      dir: norm(ex.dir),
      uv,
    };
  });
})();

const info = new Uint8Array(NV * 4);
const fibre = new Int8Array(NV * 4);
const extra = new Float32Array(NV * 4);
const fuv = new Float32Array(NV * 2);
const seg = new Uint8Array(NV * 4);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
for (let v = 0; v < NV; v++) {
  const p = body[v];
  const i = nearest(p, normals[v]);
  for (let k = 0; k < 4; k++) {
    info[v * 4 + k] = sdf.info[i * 4 + k];
    seg[v * 4 + k] = sdf.seg[i * 4 + k];
  }
  // Soft transfer (see softTransfer): smooth muscle borders, fibres and fibre coordinates.
  const st = soft[v];
  info[v * 4] = st.id;
  seg[v * 4] = st.id2;
  seg[v * 4 + 1] = Math.round(st.margin * 255);
  info[v * 4 + 2] = Math.round(st.fibreStrength * 255);
  info[v * 4 + 3] = Math.round(st.tendon * 255);
  for (let c = 0; c < 3; c++) fibre[v * 4 + c] = Math.round(st.dir[c] * 127);
  fibre[v * 4 + 3] = MAT_SKIN;
  extra[v * 4] = 99; // ink lines: the sculpted surface carries its own forms
  extra[v * 4 + 1] = 1; // AO: computed on this mesh below
  extra[v * 4 + 2] = sdf.extra[i * 4 + 2];
  fuv[v * 2] = st.uv ? st.uv[0] : 1e6;
  fuv[v * 2 + 1] = st.uv ? st.uv[1] : 0;
  const hairD = hairAt(p);
  const shortD = shortsAt(p);
  let material = MAT_SKIN;
  if (hairD < 0.1) material = MAT_HAIR;
  else if (shortD < 0.4) {
    material = MAT_SHORTS;
    // Only the seat of the shorts shows a muscle (the glutes); elsewhere the fabric stays black.
    if (!(p[0] < -2.5 && p[1] > 79 && info[v * 4] === MUSCLE_INDEX_GLUTES)) {
      info[v * 4] = 255;
      seg[v * 4] = 255;
      seg[v * 4 + 1] = 255;
    }
  }
  // The face and scalp carry no muscle map or ink.
  if (p[1] > fo(B_NECK)[1] + 6 && p[0] > fo(B_HEAD)[0] - 12) {
    if (info[v * 4] !== 255 && p[1] > fo(B_HEAD)[1] - 8) {
      info[v * 4] = 255;
      seg[v * 4] = 255;
      seg[v * 4 + 1] = 255;
    }
    if (p[1] > fo(B_HEAD)[1] - 9) extra[v * 4] = 99;
  }
  info[v * 4 + 1] = material;
  if (material !== MAT_SKIN) {
    fibre[v * 4 + 3] = material;
    fuv[v * 2] = 1e6;
    fuv[v * 2 + 1] = 0;
  }
  extra[v * 4 + 3] = hairD;
  seg[v * 4 + 2] = Math.round(((shortD + 3) / 6) * 255);
  // A little volume: the crop on the scalp, the fabric of the shorts.
  const lift = 0.45 * (1 - smooth(-0.4, 0.3, hairD)) + 0.22 * (1 - smooth(-1.2, 1.2, shortD));
  if (lift > 0) body[v] = add(p, mul(normals[v], lift));
}

// Ambient occlusion of the fitted mesh: surface points above each vertex's tangent
// plane within a few centimetres occlude it (cheap, smooth cavity term).
{
  const R = 7;
  const cell = new Map<string, number[]>();
  const ck = (p: V3) => `${Math.floor(p[0] / R)},${Math.floor(p[1] / R)},${Math.floor(p[2] / R)}`;
  body.forEach((p, v) => {
    const k = ck(p);
    let l = cell.get(k);
    if (!l) cell.set(k, (l = []));
    l.push(v);
  });
  for (let v = 0; v < NV; v++) {
    const p = body[v];
    const n = normals[v];
    let occ = 0;
    let tot = 0;
    const cx = Math.floor(p[0] / R);
    const cy = Math.floor(p[1] / R);
    const cz = Math.floor(p[2] / R);
    for (let x = cx - 1; x <= cx + 1; x++)
      for (let y = cy - 1; y <= cy + 1; y++)
        for (let z = cz - 1; z <= cz + 1; z++)
          for (const u of cell.get(`${x},${y},${z}`) ?? []) {
            const d = sub(body[u], p);
            const l = len(d);
            if (l < 0.3 || l > R) continue;
            const h = dot(d, n) / l;
            const f = (1 - l / R) * (1 - l / R);
            tot += f;
            if (h > 0.1) occ += (h - 0.1) * f;
          }
    extra[v * 4 + 1] = Math.max(0.35, 1 - (tot > 0 ? (occ / tot) * 2.2 : 0));
  }
}

// Island cleanup: tiny patches of "no muscle" inside a muscle join it.
{
  const adj: Set<number>[] = Array.from({ length: NV }, () => new Set());
  for (let f = 0; f < bodyQuads.length; f += 4)
    for (let k = 0; k < 4; k++) {
      const a = bodyQuads[f + k];
      const b = bodyQuads[f + ((k + 1) % 4)];
      adj[a].add(b);
      adj[b].add(a);
    }
  const seen = new Uint8Array(NV);
  for (let s0 = 0; s0 < NV; s0++) {
    if (seen[s0]) continue;
    const id = info[s0 * 4];
    const comp: number[] = [];
    const stack = [s0];
    seen[s0] = 1;
    const rim = new Map<number, number>();
    while (stack.length) {
      const v = stack.pop()!;
      comp.push(v);
      for (const u of adj[v]) {
        if (info[u * 4] === id) {
          if (!seen[u]) {
            seen[u] = 1;
            stack.push(u);
          }
        } else rim.set(info[u * 4], (rim.get(info[u * 4]) ?? 0) + 1);
      }
    }
    if (comp.length < 12 && rim.size === 1) {
      const m = [...rim.keys()][0];
      for (const v of comp) {
        info[v * 4] = m;
        seg[v * 4] = 255;
        seg[v * 4 + 1] = 255;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Write the asset.
let minY = Infinity;
for (const p of body) minY = Math.min(minY, p[1]);
console.log("vertices", NV, "quads", bodyQuads.length / 4, "min y", minY.toFixed(2), "torso scale", torsoScale.toFixed(3));
console.log("eyes", eyes.map((e) => e.c.map((x) => x.toFixed(1)).join(",") + " r" + e.r.toFixed(2)).join(" | "), "head joint", fo(B_HEAD).map((x) => x.toFixed(1)).join(","));
const asset: AssetData = {
  position: Float32Array.from(body.flat()),
  quads: Uint32Array.from(bodyQuads),
  bones,
  weights,
  info,
  fibre,
  extra,
  fuv,
  seg,
  eyes: eyes.map((e) => ({ c: e.c, r: e.r })),
};
const bin = encodeAsset(asset);
const gz = gzipSync(bin, { level: 9 });
const b64 = gz.toString("base64");
const outDir = join(ROOT, "src", "lib", "three", "body", "asset");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "mh-body.ts"),
  `// Generated by scripts/build-body-asset.mjs from the CC0 MakeHuman assets (see ./ASSETS.md). Do not edit.\n` +
    `// ${NV} vertices, ${bodyQuads.length / 4} quads; ${bin.length} bytes raw, ${gz.length} gzipped.\n` +
    `export const MH_BODY = "${b64}";\n`,
);
console.log("wrote mh-body.ts:", bin.length, "raw,", gz.length, "gzip,", b64.length, "base64");
