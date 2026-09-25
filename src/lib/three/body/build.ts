import { sculptBody } from "./anatomy";
import { Chains, type BindInfo } from "./chains";
import { polygonize, type Region, type RegionMesh } from "./mesher";
import { L_SHORTS_FILL, MAT_HAIR, MAT_SHORTS, MAT_SKIN, OP_SUB, L_MUSCLE, type Detail, type Sculpt, type V3 } from "./sdf";
import { A_HAND, BONE_COUNT, BoneSolver, B_HEAD, L_FOOT, armBone, bindFrames, legBone, mirrorBone, type BindFrame } from "./skeleton";
import { MUSCLE_INDEX_GLUTES } from "./muscle-index";

/**
 * Generates the body mesh: sculpt → surface nets per region → baked vertex
 * attributes → mirrored to both sides. Pure computation (no DOM, no GPU),
 * so it can run anywhere; the result is cached by the caller.
 */

export interface BodyData {
  /** Bind-pose positions in metres. */
  position: Float32Array;
  normal: Float32Array;
  /** Four bone indices / weights (0..255) per vertex. */
  bones: Uint8Array;
  weights: Uint8Array;
  /** Per vertex: muscle index (255 = none), material, fibre strength, tendon (0..255). */
  info: Uint8Array;
  /** Per vertex: fibre direction in bind space (xyz, −127..127), fibre scale code. */
  fibre: Int8Array;
  /** Per vertex: ink-line field (cm), baked ambient occlusion, tone variation, curvature. */
  extra: Float32Array;
  index: Uint32Array;
  /** Bind matrices (column-major, metres) of every bone. */
  bind: Float32Array;
  stats: { vertices: number; triangles: number; ms: number; regions: Record<string, { v: number; t: number; ms: number }> };
}

export interface BuildOptions {
  /** Voxel sizes in cm. */
  body?: number;
  head?: number;
  hand?: number;
  foot?: number;
}

const DEFAULTS: Required<BuildOptions> = { body: 0.72, head: 0.34, hand: 0.25, foot: 0.34 };

const HAND_SEAM = 1.5;
const HEAD_SEAM = -0.5;
const FOOT_SEAM = 7;
const OVERLAP = 0.7;

interface Baked {
  mesh: RegionMesh;
  bones: Uint8Array;
  weights: Uint8Array;
  info: Uint8Array;
  fibre: Int8Array;
  extra: Float32Array;
  /** Whether this region is mirrored as a whole (side-0 regions) or as a midline half. */
}

