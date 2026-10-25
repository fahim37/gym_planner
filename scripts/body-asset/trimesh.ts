/**
 * Triangle-mesh tools for the offline body builders: a minimal GLB reader, a planar crop,
 * quadric-error decimation, tangential relaxation (re-projected onto the source surface)
 * and the pairing of triangles into quads (a maximum matching of the dual graph).
 */
import { readFileSync } from "node:fs";

export type V3 = [number, number, number];

export interface TriMesh {
  pos: Float64Array;
  tri: Uint32Array;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3) => Math.sqrt(dot(a, a));
const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const vtx =(pos: ArrayLike<number>, i: number): V3 => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];

// ---------------------------------------------------------------------------
// GLB

/** Reads the first primitive of the first mesh, with its node's rotation and translation applied. */
export function readGlb(path: string): TriMesh {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path} is not a GLB file`);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const bin = 20 + jsonLen + 8;
  const accessor = (i: number) => {
    const a = gltf.accessors[i];
    const view = gltf.bufferViews[a.bufferView];
    const off = bin + (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const comps = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[a.type];
    const count = a.count * comps;
    const out = new Float64Array(count);
    for (let k = 0; k < count; k++) {
      if (a.componentType === 5126) out[k] = buf.readFloatLE(off + k * 4);
      else if (a.componentType === 5125) out[k] = buf.readUInt32LE(off + k * 4);
      else if (a.componentType === 5123) out[k] = buf.readUInt16LE(off + k * 2);
      else throw new Error(`unsupported component type ${a.componentType}`);
    }
    return out;
  };
  const meshNode = gltf.nodes.find((n: { mesh?: number }) => n.mesh === 0) ?? {};
  const prim = gltf.meshes[0].primitives[0];
  const raw = accessor(prim.attributes.POSITION);
  const [qx, qy, qz, qw] = (meshNode.rotation as number[] | undefined) ?? [0, 0, 0, 1];
  const t = (meshNode.translation as number[] | undefined) ?? [0, 0, 0];
  const pos = new Float64Array(raw.length);
  for (let i = 0; i < raw.length; i += 3) {
    const [x, y, z] = [raw[i], raw[i + 1], raw[i + 2]];
    // v' = q v q*
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    pos[i] = ix * qw - iw * qx - iy * qz + iz * qy + t[0];
    pos[i + 1] = iy * qw - iw * qy - iz * qx + ix * qz + t[1];
    pos[i + 2] = iz * qw - iw * qz - ix * qy + iy * qx + t[2];
  }
  return { pos, tri: Uint32Array.from(accessor(prim.indices)) };
}

// ---------------------------------------------------------------------------
// Crop

/**
 * Keeps the part of the mesh where `f(p) ≥ 0`, splitting the triangles that cross the zero
 * level (linear interpolation along their edges), so the new boundary lies on it. Only the
 * largest connected piece is kept.
 */
export function crop(m: TriMesh, f: (p: V3) => number): TriMesh {
  const n = m.pos.length / 3;
  const val = new Float64Array(n);
  for (let i = 0; i < n; i++) val[i] = f(vtx(m.pos, i));
  const pos: number[] = [];
  const remap = new Int32Array(n).fill(-1);
  const keep = (i: number) => {
    if (remap[i] < 0) {
      remap[i] = pos.length / 3;
      pos.push(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]);
    }
    return remap[i];
  };
  const cut = new Map<string, number>();
  const cutAt = (a: number, b: number) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    let id = cut.get(key);
    if (id === undefined) {
      const s = val[a] / (val[a] - val[b]);
      id = pos.length / 3;
      for (let c = 0; c < 3; c++) pos.push(m.pos[a * 3 + c] + s * (m.pos[b * 3 + c] - m.pos[a * 3 + c]));
      cut.set(key, id);
    }
    return id;
  };
  const tri: number[] = [];
  for (let t = 0; t < m.tri.length; t += 3) {
    const v = [m.tri[t], m.tri[t + 1], m.tri[t + 2]];
    const inside = v.map((i) => val[i] >= 0);
    const nIn = inside.filter(Boolean).length;
    if (nIn === 0) continue;
    if (nIn === 3) {
      tri.push(keep(v[0]), keep(v[1]), keep(v[2]));
      continue;
    }
    // Rotate so the odd vertex comes first.
    const odd = nIn === 1 ? inside.indexOf(true) : inside.indexOf(false);
    const a = v[odd];
    const b = v[(odd + 1) % 3];
    const c = v[(odd + 2) % 3];
    const ab = cutAt(a, b);
    const ac = cutAt(a, c);
    if (nIn === 1) tri.push(keep(a), ab, ac);
    else tri.push(ab, keep(b), keep(c), ab, keep(c), ac);
  }
  return largestComponent(dropSlivers({ pos: Float64Array.from(pos), tri: Uint32Array.from(tri) }));
}

/** Collapses the near-zero-length edges a crop leaves where it grazes a vertex. */
function dropSlivers(m: TriMesh, eps = 1e-7): TriMesh {
  const n = m.pos.length / 3;
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let t = 0; t < m.tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = find(m.tri[t + k]);
      const b = find(m.tri[t + ((k + 1) % 3)]);
      if (a !== b && len(sub(vtx(m.pos, a), vtx(m.pos, b))) < eps) parent[Math.max(a, b)] = Math.min(a, b);
    }
  const tri: number[] = [];
  for (let t = 0; t < m.tri.length; t += 3) {
    const [a, b, c] = [find(m.tri[t]), find(m.tri[t + 1]), find(m.tri[t + 2])];
    if (a !== b && b !== c && a !== c) tri.push(a, b, c);
  }
  return compact({ pos: m.pos, tri: Uint32Array.from(tri) });
}

/** Drops unreferenced vertices. */
export function compact(m: TriMesh): TriMesh {
  const n = m.pos.length / 3;
  const remap = new Int32Array(n).fill(-1);
  const pos: number[] = [];
  const tri = new Uint32Array(m.tri.length);
  for (let k = 0; k < m.tri.length; k++) {
    const i = m.tri[k];
    if (remap[i] < 0) {
      remap[i] = pos.length / 3;
      pos.push(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]);
    }
    tri[k] = remap[i];
  }
  return { pos: Float64Array.from(pos), tri };
}

/** The connected piece (through shared vertices) with the most triangles. */
export function largestComponent(m: TriMesh): TriMesh {
  const n = m.pos.length / 3;
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let t = 0; t < m.tri.length; t += 3) {
    const a = find(m.tri[t]);
    for (let k = 1; k < 3; k++) {
      const b = find(m.tri[t + k]);
      if (a !== b) parent[b] = a;
    }
  }
  const count = new Map<number, number>();
  for (let t = 0; t < m.tri.length; t += 3) {
    const r = find(m.tri[t]);
    count.set(r, (count.get(r) ?? 0) + 1);
  }
  const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const tri: number[] = [];
  for (let t = 0; t < m.tri.length; t += 3) if (find(m.tri[t]) === best) tri.push(m.tri[t], m.tri[t + 1], m.tri[t + 2]);
  return compact({ pos: m.pos, tri: Uint32Array.from(tri) });
}

// ---------------------------------------------------------------------------
// Topology helpers

/** Undirected edge key. */
const ekey = (a: number, b: number) => (a < b ? a * 4194304 + b : b * 4194304 + a);

/** Boundary edges as directed pairs (in the direction their triangle walks them). */
export function boundaryEdges(tri: ArrayLike<number>): [number, number][] {
  const count = new Map<number, number>();
  for (let t = 0; t < tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const key = ekey(tri[t + k], tri[t + ((k + 1) % 3)]);
      count.set(key, (count.get(key) ?? 0) + 1);
    }
  const out: [number, number][] = [];
  for (let t = 0; t < tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = tri[t + k];
      const b = tri[t + ((k + 1) % 3)];
      if (count.get(ekey(a, b)) === 1) out.push([a, b]);
    }
  return out;
}

/** Boundary loops (vertex lists, in the triangles' walking direction). */
export function boundaryLoops(tri: ArrayLike<number>): number[][] {
  const next = new Map<number, number>();
  for (const [a, b] of boundaryEdges(tri)) {
    if (next.has(a)) throw new Error(`non-manifold boundary at vertex ${a}`);
    next.set(a, b);
  }
  const seen = new Set<number>();
  const loops: number[][] = [];
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop: number[] = [];
    let v = start;
    while (!seen.has(v)) {
      seen.add(v);
      loop.push(v);
      v = next.get(v)!;
    }
    loops.push(loop);
  }
  return loops;
}

// ---------------------------------------------------------------------------
// Quadric-error decimation (Garland & Heckbert), area weighted, boundary preserving.

class Heap {
  private cost: number[] = [];
  private item: number[] = [];
  get size() {
    return this.cost.length;
  }
  push(c: number, it: number) {
    let i = this.cost.length;
    this.cost.push(c);
    this.item.push(it);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cost[p] <= c) break;
      this.cost[i] = this.cost[p];
      this.item[i] = this.item[p];
      i = p;
    }
    this.cost[i] = c;
    this.item[i] = it;
  }
  pop(): [number, number] {
    const top: [number, number] = [this.cost[0], this.item[0]];
    const c = this.cost.pop()!;
    const it = this.item.pop()!;
    const n = this.cost.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let k = 2 * i + 1;
        if (k >= n) break;
        if (k + 1 < n && this.cost[k + 1] < this.cost[k]) k++;
        if (this.cost[k] >= c) break;
        this.cost[i] = this.cost[k];
        this.item[i] = this.item[k];
        i = k;
      }
      this.cost[i] = c;
      this.item[i] = it;
    }
    return top;
  }
}

/**
 * Decimates to about `target` triangles. Collapses never flip or squash a triangle, keep
 * the surface manifold and move boundary vertices only along the boundary. `weight` scales
 * the error of the surface near a point (> 1 keeps it finer); `boundaryWeight` the error of
 * leaving the boundary's line (lower thins the boundary out more). Afterwards the boundary
 * is thinned to at most `boundaryTarget` vertices.
 */
export function decimate(m: TriMesh, target: number, weight: (p: V3) => number = () => 1, boundaryWeight = 100, boundaryTarget = Infinity): TriMesh {
  const n = m.pos.length / 3;
  const P = Float64Array.from(m.pos);
  const T = Int32Array.from(m.tri);
  const nt = T.length / 3;
  const alive = new Uint8Array(nt).fill(1);
  const vAlive = new Uint8Array(n).fill(1);
  const stamp = new Uint32Array(n);
  const vt: number[][] = Array.from({ length: n }, () => []);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) vt[T[t * 3 + k]].push(t);
  const Q = new Float64Array(n * 10);
  const addPlane = (v: number, nx: number, ny: number, nz: number, d: number, w: number) => {
    const q = v * 10;
    Q[q] += w * nx * nx;
    Q[q + 1] += w * nx * ny;
    Q[q + 2] += w * nx * nz;
    Q[q + 3] += w * nx * d;
    Q[q + 4] += w * ny * ny;
    Q[q + 5] += w * ny * nz;
    Q[q + 6] += w * ny * d;
    Q[q + 7] += w * nz * nz;
    Q[q + 8] += w * nz * d;
    Q[q + 9] += w * d * d;
  };
  const faceNormal = (a: V3, b: V3, c: V3) => cross(sub(b, a), sub(c, a));
  for (let t = 0; t < nt; t++) {
    const [a, b, c] = [vtx(P, T[t * 3]), vtx(P, T[t * 3 + 1]), vtx(P, T[t * 3 + 2])];
    const fn = faceNormal(a, b, c);
    const l = len(fn);
    if (l < 1e-20) continue;
    const nn: V3 = [fn[0] / l, fn[1] / l, fn[2] / l];
    const area = (l / 2) * weight([(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]);
    for (let k = 0; k < 3; k++) addPlane(T[t * 3 + k], nn[0], nn[1], nn[2], -dot(nn, a), area);
  }
  // Boundary: a stiff plane through each boundary edge, perpendicular to its triangle.
  const isB = new Uint8Array(n);
  const bEdges = new Set<number>();
  {
    const owner = new Map<number, number>();
    const count = new Map<number, number>();
    for (let t = 0; t < nt; t++)
      for (let k = 0; k < 3; k++) {
        const key = ekey(T[t * 3 + k], T[t * 3 + ((k + 1) % 3)]);
        count.set(key, (count.get(key) ?? 0) + 1);
        owner.set(key, t);
      }
    for (const [key, c] of count) {
      if (c !== 1) continue;
      bEdges.add(key);
      const t = owner.get(key)!;
      const a = Math.floor(key / 4194304);
      const b = key % 4194304;
      isB[a] = isB[b] = 1;
      const pa = vtx(P, a);
      const e = sub(vtx(P, b), pa);
      const fn = faceNormal(vtx(P, T[t * 3]), vtx(P, T[t * 3 + 1]), vtx(P, T[t * 3 + 2]));
      const bn = cross(e, fn);
      const l = len(bn);
      if (l < 1e-20) continue;
      const nn: V3 = [bn[0] / l, bn[1] / l, bn[2] / l];
      const w = boundaryWeight * dot(e, e);
      addPlane(a, nn[0], nn[1], nn[2], -dot(nn, pa), w);
      addPlane(b, nn[0], nn[1], nn[2], -dot(nn, pa), w);
    }
  }
  const qerr = (q: Float64Array, p: V3) => {
    const [x, y, z] = p;
    return q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x + q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y + q[7] * z * z + 2 * q[8] * z + q[9];
  };
  const qsum = new Float64Array(10);
  const neighbours = (v: number) => {
    const s = new Set<number>();
    for (const t of vt[v]) for (let k = 0; k < 3; k++) if (T[t * 3 + k] !== v) s.add(T[t * 3 + k]);
    return s;
  };
  /** Best position for collapsing edge a–b, and its cost. */
  const plan = (a: number, b: number): [number, V3] => {
    for (let k = 0; k < 10; k++) qsum[k] = Q[a * 10 + k] + Q[b * 10 + k];
    const pa = vtx(P, a);
    const pb = vtx(P, b);
    const cands: V3[] = [];
    if (isB[a] && !isB[b]) cands.push(pa);
    else if (isB[b] && !isB[a]) cands.push(pb);
    else {
      if (!isB[a]) {
        // Solve the 3×3 system for the minimiser.
        const [q0, q1, q2, q3, q4, q5, q6, q7, q8] = qsum;
        const det = q0 * (q4 * q7 - q5 * q5) - q1 * (q1 * q7 - q5 * q2) + q2 * (q1 * q5 - q4 * q2);
        if (Math.abs(det) > 1e-12 * (q0 * q4 * q7 + 1e-30)) {
          const x = (-q3 * (q4 * q7 - q5 * q5) + q1 * (q6 * q7 - q5 * q8) - q2 * (q6 * q5 - q4 * q8)) / det;
          const y = (q0 * (-q6 * q7 + q5 * q8) + q3 * (q1 * q7 - q5 * q2) - q2 * (q1 * q8 - q6 * q2)) / det;
          const z = (q0 * (-q4 * q8 + q6 * q5) - q1 * (-q1 * q8 + q6 * q2) - q3 * (q1 * q5 - q4 * q2)) / det;
          const p: V3 = [x, y, z];
          // Accept only if it stays near the edge (ill-conditioned quadrics shoot far away).
          const el = len(sub(pb, pa));
          if (len(sub(p, pa)) < 2 * el + 1e-12 && len(sub(p, pb)) < 2 * el + 1e-12) cands.push(p);
        }
      }
      cands.push(pa, pb, [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2]);
    }
    let best = cands[0];
    let bc = Infinity;
    for (const c of cands) {
      const e = qerr(qsum, c);
      if (e < bc) {
        bc = e;
        best = c;
      }
    }
    return [Math.max(0, bc), best];
  };
  /** Whether moving a and b to p keeps every surviving triangle sound. */
  const valid = (a: number, b: number, p: V3) => {
    if (isB[a] && isB[b] && !bEdges.has(ekey(a, b))) return false;
    // Link condition.
    const na = neighbours(a);
    const nb = neighbours(b);
    let common = 0;
    for (const v of na) if (nb.has(v)) common++;
    let shared = 0;
    for (const t of vt[a]) if (T[t * 3] === b || T[t * 3 + 1] === b || T[t * 3 + 2] === b) shared++;
    if (common !== shared) return false;
    for (const v of [a, b])
      for (const t of vt[v]) {
        const ids = [T[t * 3], T[t * 3 + 1], T[t * 3 + 2]];
        if (ids.includes(a) && ids.includes(b)) continue;
        const before = ids.map((i) => vtx(P, i));
        const after = ids.map((i) => (i === a || i === b ? p : vtx(P, i)));
        const n0 = faceNormal(before[0], before[1], before[2]);
        const n1 = faceNormal(after[0], after[1], after[2]);
        const l0 = len(n0);
        const l1 = len(n1);
        if (l1 < 1e-20) return false;
        if (l0 > 1e-20 && dot(n0, n1) / (l0 * l1) < 0.3) return false;
        // No needles: area relative to the longest edge².
        const e = Math.max(...[0, 1, 2].map((k) => dot(sub(after[(k + 1) % 3], after[k]), sub(after[(k + 1) % 3], after[k]))));
        if (l1 / e < 0.06) return false;
      }
    return true;
  };
  const heap = new Heap();
  // Pending collapses: [a, b, stamp a, stamp b].
  const pend: number[] = [];
  const enqueue = (a: number, b: number) => {
    const [c] = plan(a, b);
    const id = pend.length / 4;
    pend.push(a, b, stamp[a], stamp[b]);
    heap.push(c, id);
  };
  {
    const done = new Set<number>();
    for (let t = 0; t < nt; t++)
      for (let k = 0; k < 3; k++) {
        const a = T[t * 3 + k];
        const b = T[t * 3 + ((k + 1) % 3)];
        const key = ekey(a, b);
        if (done.has(key)) continue;
        done.add(key);
        enqueue(a, b);
      }
  }
  let live = nt;
  let nB = isB.reduce((s, x) => s + x, 0);
  /** Collapses b into a, at p. */
  const collapse = (a: number, b: number, p: V3) => {
    for (const t of vt[b]) {
      if (!alive[t]) continue;
      const ids = [T[t * 3], T[t * 3 + 1], T[t * 3 + 2]];
      if (ids.includes(a)) {
        alive[t] = 0;
        live--;
        for (const i of ids) if (i !== b) vt[i] = vt[i].filter((x) => x !== t);
      } else {
        for (let k = 0; k < 3; k++) if (T[t * 3 + k] === b) T[t * 3 + k] = a;
        vt[a].push(t);
      }
    }
    vt[b] = [];
    vAlive[b] = 0;
    for (let k = 0; k < 10; k++) Q[a * 10 + k] += Q[b * 10 + k];
    P[a * 3] = p[0];
    P[a * 3 + 1] = p[1];
    P[a * 3 + 2] = p[2];
    if (isB[b]) {
      // The boundary edges of b now belong to a.
      for (const v of neighbours(a)) if (bEdges.has(ekey(b, v))) bEdges.add(ekey(a, v));
      nB--;
    }
    // Only the edges at a changed cost; the soundness of the others is checked when popped.
    stamp[a]++;
    for (const v of neighbours(a)) enqueue(a, v);
  };
  while (live > target && heap.size) {
    const [, id] = heap.pop();
    const a = pend[id * 4];
    const b = pend[id * 4 + 1];
    if (!vAlive[a] || !vAlive[b] || stamp[a] !== pend[id * 4 + 2] || stamp[b] !== pend[id * 4 + 3]) continue;
    const [, p] = plan(a, b);
    if (valid(a, b, p)) collapse(a, b, p);
  }
  // Thin the boundary to `boundaryTarget` vertices: shortest edges first, into their midpoints.
  while (nB > boundaryTarget) {
    let best: [number, number] | null = null;
    let bl = Infinity;
    for (const key of bEdges) {
      const a = Math.floor(key / 4194304);
      const b = key % 4194304;
      if (!vAlive[a] || !vAlive[b] || !neighbours(a).has(b)) continue;
      const l = len(sub(vtx(P, a), vtx(P, b)));
      if (l < bl && valid(a, b, mid(vtx(P, a), vtx(P, b)))) {
        bl = l;
        best = [a, b];
      }
    }
    if (!best) throw new Error(`the boundary can't be thinned below ${nB} vertices`);
    collapse(best[0], best[1], mid(vtx(P, best[0]), vtx(P, best[1])));
  }
  const tri: number[] = [];
  for (let t = 0; t < nt; t++) if (alive[t]) tri.push(T[t * 3], T[t * 3 + 1], T[t * 3 + 2]);
  return compact({ pos: P, tri: Uint32Array.from(tri) });
}

