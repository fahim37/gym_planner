/**
 * Signed-distance sculpting kernel for the procedural anatomy figure.
 *
 * The body is described as an ordered list of primitives in "bind space"
 * (centimetres, y up, x forward, z towards side 0). Primitives live on
 * layers that are blended differently:
 *   base    – body segments (lofts), bones and deep volumes; ordered
 *             union / subtract ops
 *   muscle  – free-standing muscle bellies (spindles); blended with a small
 *             radius so each stays readable, then merged onto the base, with
 *             a groove carved where two muscle groups meet
 *   overlay – detail added after the merge (eyeballs, nails, lids…)
 * plus two derived layers: hair (an offset of the scalp inside a region)
 * and shorts (an offset of the pelvis/thighs inside a region).
 *
 * Lofts (generalised cylinders) can carry muscle "bumps": thickness fields
 * authored in the loft's own (angle, along) coordinates that displace its
 * surface outwards. Bumps of different groups meet at a carved groove, so
 * adjacent muscles tile the body like real anatomy.
 *
 * Evaluation is the hot path of mesh generation, so primitive data is kept
 * in flat typed arrays and culled with a uniform grid of bins.
 */

export const T_ELLIPSOID = 0;
export const T_CONE = 1;
export const T_SPINDLE = 2;
export const T_LOFT = 3;
/** A muscle bump on a loft (evaluated by its loft, never on its own). */
export const T_BUMP = 4;

export const OP_UNION = 0;
export const OP_SUB = 1;

export const L_BASE = 0;
export const L_MUSCLE = 1;
export const L_OVERLAY = 2;
/** Extra volume the shorts drape over (crotch, gluteal cleft); not part of the body. */
export const L_SHORTS_FILL = 3;

export type V3 = [number, number, number];

/** Per-primitive metadata used when baking vertex attributes (not in the hot loop). */
export interface PrimMeta {
  name: string;
  /** Muscle id index (see MUSCLE_IDS) or -1. */
  muscle: number;
  /** Primitives of the same group never get a groove or ink line between them. */
  group: number;
  /** Skinning chain at the start (t = 0) and end (t = 1) of the primitive. */
  chainA: number;
  chainB: number;
  /** Chain blend window along the primitive's own parameter t. */
  chainT0: number;
  chainT1: number;
  /** 0..1 how strongly fibre striations show. */
  fibre: number;
  /** Portion of the length (from each end) that is tendon: [start, end]. */
  tendon: [number, number];
  /** Material slot (see MAT_*). */
  material: number;
  /** Fixed fibre direction for non-directional prims (ellipsoids), bind space. */
  fibreDir?: V3;
  /** Fibres converge on this point (fan muscles), overrides the axis direction. */
  fibreTo?: V3;
}

export const MAT_SKIN = 0;
export const MAT_SHORTS = 1;
export const MAT_HAIR = 2;
export const MAT_EYE = 3;
export const MAT_NAIL = 4;
export const MAT_LIP = 5;

const STRIDE = 64;
const MAX_PTS = 6;
const MAX_BUMP_PTS = 6;
const PROFILE_N = 33;
const BIG = 1e6;
/** Returned where no primitive can reach: comfortably outside. */
const FAR = 30;
const RAD = Math.PI / 180;

// Parameter layout (offsets within a primitive's STRIDE block).
const P_TYPE = 0;
const P_OP = 1;
const P_K = 2;
const P_LAYER = 3;
const P_GROUP = 4;
const P_GROOVE = 5;
// Geometry starts here.
const G = 8;

export interface EllipsoidSpec {
  center: V3;
  /** Orthonormal axes; radii are measured along them. */
  axes: [V3, V3, V3];
  radii: V3;
}

export interface SpindleSpec {
  /** Polyline axis, 2..6 points. */
  pts: V3[];
  /** Radius along the normalised length t (sampled at 33 points). */
  radius: (t: number) => number;
  /** Cross-section is squashed along this direction (per point, projected ⊥ to the axis)… */
  flatDir?: V3 | V3[];
  /** …to this fraction of the radius. 1 = round. */
  flat?: number;
}

export interface LoftSection {
  /** Extents from the axis towards +front, −front, +side, −side (cm). */
  f: number;
  b: number;
  s: number;
  m: number;
  /** Superellipse exponent (2 = ellipse, higher = boxier). */
  n: number;
  /** Offset of the section centre along front / side (cm). */
  of?: number;
  os?: number;
}

/**
 * A muscle bump on a loft: a strip following a path in the loft's
 * (angle°, along cm) coordinates — angle 0 = front, 90 = +side — with a
 * half-width (cm) and a thickness (cm) at each path point.
 */
export interface BumpSpec {
  pts: [number, number][];
  width: number[];
  thick: number[];
  /** Cross profile exponent: 1 = rounded, 2 = soft-edged, 0.5 = flat-topped. */
  p?: number;
  /** Groove depth (cm) where it meets another group. */
  groove?: number;
  group: number;
  meta: Partial<PrimMeta>;
}

export interface LoftSpec {
  a: V3;
  b: V3;
  /** Direction of "front" (projected ⊥ to the axis). */
  front: V3;
  /** Sections evenly spaced from a (t = 0) to b (t = 1). */
  sections: LoftSection[];
  bumps?: BumpSpec[];
}