export function buildBodyData(opts: BuildOptions = {}): BodyData {
  const o = { ...DEFAULTS, ...opts };
  const t0 = now();
  const frames = bindFrames();
  const solver = new BoneSolver();
  const j = solver.joints;
  const c = (v: { x: number; y: number; z: number }): V3 => [v.x * 100, v.y * 100, v.z * 100];
  const bindInfo: BindInfo = {
    pelvis: c(j.pelvis),
    chest: c(j.chest),
    head: c(j.head),
    sides: j.sides.map((s) => ({ shoulder: c(s.shoulder), elbow: c(s.elbow), wrist: c(s.wrist), hip: c(s.hip), knee: c(s.knee), ankle: c(s.ankle) })),
  };
  const chains = new Chains(bindInfo, frames);
  const sculpt = sculptBody(frames);
  sculpt.finalize(2.5);
  const baker = new Baker(sculpt, chains);

  const inHand = (x: number, y: number, z: number, off: number) => {
    const a = chains.armCoord(0, x, y, z);
    return a > chains.wristA + HAND_SEAM + off && a < chains.wristA + 30 && chains.armRadius(0, x, y, z, a) < 13;
  };
  const inHead = (x: number, y: number, z: number, off: number) => y > 150 && Math.abs(z) < 14 && chains.headCoord(x, y, z) > HEAD_SEAM + off;
  const ankle = bindInfo.sides[0].ankle;
  const inFoot = (x: number, y: number, z: number, off: number) =>
    y < ankle[1] + 8 && Math.abs(z - ankle[2]) < 9 && chains.footCoord(0, x, y, z) > FOOT_SEAM + off;

  const hf = frames[armBone(0, A_HAND)];
  const ff = frames[legBone(0, L_FOOT)];
  const hd = frames[B_HEAD];
  const regions: Region[] = [
    {
      name: "body",
      origin: [-19, -1.5, 0],
      axes: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      size: [46, 197, 72],
      h: o.body,
      midline: true,
      keep: (x, y, z) => !inHand(x, y, z, OVERLAP) && !inHead(x, y, z, OVERLAP) && !inFoot(x, y, z, OVERLAP),
    },
    {
      name: "head",
      origin: [hd.o[0] - 13, hd.o[1] - 20, 0],
      axes: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      size: [27, 34, 11.5],
      h: o.head,
      midline: true,
      keep: (x, y, z) => inHead(x, y, z, -OVERLAP),
    },
    {
      name: "hand",
      // Hand frame: x palmar, y along, z towards the little finger (side 0).
      origin: add3(hf.o, [-4 * hf.x[0] - 1 * hf.y[0] - 10 * hf.z[0], -4 * hf.x[1] - 1 * hf.y[1] - 10 * hf.z[1], -4 * hf.x[2] - 1 * hf.y[2] - 10 * hf.z[2]]),
      axes: [hf.x, hf.y, hf.z],
      size: [11, 22.5, 16.5],
      h: o.hand,
      midline: false,
      keep: (x, y, z) => inHand(x, y, z, -OVERLAP),
    },
    {
      name: "foot",
      origin: add3(ff.o, [5 * ff.x[0] - 7 * ff.y[0] - 6.5 * ff.z[0], 5 * ff.x[1] - 7 * ff.y[1] - 6.5 * ff.z[1], 5 * ff.x[2] - 7 * ff.y[2] - 6.5 * ff.z[2]]),
      axes: [ff.x, ff.y, ff.z],
      size: [17.5, 11, 13],
      h: o.foot,
      midline: false,
      keep: (x, y, z) => inFoot(x, y, z, -OVERLAP),
    },
  ];

  const stats: BodyData["stats"] = { vertices: 0, triangles: 0, ms: 0, regions: {} };
  const baked: Baked[] = [];
  for (const r of regions) {
    const t = now();
    const mesh = polygonize(sculpt, r);
    const b = baker.bake(mesh);
    baked.push(b);
    stats.regions[r.name] = { v: mesh.vertexCount * 2, t: 0, ms: Math.round(now() - t) };
  }

  // Assemble: each region contributes its vertices and their mirror images.
  let nv = 0;
  let nt = 0;
  for (const b of baked) {
    nv += b.mesh.vertexCount * 2;
    nt += b.mesh.tris.length * 2 + b.mesh.midTris.length;
  }
  const position = new Float32Array(nv * 3);
  const normal = new Float32Array(nv * 3);
  const bones = new Uint8Array(nv * 4);
  const weights = new Uint8Array(nv * 4);
  const info = new Uint8Array(nv * 4);
  const fibre = new Int8Array(nv * 4);
  const extra = new Float32Array(nv * 4);
  const index = new Uint32Array(nt);
  let vo = 0;
  let to = 0;
  baked.forEach((b, ri) => {
    const m = b.mesh;
    const n = m.vertexCount;
    for (let v = 0; v < n; v++) {
      for (const [dst, mir] of [
        [vo + v, false],
        [vo + n + v, true],
      ] as [number, boolean][]) {
        const zs = mir ? -1 : 1;
        position[dst * 3] = m.pos[v * 3] / 100;
        position[dst * 3 + 1] = m.pos[v * 3 + 1] / 100;
        position[dst * 3 + 2] = (zs * m.pos[v * 3 + 2]) / 100;
        normal[dst * 3] = m.nrm[v * 3];
        normal[dst * 3 + 1] = m.nrm[v * 3 + 1];
        normal[dst * 3 + 2] = zs * m.nrm[v * 3 + 2];
        for (let k = 0; k < 4; k++) {
          bones[dst * 4 + k] = mir ? mirrorBone(b.bones[v * 4 + k]) : b.bones[v * 4 + k];
          weights[dst * 4 + k] = b.weights[v * 4 + k];
          info[dst * 4 + k] = b.info[v * 4 + k];
          extra[dst * 4 + k] = b.extra[v * 4 + k];
        }
        fibre[dst * 4] = b.fibre[v * 4];
        fibre[dst * 4 + 1] = b.fibre[v * 4 + 1];
        fibre[dst * 4 + 2] = zs * b.fibre[v * 4 + 2];
        fibre[dst * 4 + 3] = b.fibre[v * 4 + 3];
      }
    }
    const tr = m.tris;
    for (let t = 0; t < tr.length; t += 3) {
      index[to++] = vo + tr[t];
      index[to++] = vo + tr[t + 1];
      index[to++] = vo + tr[t + 2];
    }
    for (let t = 0; t < tr.length; t += 3) {
      // Mirror image with flipped winding (index ≥ n already means "mirror" for midline tris only).
      index[to++] = vo + n + tr[t];
      index[to++] = vo + n + tr[t + 2];
      index[to++] = vo + n + tr[t + 1];
    }
    const mt = m.midTris;
    for (let t = 0; t < mt.length; t++) index[to++] = vo + mt[t];
    stats.regions[regions[ri].name].t = (tr.length * 2 + mt.length) / 3;
    vo += n * 2;
  });

  const bind = new Float32Array(BONE_COUNT * 16);
  solver.matrices.forEach((mat, i) => bind.set(mat.elements, i * 16));
  stats.vertices = nv;
  stats.triangles = nt / 3;
  stats.ms = Math.round(now() - t0);
  return { position, normal, bones, weights, info, fibre, extra, index: index.subarray(0, to), bind, stats };
}