/** Thins the boundary to `count` vertices (shortest edges first), keeping the rest as is. */
export function thinBoundary(m: TriMesh, count: number): TriMesh {
  return decimate(m, m.tri.length / 3, undefined, 100, count);
}

// ---------------------------------------------------------------------------
// Closest points on a reference surface (uniform grid of triangles).

export class SurfaceIndex {
  private cells = new Map<string, number[]>();
  constructor(
    private readonly m: TriMesh,
    private readonly cell: number,
  ) {
    for (let t = 0; t < m.tri.length / 3; t++) {
      const vs = [0, 1, 2].map((k) => vtx(m.pos, m.tri[t * 3 + k]));
      const lo = [0, 1, 2].map((c) => Math.floor(Math.min(vs[0][c], vs[1][c], vs[2][c]) / cell));
      const hi = [0, 1, 2].map((c) => Math.floor(Math.max(vs[0][c], vs[1][c], vs[2][c]) / cell));
      for (let x = lo[0]; x <= hi[0]; x++)
        for (let y = lo[1]; y <= hi[1]; y++)
          for (let z = lo[2]; z <= hi[2]; z++) {
            const k = `${x},${y},${z}`;
            let l = this.cells.get(k);
            if (!l) this.cells.set(k, (l = []));
            l.push(t);
          }
    }
  }
  /** Closest surface point to p, preferring triangles facing like `n` (if given). */
  closest(p: V3, n?: V3): V3 {
    let best: V3 = p;
    let bd = Infinity;
    const c = p.map((x) => Math.floor(x / this.cell));
    for (let r = 1; r <= 3 && bd === Infinity; r++)
      for (let x = c[0] - r; x <= c[0] + r; x++)
        for (let y = c[1] - r; y <= c[1] + r; y++)
          for (let z = c[2] - r; z <= c[2] + r; z++)
            for (const t of this.cells.get(`${x},${y},${z}`) ?? []) {
              const a = vtx(this.m.pos, this.m.tri[t * 3]);
              const b = vtx(this.m.pos, this.m.tri[t * 3 + 1]);
              const cc = vtx(this.m.pos, this.m.tri[t * 3 + 2]);
              if (n && dot(cross(sub(b, a), sub(cc, a)), n) < 0) continue;
              const q = closestOnTriangle(p, a, b, cc);
              const d = len(sub(q, p));
              if (d < bd) {
                bd = d;
                best = q;
              }
            }
    return best;
  }
}