export interface PrimOpts {
  op?: number;
  k?: number;
  layer?: number;
  group?: number;
  /** Depth (cm) of the groove carved where this muscle meets another group. */
  groove?: number;
  meta?: Partial<PrimMeta>;
}

const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len3 = (a: V3) => Math.sqrt(dot3(a, a));
const norm3 = (a: V3): V3 => {
  const l = len3(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Cubic smooth minimum (C2), radius k. */
function smin(a: number, b: number, k: number) {
  if (k <= 0) return a < b ? a : b;
  const h = k - Math.abs(a - b);
  if (h <= 0) return a < b ? a : b;
  const x = h / k;
  return (a < b ? a : b) - x * x * x * k * (1 / 6);
}

function smax(a: number, b: number, k: number) {
  return -smin(-a, -b, k);
}

export interface Bounds {
  min: V3;
  max: V3;
}

/** Scratch output of a detailed evaluation. */
export interface Detail {
  /** Final signed distance. */
  d: number;
  /** Candidate primitive indices and their raw distances. */
  count: number;
  prims: Int32Array;
  dists: Float64Array;
  /** Parameter t along each candidate (for spindles/lofts/bumps), else 0.5. */
  ts: Float64Array;
  /** Fibre / axis direction per candidate. */
  dirs: Float64Array;
  /** Which derived layer produced the surface: 0 body, 1 hair, 2 shorts. */
  surface: number;
  /** Signed distance to the boundary between the two nearest muscle groups. */
  line: number;
}

export class Sculpt {
  private P = new Float64Array(STRIDE * 64);
  private profiles = new Float64Array(PROFILE_N * 64);
  private loftData: number[] = [];
  private lofts = new Float64Array(0);
  private bumpLists: number[] = [];
  private bumps = new Int32Array(0);
  readonly meta: PrimMeta[] = [];
  private bounds: (Bounds | null)[] = [];
  count = 0;
  /** Blend radius between the base and muscle layers. */
  muscleBlend = 1.1;
  /** Width (cm) of the carved groove between muscle groups. */
  grooveWidth = 0.55;
  /** Width (in thickness difference, cm) of the groove between bumps. */
  bumpGrooveWidth = 0.5;
  /** Evaluation counters (profiling). */
  evals = 0;
  candidates = 0;

  // Derived layers, supplied by the anatomy.
  hairRegion: ((x: number, y: number, z: number) => number) | null = null;
  hairThickness = 0.5;
  hairBox: Bounds | null = null;
  shortsRegion: ((x: number, y: number, z: number) => number) | null = null;
  shortsThickness = 0.5;
  shortsBox: Bounds | null = null;

  // Spatial bins.
  private binMin: V3 = [0, 0, 0];
  private binSize = 3;
  private binDims: V3 = [0, 0, 0];
  private binStart = new Int32Array(1);
  private binPrims = new Int32Array(0);
  /** Extra reach (cm) beyond each primitive's blend radius kept in the culling bins. */
  margin = 2.5;

  // Scratch written by dist().
  private lastT = 0.5;
  private lastDx = 0;
  private lastDy = 1;
  private lastDz = 0;
  /** Nearest two bump groups of the last loft evaluation (for ink lines). */
  private lastG1 = -1;
  private lastG2 = -1;
  private lastD1 = BIG;
  private lastD2 = BIG;
  private out: Detail | null = null;
  private outN = 0;

  private grow(n: number) {
    if (n * STRIDE <= this.P.length) return;
    const P = new Float64Array(this.P.length * 2);
    P.set(this.P);
    this.P = P;
    const pr = new Float64Array(this.profiles.length * 2);
    pr.set(this.profiles);
    this.profiles = pr;
  }

  private begin(type: number, o: PrimOpts, b: Bounds | null): number {
    const i = this.count++;
    this.grow(this.count);
    const P = this.P;
    const base = i * STRIDE;
    P.fill(0, base, base + STRIDE);
    P[base + P_TYPE] = type;
    P[base + P_OP] = o.op ?? OP_UNION;
    P[base + P_K] = o.k ?? 0;
    P[base + P_LAYER] = o.layer ?? L_BASE;
    P[base + P_GROUP] = o.group ?? -1;
    P[base + P_GROOVE] = o.groove ?? 0;
    const m = o.meta ?? {};
    this.meta.push({
      name: m.name ?? "",
      muscle: m.muscle ?? -1,
      group: o.group ?? -1,
      chainA: m.chainA ?? 0,
      chainB: m.chainB ?? m.chainA ?? 0,
      chainT0: m.chainT0 ?? 0.5,
      chainT1: m.chainT1 ?? 0.5,
      fibre: m.fibre ?? 0,
      tendon: m.tendon ?? [0, 0],
      material: m.material ?? MAT_SKIN,
      fibreDir: m.fibreDir,
      fibreTo: m.fibreTo,
    });
    this.bounds.push(b);
    return base;
  }

  ellipsoid(e: EllipsoidSpec, o: PrimOpts = {}) {
    const r = Math.max(...e.radii);
    const b: Bounds = {
      min: [e.center[0] - r, e.center[1] - r, e.center[2] - r],
      max: [e.center[0] + r, e.center[1] + r, e.center[2] + r],
    };
    const base = this.begin(T_ELLIPSOID, o, b) + G;
    const P = this.P;
    P.set(e.center, base);
    for (let a = 0; a < 3; a++) P.set(norm3(e.axes[a]), base + 3 + a * 3);
    P.set(e.radii, base + 12);
    return this.count - 1;
  }

  /** Round cone (capsule when ra = rb) from a to b. */
  cone(a: V3, b: V3, ra: number, rb: number, o: PrimOpts = {}) {
    const r = Math.max(ra, rb);
    const bb: Bounds = {
      min: [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r],
      max: [Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r],
    };
    const base = this.begin(T_CONE, o, bb) + G;
    const P = this.P;
    P.set(a, base);
    P.set(b, base + 3);
    P[base + 6] = ra;
    P[base + 7] = rb;
    // Precomputed (see sdRoundCone): length², rr, a2, 1/l2.
    const ba = sub3(b, a);
    const l2 = dot3(ba, ba);
    const rr = ra - rb;
    P[base + 8] = l2;
    P[base + 9] = rr;
    P[base + 10] = l2 - rr * rr;
    P[base + 11] = 1 / l2;
    return this.count - 1;
  }

  spindle(s: SpindleSpec, o: PrimOpts = {}) {
    const n = Math.min(MAX_PTS, s.pts.length);
    let rmax = 0;
    for (let k = 0; k < PROFILE_N; k++) rmax = Math.max(rmax, s.radius(k / (PROFILE_N - 1)));
    const flat = s.flat ?? 1;
    const bb: Bounds = { min: [BIG, BIG, BIG], max: [-BIG, -BIG, -BIG] };
    for (let k = 0; k < n; k++) {
      for (let c = 0; c < 3; c++) {
        bb.min[c] = Math.min(bb.min[c], s.pts[k][c] - rmax);
        bb.max[c] = Math.max(bb.max[c], s.pts[k][c] + rmax);
      }
    }
    const i = this.count;
    const base = this.begin(T_SPINDLE, o, bb) + G;
    const P = this.P;
    P[base] = n;
    P[base + 1] = flat;
    // Points at +2..+19; per-segment flatten normals at +20..+37; cumulative t at +38..+43.
    let total = 0;
    const lens: number[] = [];
    for (let k = 0; k < n - 1; k++) {
      const l = len3(sub3(s.pts[k + 1], s.pts[k]));
      lens.push(l);
      total += l;
    }
    let acc = 0;
    for (let k = 0; k < n; k++) {
      P.set(s.pts[k], base + 2 + k * 3);
      P[base + 38 + k] = total > 0 ? acc / total : 0;
      if (k < n - 1) acc += lens[k];
    }
    for (let k = 0; k < n - 1; k++) {
      const axis = norm3(sub3(s.pts[k + 1], s.pts[k]));
      let fd: V3 = [0, 0, 1];
      if (Array.isArray(s.flatDir?.[0])) {
        const list = s.flatDir as V3[];
        const a = list[Math.min(k, list.length - 1)];
        const b = list[Math.min(k + 1, list.length - 1)];
        fd = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
      } else if (s.flatDir) fd = s.flatDir as V3;
      const d = dot3(fd, axis);
      let nn: V3 = [fd[0] - axis[0] * d, fd[1] - axis[1] * d, fd[2] - axis[2] * d];
      if (len3(nn) < 1e-4) nn = norm3(cross3(axis, [0.3, 0.9, 0.3]));
      P.set(norm3(nn), base + 20 + k * 3);
    }
    const po = i * PROFILE_N;
    for (let k = 0; k < PROFILE_N; k++) this.profiles[po + k] = s.radius(k / (PROFILE_N - 1));
    return i;
  }

  loft(l: LoftSpec, o: PrimOpts = {}) {
    const axis = sub3(l.b, l.a);
    const L = len3(axis);
    const ax = norm3(axis);
    const fr = norm3(sub3(l.front, [ax[0] * dot3(l.front, ax), ax[1] * dot3(l.front, ax), ax[2] * dot3(l.front, ax)]));
    const sd = cross3(ax, fr);
    let rmax = 0;
    let tmax = 0;
    for (const b of l.bumps ?? []) tmax = Math.max(tmax, ...b.thick);
    for (const s of l.sections) rmax = Math.max(rmax, s.f + Math.abs(s.of ?? 0), s.b + Math.abs(s.of ?? 0), s.s + Math.abs(s.os ?? 0), s.m + Math.abs(s.os ?? 0));
    rmax += tmax;
    const bb: Bounds = {
      min: [Math.min(l.a[0], l.b[0]) - rmax, Math.min(l.a[1], l.b[1]) - rmax, Math.min(l.a[2], l.b[2]) - rmax],
      max: [Math.max(l.a[0], l.b[0]) + rmax, Math.max(l.a[1], l.b[1]) + rmax, Math.max(l.a[2], l.b[2]) + rmax],
    };
    const index = this.count;
    const base = this.begin(T_LOFT, o, bb) + G;
    this.P.set(l.a, base);
    this.P.set(ax, base + 3);
    this.P[base + 6] = L;
    this.P.set(fr, base + 7);
    this.P.set(sd, base + 10);
    this.P[base + 13] = l.sections.length;
    this.P[base + 14] = this.loftData.length;
    this.P[base + 17] = tmax;
    for (const s of l.sections) this.loftData.push(s.f, s.b, s.s, s.m, s.n, s.of ?? 0, s.os ?? 0);
    const bumps = l.bumps ?? [];
    const first = this.bumpLists.length;
    for (const b of bumps) this.bumpLists.push(this.bump(b, index, o));
    // The loft's own block may have been reallocated by bump(): write through this.P.
    this.P[index * STRIDE + G + 15] = first;
    this.P[index * STRIDE + G + 16] = bumps.length;
    return index;
  }

  private bump(b: BumpSpec, loft: number, o: PrimOpts) {
    const n = Math.min(MAX_BUMP_PTS, b.pts.length);
    const i = this.count;
    const base =
      this.begin(T_BUMP, { layer: L_MUSCLE, group: b.group, groove: b.groove ?? 0.25, meta: { ...b.meta, chainA: b.meta.chainA ?? o.meta?.chainA, chainB: b.meta.chainB ?? b.meta.chainA ?? o.meta?.chainB ?? o.meta?.chainA } }, null) + G;
    const P = this.P;
    const th0 = b.pts[0][0];
    P[base] = n;
    P[base + 1] = th0;
    P[base + 2] = b.p ?? 1.5;
    P[base + 3] = loft;
    let tmin = BIG;
    let tmaxv = -BIG;
    let amin = BIG;
    let amax = -BIG;
    let wmax = 0;
    for (let k = 0; k < n; k++) {
      let dth = b.pts[k][0] - th0;
      while (dth > 180) dth -= 360;
      while (dth < -180) dth += 360;
      const w = b.width[Math.min(k, b.width.length - 1)];
      const th = b.thick[Math.min(k, b.thick.length - 1)];
      P[base + 4 + k * 4] = dth;
      P[base + 5 + k * 4] = b.pts[k][1];
      P[base + 6 + k * 4] = w;
      P[base + 7 + k * 4] = th;
      tmin = Math.min(tmin, dth);
      tmaxv = Math.max(tmaxv, dth);
      amin = Math.min(amin, b.pts[k][1] - w);
      amax = Math.max(amax, b.pts[k][1] + w);
      wmax = Math.max(wmax, w);
    }
    // Angular margin: a width of wmax on the smallest plausible radius (3 cm).
    const marg = (wmax / 3) / RAD;
    P[base + 30] = tmin - marg;
    P[base + 31] = tmaxv + marg;
    P[base + 32] = amin;
    P[base + 33] = amax;
    return i;
  }

  /**
   * Builds the culling bins. Call once after all primitives are added.
   * A primitive is listed in a bin when its own distance at the bin centre
   * says it can influence the surface anywhere inside the bin.
   */
  finalize(binSize = 2) {
    this.lofts = Float64Array.from(this.loftData);
    this.bumps = Int32Array.from(this.bumpLists);
    const min: V3 = [BIG, BIG, BIG];
    const max: V3 = [-BIG, -BIG, -BIG];
    const reach = (i: number) =>
      this.P[i * STRIDE + P_K] + this.margin + (this.P[i * STRIDE + P_LAYER] === L_MUSCLE ? this.muscleBlend + 1 : 0) + (this.P[i * STRIDE + P_LAYER] === L_SHORTS_FILL ? 2.5 : 0);
    const infl: (Bounds | null)[] = this.bounds.map((b, i) => {
      if (!b) return null;
      const k = reach(i) + binSize;
      return { min: [b.min[0] - k, b.min[1] - k, b.min[2] - k], max: [b.max[0] + k, b.max[1] + k, b.max[2] + k] };
    });
    for (const b of infl) {
      if (!b) continue;
      for (let c = 0; c < 3; c++) {
        min[c] = Math.min(min[c], b.min[c]);
        max[c] = Math.max(max[c], b.max[c]);
      }
    }
    this.binMin = min;
    this.binSize = binSize;
    const dims: V3 = [0, 1, 2].map((c) => Math.max(1, Math.ceil((max[c] - min[c]) / binSize))) as V3;
    this.binDims = dims;
    const nb = dims[0] * dims[1] * dims[2];
    const counts = new Int32Array(nb + 1);
    const pairs: number[] = [];
    const halfDiag = binSize * 0.8661;
    infl.forEach((b, i) => {
      if (!b) return;
      const lo = [0, 1, 2].map((c) => Math.max(0, Math.floor((b.min[c] - min[c]) / binSize)));
      const hi = [0, 1, 2].map((c) => Math.min(dims[c] - 1, Math.floor((b.max[c] - min[c]) / binSize)));
      const lim = halfDiag * 1.3 + reach(i);
      for (let z = lo[2]; z <= hi[2]; z++)
        for (let y = lo[1]; y <= hi[1]; y++)
          for (let x = lo[0]; x <= hi[0]; x++) {
            const d = this.dist(i, min[0] + (x + 0.5) * binSize, min[1] + (y + 0.5) * binSize, min[2] + (z + 0.5) * binSize);
            if (d > lim) continue;
            const bin = x + dims[0] * (y + dims[1] * z);
            counts[bin + 1]++;
            pairs.push(bin, i);
          }
    });
    for (let b = 0; b < nb; b++) counts[b + 1] += counts[b];
    this.binStart = counts.slice();
    this.binPrims = new Int32Array(pairs.length / 2);
    const fill = counts.slice();
    // Primitives were visited in index order, so each bin's list stays sorted.
    for (let p = 0; p < pairs.length; p += 2) this.binPrims[fill[pairs[p]]++] = pairs[p + 1];
  }

  /** Distance to primitive i (raw, before layer ops). */
  private dist(i: number, x: number, y: number, z: number): number {
    const P = this.P;
    const o = i * STRIDE;
    const g = o + G;
    switch (P[o + P_TYPE]) {
      case T_ELLIPSOID: {
        const px = x - P[g];
        const py = y - P[g + 1];
        const pz = z - P[g + 2];
        const qx = px * P[g + 3] + py * P[g + 4] + pz * P[g + 5];
        const qy = px * P[g + 6] + py * P[g + 7] + pz * P[g + 8];
        const qz = px * P[g + 9] + py * P[g + 10] + pz * P[g + 11];
        const rx = P[g + 12];
        const ry = P[g + 13];
        const rz = P[g + 14];
        const ax = qx / rx;
        const ay = qy / ry;
        const az = qz / rz;
        const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
        const bx = ax / rx;
        const by = ay / ry;
        const bz = az / rz;
        const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
        this.lastT = 0.5;
        this.lastDx = P[g + 6];
        this.lastDy = P[g + 7];
        this.lastDz = P[g + 8];
        return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
      }
      case T_CONE: {
        // Inigo Quilez, "sdRoundCone" (arbitrary orientation).
        const ax = P[g];
        const ay = P[g + 1];
        const az = P[g + 2];
        const bax = P[g + 3] - ax;
        const bay = P[g + 4] - ay;
        const baz = P[g + 5] - az;
        const r1 = P[g + 6];
        const r2 = P[g + 7];
        const l2 = P[g + 8];
        const rr = P[g + 9];
        const a2 = P[g + 10];
        const il2 = P[g + 11];
        const pax = x - ax;
        const pay = y - ay;
        const paz = z - az;
        const yv = pax * bax + pay * bay + paz * baz;
        const zv = yv - l2;
        const wx = pax * l2 - bax * yv;
        const wy = pay * l2 - bay * yv;
        const wz = paz * l2 - baz * yv;
        const x2 = wx * wx + wy * wy + wz * wz;
        const y2 = yv * yv * l2;
        const z2 = zv * zv * l2;
        const k = (rr > 0 ? 1 : rr < 0 ? -1 : 0) * rr * rr * x2;
        const il = Math.sqrt(il2);
        this.lastT = Math.min(1, Math.max(0, yv * il2));
        this.lastDx = bax * il;
        this.lastDy = bay * il;
        this.lastDz = baz * il;
        if ((zv > 0 ? 1 : zv < 0 ? -1 : 0) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
        if ((yv > 0 ? 1 : yv < 0 ? -1 : 0) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
        return (Math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - r1;
      }
      case T_SPINDLE: {
        const n = P[g];
        const flat = P[g + 1];
        const invFlat = 1 / flat;
        const po = i * PROFILE_N;
        let best = BIG;
        let bestT = 0;
        let bdx = 0;
        let bdy = 1;
        let bdz = 0;
        for (let k = 0; k < n - 1; k++) {
          const pa = g + 2 + k * 3;
          const ax = P[pa];
          const ay = P[pa + 1];
          const az = P[pa + 2];
          const abx = P[pa + 3] - ax;
          const aby = P[pa + 4] - ay;
          const abz = P[pa + 5] - az;
          const l2 = abx * abx + aby * aby + abz * abz;
          const px = x - ax;
          const py = y - ay;
          const pz = z - az;
          let t = (px * abx + py * aby + pz * abz) / l2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = px - abx * t;
          const qy = py - aby * t;
          const qz = pz - abz * t;
          const nb = g + 20 + k * 3;
          const qn = qx * P[nb] + qy * P[nb + 1] + qz * P[nb + 2];
          const q2 = qx * qx + qy * qy + qz * qz;
          const qm2 = q2 - qn * qn;
          const sn = qn * invFlat;
          const rho = Math.sqrt((qm2 > 0 ? qm2 : 0) + sn * sn);
          const t0 = P[g + 38 + k];
          const t1 = k + 1 < n - 1 ? P[g + 38 + k + 1] : 1;
          const tg = t0 + (t1 - t0) * t;
          const f = tg * (PROFILE_N - 1);
          const fi = f | 0;
          const r = fi >= PROFILE_N - 1 ? this.profiles[po + PROFILE_N - 1] : this.profiles[po + fi] + (this.profiles[po + fi + 1] - this.profiles[po + fi]) * (f - fi);
          const d = (rho - r) * (flat < 1 ? flat : 1);
          if (d < best) {
            best = d;
            bestT = tg;
            const l = Math.sqrt(l2);
            bdx = abx / l;
            bdy = aby / l;
            bdz = abz / l;
          }
        }
        this.lastT = bestT;
        this.lastDx = bdx;
        this.lastDy = bdy;
        this.lastDz = bdz;
        return best;
      }
      case T_LOFT:
        return this.loftDist(i, x, y, z);
    }
    return BIG;
  }

  private loftDist(i: number, x: number, y: number, z: number): number {
    const P = this.P;
    const g = i * STRIDE + G;
    const px = x - P[g];
    const py = y - P[g + 1];
    const pz = z - P[g + 2];
    const axx = P[g + 3];
    const axy = P[g + 4];
    const axz = P[g + 5];
    const L = P[g + 6];
    const along = px * axx + py * axy + pz * axz;
    const t = along / L;
    const u = px * P[g + 7] + py * P[g + 8] + pz * P[g + 9];
    const v = px * P[g + 10] + py * P[g + 11] + pz * P[g + 12];
    const ns = P[g + 13];
    const off = P[g + 14];
    const ft = (t < 0 ? 0 : t > 1 ? 1 : t) * (ns - 1);
    let i1 = ft | 0;
    if (i1 > ns - 2) i1 = ns - 2;
    const s = ft - i1;
    const i0 = i1 > 0 ? i1 - 1 : 0;
    const i2 = i1 + 1;
    const i3 = i2 < ns - 1 ? i2 + 1 : ns - 1;
    // Catmull-Rom weights.
    const s2 = s * s;
    const s3 = s2 * s;
    const w0 = -0.5 * s3 + s2 - 0.5 * s;
    const w1 = 1.5 * s3 - 2.5 * s2 + 1;
    const w2 = -1.5 * s3 + 2 * s2 + 0.5 * s;
    const w3 = 0.5 * s3 - 0.5 * s2;
    const D = this.lofts;
    const b0 = off + i0 * 7;
    const b1 = off + i1 * 7;
    const b2 = off + i2 * 7;
    const b3 = off + i3 * 7;
    const ef = w0 * D[b0] + w1 * D[b1] + w2 * D[b2] + w3 * D[b3];
    const eb = w0 * D[b0 + 1] + w1 * D[b1 + 1] + w2 * D[b2 + 1] + w3 * D[b3 + 1];
    const es = w0 * D[b0 + 2] + w1 * D[b1 + 2] + w2 * D[b2 + 2] + w3 * D[b3 + 2];
    const em = w0 * D[b0 + 3] + w1 * D[b1 + 3] + w2 * D[b2 + 3] + w3 * D[b3 + 3];
    const ex = w0 * D[b0 + 4] + w1 * D[b1 + 4] + w2 * D[b2 + 4] + w3 * D[b3 + 4];
    const of = w0 * D[b0 + 5] + w1 * D[b1 + 5] + w2 * D[b2 + 5] + w3 * D[b3 + 5];
    const os = w0 * D[b0 + 6] + w1 * D[b1 + 6] + w2 * D[b2 + 6] + w3 * D[b3 + 6];
    const uu = u - of;
    const vv = v - os;
    const rx = uu > 0 ? ef : eb;
    const ry = vv > 0 ? es : em;
    const ux = Math.abs(uu) / rx;
    const vy = Math.abs(vv) / ry;
    // Superellipse norm approximated by blending the L2 and L∞ norms.
    const l2n = Math.sqrt(ux * ux + vy * vy);
    const beta = ex <= 2 ? 0 : ex >= 3.2 ? 0.6 : (ex - 2) * 0.5;
    const rn = beta ? l2n + ((ux > vy ? ux : vy) - l2n) * beta : l2n;
    const rad = Math.sqrt(uu * uu + vv * vv);
    const rr = rn > 1e-6 ? rad / rn : Math.min(rx, ry);
    let d = (rn - 1) * rr;
    const cap = along < L - along ? -along : along - L;
    if (cap > 0) d = d > 0 ? Math.sqrt(d * d + cap * cap) : cap;
    else if (cap > d) d = cap;
    this.lastT = t;
    this.lastDx = axx;
    this.lastDy = axy;
    this.lastDz = axz;
    this.lastG1 = -1;
    this.lastG2 = -1;
    const nb = P[g + 16];
    if (!nb || d > P[g + 17] + 2 || d < -4) return d;

    // Muscle bumps: thickness fields in (angle, along) that push the surface out.
    const theta = Math.atan2(vv, uu) / RAD;
    const rref = (ef + eb + es + em) * 0.25 * RAD;
    const first = P[g + 15];
    const out = this.out;
    let T = 0;
    let t1 = 0;
    let t2 = 0;
    let g1 = -1;
    let g2 = -1;
    let gr1 = 0;
    let gr2 = 0;
    const baseD = d;
    for (let k = 0; k < nb; k++) {
      const bi = this.bumps[first + k];
      const bg = bi * STRIDE + G;
      let dth = theta - P[bg + 1];
      if (dth > 180) dth -= 360;
      else if (dth < -180) dth += 360;
      if (dth < P[bg + 30] || dth > P[bg + 31] || along < P[bg + 32] || along > P[bg + 33]) continue;
      const qx = dth * rref;
      const n = P[bg];
      let best = BIG;
      let bs = 0;
      let bw = 1;
      let bh = 0;
      let bdx = 0;
      let bdy = 1;
      let acc = 0;
      let total = 0;
      for (let q = 0; q < n - 1; q++) {
        const pa = bg + 4 + q * 4;
        const x0 = P[pa] * rref;
        const y0 = P[pa + 1];
        const dx = P[pa + 4] * rref - x0;
        const dy = P[pa + 5] - y0;
        total += Math.sqrt(dx * dx + dy * dy);
      }
      for (let q = 0; q < n - 1; q++) {
        const pa = bg + 4 + q * 4;
        const x0 = P[pa] * rref;
        const y0 = P[pa + 1];
        const dx = P[pa + 4] * rref - x0;
        const dy = P[pa + 5] - y0;
        const l2 = dx * dx + dy * dy;
        const sl = Math.sqrt(l2);
        let tt = ((qx - x0) * dx + (along - y0) * dy) / (l2 || 1);
        tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
        const ex2 = qx - x0 - dx * tt;
        const ey2 = along - y0 - dy * tt;
        const dist2 = ex2 * ex2 + ey2 * ey2;
        if (dist2 < best) {
          best = dist2;
          bs = total > 0 ? (acc + sl * tt) / total : 0;
          bw = P[pa + 2] + (P[pa + 6] - P[pa + 2]) * tt;
          bh = P[pa + 3] + (P[pa + 7] - P[pa + 3]) * tt;
          bdx = dx / (sl || 1);
          bdy = dy / (sl || 1);
        }
        acc += sl;
      }
      const qd = Math.sqrt(best) / bw;
      let tb = 0;
      if (qd < 1) {
        const e = 1 - qd * qd;
        const p = P[bg + 2];
        tb = bh * (p === 1 ? e : p === 2 ? e * e : Math.pow(e, p));
      }
      if (out) {
        // Report the bump as its own candidate: distance to its own swelling.
        const c = this.outN++;
        out.prims[c] = bi;
        out.dists[c] = qd < 1 ? baseD - tb : baseD + (qd - 1) * bw * 0.5;
        out.ts[c] = bs;
        // Fibre direction: tangential (angle) and axial components → 3D.
        const th = theta * RAD;
        const ct = Math.cos(th);
        const st = Math.sin(th);
        const tx = -st * P[g + 7] + ct * P[g + 10];
        const ty = -st * P[g + 8] + ct * P[g + 11];
        const tz = -st * P[g + 9] + ct * P[g + 12];
        let fx = tx * bdx + axx * bdy;
        let fy = ty * bdx + axy * bdy;
        let fz = tz * bdx + axz * bdy;
        const fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
        fx /= fl;
        fy /= fl;
        fz /= fl;
        out.dirs[c * 3] = fx;
        out.dirs[c * 3 + 1] = fy;
        out.dirs[c * 3 + 2] = fz;
      }
      if (tb <= 0) continue;
      T = T > 0 ? smax(T, tb, 0.18) : tb;
      const grp = P[bi * STRIDE + P_GROUP];
      if (tb > t1) {
        if (grp !== g1) {
          t2 = t1;
          g2 = g1;
          gr2 = gr1;
        }
        t1 = tb;
        g1 = grp;
        gr1 = P[bi * STRIDE + P_GROOVE];
      } else if (tb > t2 && grp !== g1) {
        t2 = tb;
        g2 = grp;
        gr2 = P[bi * STRIDE + P_GROOVE];
      }
    }
    d = baseD - T;
    if (g2 >= 0 && t2 > 0) {
      const w = (t1 - t2) / this.bumpGrooveWidth;
      const depth = gr1 < gr2 ? gr1 : gr2;
      d += depth * Math.exp(-w * w) * (t2 < 0.4 ? t2 / 0.4 : 1);
    }
    this.lastG1 = g1;
    this.lastG2 = g2;
    this.lastD1 = baseD - t1;
    this.lastD2 = baseD - t2;
    return d;
  }

  private binOf(x: number, y: number, z: number) {
    const s = this.binSize;
    const bx = Math.floor((x - this.binMin[0]) / s);
    const by = Math.floor((y - this.binMin[1]) / s);
    const bz = Math.floor((z - this.binMin[2]) / s);
    const d = this.binDims;
    if (bx < 0 || by < 0 || bz < 0 || bx >= d[0] || by >= d[1] || bz >= d[2]) return -1;
    return bx + d[0] * (by + d[1] * bz);
  }

  /** Signed distance of the finished surface at a point. */
  eval(x: number, y: number, z: number): number {
    return this.run(x, y, z, null);
  }

  /** Like eval(), also recording every candidate primitive into `out`. */
  detail(x: number, y: number, z: number, out: Detail): number {
    return this.run(x, y, z, out);
  }

  private run(x: number, y: number, z: number, out: Detail | null): number {
    this.evals++;
    const bin = this.binOf(x, y, z);
    const start = bin < 0 ? 0 : this.binStart[bin];
    const end = bin < 0 ? 0 : this.binStart[bin + 1];
    if (end === start) {
      if (out) {
        out.count = 0;
        out.d = FAR;
        out.surface = 0;
        out.line = 99;
      }
      return FAR;
    }
    this.out = out;
    this.outN = 0;
    const P = this.P;
    let base = BIG;
    let mus = BIG;
    // Nearest two muscle groups (grooves) and nearest two of any group incl. bumps (ink lines).
    let d1 = BIG;
    let d2 = BIG;
    let g1 = -1;
    let g2 = -1;
    let groove1 = 0;
    let groove2 = 0;
    let l1 = BIG;
    let l2 = BIG;
    let lg1 = -1;
    let lg2 = -1;
    let fill = BIG;
    let body = BIG;
    let merged = false;
    this.candidates += end - start;
    for (let j = start; j < end; j++) {
      const i = this.binPrims[j];
      const o = i * STRIDE;
      const layer = P[o + P_LAYER];
      const type = P[o + P_TYPE];
      const d = this.dist(i, x, y, z);
      if (out) {
        const c = this.outN++;
        out.prims[c] = i;
        out.dists[c] = d;
        out.ts[c] = this.lastT;
        out.dirs[c * 3] = this.lastDx;
        out.dirs[c * 3 + 1] = this.lastDy;
        out.dirs[c * 3 + 2] = this.lastDz;
        if (type === T_LOFT) {
          // Bumps were appended before the loft itself; fine for the baker.
          this.trackLine(this.lastG1, this.lastD1);
          this.trackLine(this.lastG2, this.lastD2);
        }
      }
      if (layer === L_BASE) {
        if (P[o + P_OP] === OP_SUB) base = smax(base, -d, P[o + P_K]);
        else base = smin(base, d, P[o + P_K]);
      } else if (layer === L_MUSCLE) {
        mus = smin(mus, d, P[o + P_K]);
        const g = P[o + P_GROUP];
        if (d < d1) {
          if (g !== g1) {
            d2 = d1;
            g2 = g1;
            groove2 = groove1;
          }
          d1 = d;
          g1 = g;
          groove1 = P[o + P_GROOVE];
        } else if (d < d2 && g !== g1) {
          d2 = d;
          g2 = g;
          groove2 = P[o + P_GROOVE];
        }
        if (out) this.trackLine(g, d);
      } else if (layer === L_SHORTS_FILL) {
        fill = smin(fill, d, P[o + P_K]);
      } else {
        if (!merged) {
          body = this.merge(base, mus, d1, d2, groove1, groove2);
          merged = true;
        }
        if (P[o + P_OP] === OP_SUB) body = smax(body, -d, P[o + P_K]);
        else body = smin(body, d, P[o + P_K]);
      }
    }
    if (!merged) body = this.merge(base, mus, d1, d2, groove1, groove2);
    let surface = 0;
    let result = body;
    const hb = this.hairBox;
    if (this.hairRegion && hb && x > hb.min[0] && y > hb.min[1] && z > hb.min[2] && x < hb.max[0] && y < hb.max[1] && z < hb.max[2]) {
      const h = smax(body - this.hairThickness, this.hairRegion(x, y, z), 0.4);
      if (h < result) {
        result = h;
        surface = 1;
      }
    }
    const sb = this.shortsBox;
    if (this.shortsRegion && sb && x > sb.min[0] && y > sb.min[1] && z > sb.min[2] && x < sb.max[0] && y < sb.max[1] && z < sb.max[2]) {
      const draped = smin(body, fill, 2.2);
      const s = smax(draped - this.shortsThickness, this.shortsRegion(x, y, z), 0.5);
      if (s < result) {
        result = s;
        surface = 2;
      }
    }
    if (out) {
      l1 = this.tl1;
      l2 = this.tl2;
      lg1 = this.tg1;
      lg2 = this.tg2;
      out.count = this.outN;
      out.d = result;
      out.surface = surface;
      out.line = lg2 < 0 || l1 > 1.5 ? 99 : (l2 - l1) * (lg1 < lg2 ? 1 : -1);
      this.tl1 = this.tl2 = BIG;
      this.tg1 = this.tg2 = -1;
      this.out = null;
    }
    return result;
  }

  // Ink-line tracker (detail pass only).
  private tl1 = BIG;
  private tl2 = BIG;
  private tg1 = -1;
  private tg2 = -1;

  private trackLine(g: number, d: number) {
    if (g < 0) return;
    if (d < this.tl1) {
      if (g !== this.tg1) {
        this.tl2 = this.tl1;
        this.tg2 = this.tg1;
      }
      this.tl1 = d;
      this.tg1 = g;
    } else if (d < this.tl2 && g !== this.tg1) {
      this.tl2 = d;
      this.tg2 = g;
    }
  }

  private merge(base: number, mus: number, d1: number, d2: number, groove1: number, groove2: number) {
    let body = smin(base, mus, this.muscleBlend);
    if (d2 < BIG && d1 < 2) {
      // Carve a groove along the seam between two muscle groups.
      const depth = Math.min(groove1, groove2);
      if (depth > 0) {
        const w = this.grooveWidth;
        const s = (d2 - d1) / w;
        body += depth * Math.exp(-s * s) * (d1 < 0.5 ? 1 : Math.max(0, 1 - (d1 - 0.5) / 1.5));
      }
    }
    return body;
  }

  /** Allocates a scratch Detail large enough for any bin (including loft bumps). */
  makeDetail(): Detail {
    let max = 0;
    for (let b = 0; b + 1 < this.binStart.length; b++) {
      let n = 0;
      for (let j = this.binStart[b]; j < this.binStart[b + 1]; j++) {
        const i = this.binPrims[j];
        n += 1 + (this.P[i * STRIDE + P_TYPE] === T_LOFT ? this.P[i * STRIDE + G + 16] : 0);
      }
      max = Math.max(max, n);
    }
    return {
      d: 0,
      count: 0,
      prims: new Int32Array(max),
      dists: new Float64Array(max),
      ts: new Float64Array(max),
      dirs: new Float64Array(max * 3),
      surface: 0,
      line: 99,
    };
  }

  layerOf(i: number) {
    return this.P[i * STRIDE + P_LAYER];
  }

  opOf(i: number) {
    return this.P[i * STRIDE + P_OP];
  }

  /** Statistics for tuning: average candidates per bin that contain any. */
  stats() {
    let sum = 0;
    let used = 0;
    let max = 0;
    for (let b = 0; b + 1 < this.binStart.length; b++) {
      const c = this.binStart[b + 1] - this.binStart[b];
      if (c) {
        sum += c;
        used++;
        max = Math.max(max, c);
      }
    }
    return { prims: this.count, bins: this.binStart.length - 1, avg: used ? sum / used : 0, max, evals: this.evals, candidates: this.candidates };
  }
}