function add3(a: V3, b: V3): V3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

const smooth = (a: number, b: number, x: number) => {
  if (b <= a) return x < a ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Cheap smooth 3D value noise in [-1, 1]. */
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const hsh = (a: number, b: number, c: number) => {
    let n = (a * 374761393 + b * 668265263 + c * 1274126177) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) & 0xffff) / 32767.5 - 1;
  };
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(hsh(xi, yi, zi), hsh(xi + 1, yi, zi), u), l(hsh(xi, yi + 1, zi), hsh(xi + 1, yi + 1, zi), u), v),
    l(l(hsh(xi, yi, zi + 1), hsh(xi + 1, yi, zi + 1), u), l(hsh(xi, yi + 1, zi + 1), hsh(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}

class Baker {
  private D: Detail;
  private acc = new Float64Array(BONE_COUNT);
  private chainW = new Float64Array(32);
  private muscleW = new Float64Array(32);
  private matW = new Float64Array(8);

  constructor(
    private sculpt: Sculpt,
    private chains: Chains,
  ) {
    this.D = sculpt.makeDetail();
  }

  bake(mesh: RegionMesh): Baked {
    const n = mesh.vertexCount;
    const bones = new Uint8Array(n * 4);
    const weights = new Uint8Array(n * 4);
    const info = new Uint8Array(n * 4);
    const fibre = new Int8Array(n * 4);
    const extra = new Float32Array(n * 4);
    const S = this.sculpt;
    const D = this.D;
    const meta = S.meta;
    for (let v = 0; v < n; v++) {
      const x = mesh.pos[v * 3];
      const y = mesh.pos[v * 3 + 1];
      const z = mesh.pos[v * 3 + 2];
      const nx = mesh.nrm[v * 3];
      const ny = mesh.nrm[v * 3 + 1];
      const nz = mesh.nrm[v * 3 + 2];
      S.detail(x, y, z, D);

      // Nearest candidate among surface-forming primitives.
      let dmin = 1e9;
      for (let c = 0; c < D.count; c++) {
        const i = D.prims[c];
        if (S.opOf(i) === OP_SUB || S.layerOf(i) === L_SHORTS_FILL) continue;
        if (D.dists[c] < dmin) dmin = D.dists[c];
      }

      this.chainW.fill(0);
      this.muscleW.fill(0);
      this.matW.fill(0);
      let noneW = 0;
      let fx = 0;
      let fy = 0;
      let fz = 0;
      let fibreSum = 0;
      let tendonSum = 0;
      let wSumF = 0;
      for (let c = 0; c < D.count; c++) {
        const i = D.prims[c];
        if (S.opOf(i) === OP_SUB || S.layerOf(i) === L_SHORTS_FILL) continue;
        const m = meta[i];
        const dd = D.dists[c] - dmin;
        const t = D.ts[c];
        // Chains.
        const wc = Math.exp(-dd / 0.9);
        if (wc > 1e-4) {
          const beta = m.chainA === m.chainB ? 0 : smooth(m.chainT0, m.chainT1, t);
          this.chainW[m.chainA] += wc * (1 - beta);
          this.chainW[m.chainB] += wc * beta;
        }
        // Muscle / material identity.
        const wm = Math.exp(-dd / 0.3);
        if (m.muscle >= 0) this.muscleW[m.muscle] += wm;
        else noneW += S.layerOf(i) === L_MUSCLE ? wm : wm * 0.4;
        this.matW[m.material] += wm;
        // Fibres.
        const wf = Math.exp(-dd / 0.45);
        if (wf > 1e-3) {
          let tendon = 0;
          if (m.tendon[0] > 0 && t < m.tendon[0]) tendon = 1 - smooth(m.tendon[0] * 0.45, m.tendon[0], t);
          if (m.tendon[1] > 0 && t > 1 - m.tendon[1]) tendon = Math.max(tendon, smooth(1 - m.tendon[1], 1 - m.tendon[1] * 0.45, t));
          wSumF += wf;
          tendonSum += wf * tendon;
          if (S.layerOf(i) === L_MUSCLE || m.fibre > 0) {
            fibreSum += wf * m.fibre * (1 - tendon);
            let dx: number;
            let dy: number;
            let dz: number;
            if (m.fibreTo) {
              dx = m.fibreTo[0] - x;
              dy = m.fibreTo[1] - y;
              dz = m.fibreTo[2] - z;
              const l = Math.hypot(dx, dy, dz) || 1;
              dx /= l;
              dy /= l;
              dz /= l;
            } else if (m.fibreDir) {
              [dx, dy, dz] = m.fibreDir;
            } else {
              dx = D.dirs[c * 3];
              dy = D.dirs[c * 3 + 1];
              dz = D.dirs[c * 3 + 2];
            }
            const s = dx * fx + dy * fy + dz * fz < 0 ? -1 : 1;
            fx += s * wf * dx;
            fy += s * wf * dy;
            fz += s * wf * dz;
          }
        }
      }

      // Bone weights.
      this.acc.fill(0);
      let chainTotal = 0;
      for (let ch = 0; ch < this.chainW.length; ch++) chainTotal += this.chainW[ch];
      for (let ch = 0; ch < this.chainW.length; ch++) {
        const w = this.chainW[ch] / (chainTotal || 1);
        if (w > 0.002) this.chains.add(ch, x, y, z, w, this.acc);
      }
      writeTop4(this.acc, bones, weights, v * 4);

      // Identity.
      let muscle = 255;
      let best = noneW;
      for (let mi = 0; mi < this.muscleW.length; mi++) {
        if (this.muscleW[mi] > best) {
          best = this.muscleW[mi];
          muscle = mi;
        }
      }
      let material = MAT_SKIN;
      let bm = 0;
      for (let k = 0; k < this.matW.length; k++) {
        if (this.matW[k] > bm) {
          bm = this.matW[k];
          material = k;
        }
      }
      let line = D.line;
      if (D.surface === 1) {
        material = MAT_HAIR;
        muscle = 255;
        line = 99;
      } else if (D.surface === 2) {
        material = MAT_SHORTS;
        muscle = muscle === MUSCLE_INDEX_GLUTES ? muscle : 255;
        line = 99;
      }
      const tendon = wSumF > 0 ? tendonSum / wSumF : 0;
      let fibreStrength = wSumF > 0 ? fibreSum / wSumF : 0;
      // Fibre direction projected onto the surface.
      const fd = fx * nx + fy * ny + fz * nz;
      fx -= nx * fd;
      fy -= ny * fd;
      fz -= nz * fd;
      const fl = Math.hypot(fx, fy, fz);
      if (fl < 1e-4) {
        fibreStrength = 0;
        fx = 0;
        fy = 1;
        fz = 0;
      } else {
        fx /= fl;
        fy /= fl;
        fz /= fl;
      }
      if (material !== MAT_SKIN) fibreStrength = material === MAT_HAIR || material === MAT_SHORTS ? 1 : 0;
      if (material === MAT_HAIR) {
        // Hair flows back and down from the crown.
        const hd = this.chains.frame(B_HEAD).o;
        let hx = x - hd[0] + 3;
        let hy = y - hd[1] - 12;
        let hz = z - hd[2];
        const hl = Math.hypot(hx, hy, hz) || 1;
        hx /= hl;
        hy /= hl;
        hz /= hl;
        const dd = hx * nx + hy * ny + hz * nz;
        fx = hx - nx * dd;
        fy = hy - ny * dd;
        fz = hz - nz * dd;
        const l2 = Math.hypot(fx, fy, fz) || 1;
        fx /= l2;
        fy /= l2;
        fz /= l2;
      } else if (material === MAT_SHORTS) {
        // Knit runs around the body.
        fx = -nz;
        fy = 0;
        fz = nx;
        const l2 = Math.hypot(fx, fz) || 1;
        fx /= l2;
        fz /= l2;
      }
      info[v * 4] = muscle;
      info[v * 4 + 1] = material;
      info[v * 4 + 2] = Math.round(Math.min(1, Math.max(0, fibreStrength)) * 255);
      info[v * 4 + 3] = Math.round(Math.min(1, Math.max(0, tendon)) * 255);
      fibre[v * 4] = Math.round(fx * 127);
      fibre[v * 4 + 1] = Math.round(fy * 127);
      fibre[v * 4 + 2] = Math.round(fz * 127);
      fibre[v * 4 + 3] = material;

      // Ambient occlusion from the distance field along the normal.
      let occ = 0;
      const steps = [0.8, 1.8, 3.4, 6];
      const ws = [0.45, 0.3, 0.18, 0.1];
      for (let s = 0; s < 4; s++) {
        const dl = steps[s];
        const d = S.eval(x + nx * dl, y + ny * dl, z + nz * dl);
        occ += (ws[s] * Math.max(0, dl - Math.max(0, d))) / dl;
      }
      extra[v * 4] = Math.max(-99, Math.min(99, line));
      extra[v * 4 + 1] = Math.max(0, 1 - occ * 1.25);
      extra[v * 4 + 2] = noise3(x * 0.09, y * 0.09, z * 0.09) * 0.7 + noise3(x * 0.3, y * 0.3, z * 0.3) * 0.3;
      extra[v * 4 + 3] = 0;
    }
    return { mesh, bones, weights, info, fibre, extra };
  }
}

/** Keeps the four largest weights, quantised to bytes that sum to 255. */
function writeTop4(acc: Float64Array, bones: Uint8Array, weights: Uint8Array, o: number) {
  const idx = [0, 0, 0, 0];
  const w = [0, 0, 0, 0];
  for (let b = 0; b < acc.length; b++) {
    const val = acc[b];
    if (val <= w[3]) continue;
    let k = 3;
    while (k > 0 && val > w[k - 1]) {
      w[k] = w[k - 1];
      idx[k] = idx[k - 1];
      k--;
    }
    w[k] = val;
    idx[k] = b;
  }
  const sum = w[0] + w[1] + w[2] + w[3] || 1;
  let left = 255;
  for (let k = 0; k < 4; k++) {
    const q = k === 3 ? left : Math.min(left, Math.round((w[k] / sum) * 255));
    bones[o + k] = idx[k];
    weights[o + k] = q;
    left -= q;
  }
  if (sum === 1 && w[0] === 0) {
    bones[o] = 0;
    weights[o] = 255;
  }
}

export type { BindFrame };