/** Closest point on triangle abc to p (Ericson, Real-Time Collision Detection 5.1.5). */
function closestOnTriangle(p: V3, a: V3, b: V3, c: V3): V3 {
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]];
  }
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]];
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])];
  }
  const den = 1 / (va + vb + vc);
  const v = vb * den;
  const w = vc * den;
  return [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
}

/** Area-weighted vertex normals. */
export function vertexNormals(m: TriMesh): V3[] {
  const n = m.pos.length / 3;
  const out: V3[] = Array.from({ length: n }, () => [0, 0, 0]);
  for (let t = 0; t < m.tri.length; t += 3) {
    const ids = [m.tri[t], m.tri[t + 1], m.tri[t + 2]];
    const [a, b, c] = ids.map((i) => vtx(m.pos, i));
    const fn = cross(sub(b, a), sub(c, a));
    for (const i of ids) for (let k = 0; k < 3; k++) out[i][k] += fn[k];
  }
  return out.map((v) => {
    const l = len(v) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  });
}

/**
 * Evens out the triangles: each interior vertex moves towards the centroid of its neighbours
 * within its tangent plane, then back onto the reference surface. Boundary vertices stay, and
 * so do those `movable` rejects.
 */
export function relax(m: TriMesh, ref: SurfaceIndex, iterations: number, movable: (v: number) => boolean = () => true): TriMesh {
  const n = m.pos.length / 3;
  const P = Float64Array.from(m.pos);
  const nb: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < m.tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      nb[m.tri[t + k]].add(m.tri[t + ((k + 1) % 3)]);
      nb[m.tri[t + ((k + 1) % 3)]].add(m.tri[t + k]);
    }
  const fixed = new Uint8Array(n);
  for (const [a, b] of boundaryEdges(m.tri)) fixed[a] = fixed[b] = 1;
  for (let v = 0; v < n; v++) if (!movable(v)) fixed[v] = 1;
  for (let it = 0; it < iterations; it++) {
    const normals = vertexNormals({ pos: P, tri: m.tri });
    const next = Float64Array.from(P);
    for (let v = 0; v < n; v++) {
      if (fixed[v]) continue;
      const c: V3 = [0, 0, 0];
      for (const u of nb[v]) for (let k = 0; k < 3; k++) c[k] += P[u * 3 + k] / nb[v].size;
      const p = vtx(P, v);
      const d = sub(c, p);
      const nn = normals[v];
      const tang = sub(d, [nn[0] * dot(d, nn), nn[1] * dot(d, nn), nn[2] * dot(d, nn)]);
      const q = ref.closest([p[0] + 0.5 * tang[0], p[1] + 0.5 * tang[1], p[2] + 0.5 * tang[2]], nn);
      for (let k = 0; k < 3; k++) next[v * 3 + k] = q[k];
    }
    P.set(next);
  }
  return { pos: P, tri: m.tri };
}

// ---------------------------------------------------------------------------
// Triangles → quads

/**
 * Pairs every triangle with a neighbour into a quad: a maximum matching of the dual graph
 * (greedy by quad shape, completed with Edmonds' augmenting paths). Throws if some triangle
 * stays single (an odd triangle count, or a mesh that can't be paired).
 * Returns quads walking the triangles' direction.
 */
export function pairTriangles(pos: ArrayLike<number>, tri: ArrayLike<number>): Uint32Array {
  const nt = tri.length / 3;
  const adj: number[][] = Array.from({ length: nt }, () => []);
  const edgeTri = new Map<number, number>();
  for (let t = 0; t < nt; t++)
    for (let k = 0; k < 3; k++) {
      const key = ekey(tri[t * 3 + k], tri[t * 3 + ((k + 1) % 3)]);
      const o = edgeTri.get(key);
      if (o === undefined) edgeTri.set(key, t);
      else {
        adj[t].push(o);
        adj[o].push(t);
      }
    }
  const quadOf = (t: number, u: number): number[] => {
    // Shared edge a→b in t; u walks b→a with third vertex d.
    for (let k = 0; k < 3; k++) {
      const a = tri[t * 3 + k];
      const b = tri[t * 3 + ((k + 1) % 3)];
      const c = tri[t * 3 + ((k + 2) % 3)];
      for (let j = 0; j < 3; j++)
        if (tri[u * 3 + j] === b && tri[u * 3 + ((j + 1) % 3)] === a) return [a, tri[u * 3 + ((j + 2) % 3)], b, c];
    }
    throw new Error("triangles are not consistently oriented neighbours");
  };
  /** Shape score of the merged quad: its worst corner angle relative to 90°, and planarity. */
  const score = (t: number, u: number) => {
    const q = quadOf(t, u).map((i) => vtx(pos, i));
    let worst = 1;
    for (let k = 0; k < 4; k++) {
      const e0 = sub(q[(k + 3) % 4], q[k]);
      const e1 = sub(q[(k + 1) % 4], q[k]);
      const cos = dot(e0, e1) / (len(e0) * len(e1) || 1);
      worst = Math.min(worst, 1 - Math.abs(cos));
    }
    const n0 = cross(sub(q[1], q[0]), sub(q[2], q[0]));
    const n1 = cross(sub(q[2], q[0]), sub(q[3], q[0]));
    const flat = dot(n0, n1) / (len(n0) * len(n1) || 1);
    return worst * Math.max(0, flat);
  };
  const mate = new Int32Array(nt).fill(-1);
  const pairs: [number, number, number][] = [];
  for (let t = 0; t < nt; t++) for (const u of adj[t]) if (u > t) pairs.push([score(t, u), t, u]);
  pairs.sort((a, b) => b[0] - a[0]);
  for (const [, t, u] of pairs)
    if (mate[t] < 0 && mate[u] < 0) {
      mate[t] = u;
      mate[u] = t;
    }
  // Edmonds' blossom algorithm for the triangles left single.
  const parent = new Int32Array(nt).fill(-1);
  const base = Int32Array.from({ length: nt }, (_, i) => i);
  const used = new Uint8Array(nt);
  const blossom = new Uint8Array(nt);
  const lcaMark = new Uint8Array(nt);
  const touched: number[] = [];
  const lca = (a: number, b: number) => {
    const marked: number[] = [];
    for (;;) {
      a = base[a];
      lcaMark[a] = 1;
      marked.push(a);
      if (mate[a] < 0) break;
      a = parent[mate[a]];
    }
    let res: number;
    for (;;) {
      b = base[b];
      if (lcaMark[b]) {
        res = b;
        break;
      }
      b = parent[mate[b]];
    }
    for (const v of marked) lcaMark[v] = 0;
    return res;
  };
  const markPath = (v: number, b: number, child: number) => {
    while (base[v] !== b) {
      blossom[base[v]] = blossom[base[mate[v]]] = 1;
      parent[v] = child;
      child = mate[v];
      v = parent[mate[v]];
    }
  };
  const findPath = (root: number): number => {
    for (const v of touched) {
      used[v] = 0;
      parent[v] = -1;
      base[v] = v;
    }
    touched.length = 0;
    used[root] = 1;
    touched.push(root);
    const queue = [root];
    for (let qh = 0; qh < queue.length; qh++) {
      const v = queue[qh];
      for (const to of adj[v]) {
        if (base[v] === base[to] || mate[v] === to) continue;
        if (to === root || (mate[to] >= 0 && parent[mate[to]] >= 0)) {
          const cur = lca(v, to);
          for (const x of touched) blossom[x] = 0;
          markPath(v, cur, to);
          markPath(to, cur, v);
          for (const x of [...touched]) {
            if (!blossom[base[x]]) continue;
            base[x] = cur;
            if (!used[x]) {
              used[x] = 1;
              queue.push(x);
            }
          }
        } else if (parent[to] < 0) {
          parent[to] = v;
          touched.push(to);
          if (mate[to] < 0) return to;
          const mt = mate[to];
          used[mt] = 1;
          touched.push(mt);
          queue.push(mt);
        }
      }
    }
    return -1;
  };
  for (let t = 0; t < nt; t++) {
    if (mate[t] >= 0) continue;
    const end = findPath(t);
    let v = end;
    while (v >= 0) {
      const pv = parent[v];
      const ppv = mate[pv];
      mate[v] = pv;
      mate[pv] = v;
      v = ppv;
    }
  }
  const single = [...mate.keys()].filter((t) => mate[t] < 0);
  if (single.length) throw new Error(`${single.length} triangle(s) could not be paired into quads`);
  const quads: number[] = [];
  for (let t = 0; t < nt; t++) if (mate[t] > t) quads.push(...quadOf(t, mate[t]));
  return Uint32Array.from(quads);
}
