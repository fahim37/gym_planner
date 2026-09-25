import type { Sculpt, V3 } from "./sdf";

/**
 * Narrow-band surface nets over an oriented grid.
 *
 * A region is polygonised at its own resolution; regions overlap slightly at
 * their seams (wrist, neck, mid-foot) and `keep` decides which side of the
 * seam each region's triangles belong to. Midline regions are polygonised for
 * z ≥ 0 only; the quads that cross the midline are emitted against the
 * mirror image of the first cell layer, so the mirrored half joins exactly.
 */
export interface Region {
  name: string;
  /** Grid origin (bind cm). For midline regions axes must be the world axes and origin.z is ignored. */
  origin: V3;
  axes: [V3, V3, V3];
  /** Extent along each axis (cm). */
  size: V3;
  /** Voxel size (cm). */
  h: number;
  midline: boolean;
  /** Keep a triangle whose centroid is at (x, y, z). */
  keep: (x: number, y: number, z: number) => boolean;
}

export interface RegionMesh {
  /** Vertex positions (bind cm) and normals. */
  pos: Float32Array;
  nrm: Float32Array;
  /** Triangles; for midline regions indices ≥ vertexCount refer to the mirror of (index − vertexCount). */
  tris: Uint32Array;
  vertexCount: number;
  midline: boolean;
  /** Triangles that span the midline (already symmetric; not mirrored again). */
  midTris: Uint32Array;
}

const EDGES = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [0, 2],
  [1, 3],
  [4, 6],
  [5, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

export function polygonize(sculpt: Sculpt, r: Region): RegionMesh {
  const h = r.h;
  const [ax, ay, az] = r.axes;
  const ox = r.origin[0];
  const oy = r.origin[1];
  let oz = r.origin[2];
  let nz: number;
  if (r.midline) {
    // One mirror layer below z = 0, then z = 0 .. size.
    oz = -h;
    nz = Math.ceil(r.size[2] / h) + 2;
  } else nz = Math.ceil(r.size[2] / h) + 1;
  const nx = Math.ceil(r.size[0] / h) + 1;
  const ny = Math.ceil(r.size[1] / h) + 1;
  const sxy = nx * ny;
  const N = sxy * nz;
  const vals = new Float32Array(N).fill(1e9);

  const px = (i: number, j: number, k: number) => ox + ax[0] * i * h + ay[0] * j * h + az[0] * k * h;
  const py = (i: number, j: number, k: number) => oy + ax[1] * i * h + ay[1] * j * h + az[1] * k * h;
  const pz = (i: number, j: number, k: number) => oz + ax[2] * i * h + ay[2] * j * h + az[2] * k * h;

  // 1. Hierarchical narrow band: 8h cells → 4h → 2h, keeping cells whose
  //    centre distance says the surface may pass through them.
  const kStart = r.midline ? 1 : 0;
  let cells: number[] = [];
  const top = 8;
  for (let k = kStart; k < nz - 1; k += top) for (let j = 0; j < ny - 1; j += top) for (let i = 0; i < nx - 1; i += top) cells.push(i, j, k);
  for (let size = top; size >= 2; size >>= 1) {
    const next: number[] = [];
    const lim = size * h * 0.866 * 1.9 + 0.3;
    const half = size / 2;
    for (let c = 0; c < cells.length; c += 3) {
      const i = cells[c];
      const j = cells[c + 1];
      const k = cells[c + 2];
      const ci = i + half;
      const cj = j + half;
      const ck = k + half;
      const d = sculpt.eval(px(ci, cj, ck), py(ci, cj, ck), pz(ci, cj, ck));
      if (Math.abs(d) > lim) continue;
      if (size === 2) {
        next.push(i, j, k);
        continue;
      }
      for (let dz = 0; dz < size; dz += half)
        for (let dy = 0; dy < size; dy += half)
          for (let dx = 0; dx < size; dx += half) {
            if (i + dx < nx - 1 && j + dy < ny - 1 && k + dz < nz - 1) next.push(i + dx, j + dy, k + dz);
          }
    }
    cells = next;
  }

  // 2. Fine samples at the corners of every fine cell inside the band.
  const fine: number[] = [];
  for (let c = 0; c < cells.length; c += 3) {
    const i0 = cells[c];
    const j0 = cells[c + 1];
    const k0 = cells[c + 2];
    for (let k = k0; k < Math.min(k0 + 2, nz - 1); k++)
      for (let j = j0; j < Math.min(j0 + 2, ny - 1); j++)
        for (let i = i0; i < Math.min(i0 + 2, nx - 1); i++) {
          fine.push(i, j, k);
          for (let dz = 0; dz < 2; dz++)
            for (let dy = 0; dy < 2; dy++)
              for (let dx = 0; dx < 2; dx++) {
                const idx = i + dx + nx * (j + dy + ny * (k + dz));
                if (vals[idx] === 1e9) vals[idx] = sculpt.eval(px(i + dx, j + dy, k + dz), py(i + dx, j + dy, k + dz), pz(i + dx, j + dy, k + dz));
              }
        }
  }

  // 3. One vertex per sign-changing cell.
  const cellVert = new Map<number, number>();
  const posList: number[] = [];
  const corner = new Float64Array(8);
  const cornerIdx = [0, 1, nx, nx + 1, sxy, sxy + 1, sxy + nx, sxy + nx + 1];
  const cOff = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ];
  for (let c = 0; c < fine.length; c += 3) {
    const i = fine[c];
    const j = fine[c + 1];
    const k = fine[c + 2];
    const base = i + nx * (j + ny * k);
    let mask = 0;
    for (let q = 0; q < 8; q++) {
      const v = vals[base + cornerIdx[q]];
      corner[q] = v;
      if (v < 0) mask |= 1 << q;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let n = 0;
    for (const [a, b] of EDGES) {
      const da = corner[a];
      const db = corner[b];
      if (da < 0 === db < 0) continue;
      const t = da / (da - db);
      sx += cOff[a][0] + (cOff[b][0] - cOff[a][0]) * t;
      sy += cOff[a][1] + (cOff[b][1] - cOff[a][1]) * t;
      sz += cOff[a][2] + (cOff[b][2] - cOff[a][2]) * t;
      n++;
    }
    const fi = i + sx / n;
    const fj = j + sy / n;
    const fk = k + sz / n;
    cellVert.set(base, posList.length / 3);
    posList.push(px(fi, fj, fk), py(fi, fj, fk), pz(fi, fj, fk));
  }
  const vertexCount = posList.length / 3;

  // 4. Quads around sign-changing edges.
  const tris: number[] = [];
  const midTris: number[] = [];
  const vertOf = (i: number, j: number, k: number) => {
    if (r.midline && k === 0) {
      const v = cellVert.get(i + nx * (j + ny * 1));
      return v === undefined ? -1 : v + vertexCount;
    }
    const v = cellVert.get(i + nx * (j + ny * k));
    return v === undefined ? -1 : v;
  };
  const emit = (a: number, b: number, c: number, d: number, flip: boolean, mid: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const list = mid ? midTris : tris;
    if (flip) list.push(a, c, b, a, d, c);
    else list.push(a, b, c, a, c, d);
  };
  for (let c = 0; c < fine.length; c += 3) {
    const i = fine[c];
    const j = fine[c + 1];
    const k = fine[c + 2];
    const base = i + nx * (j + ny * k);
    const v0 = vals[base];
    const inside = v0 < 0;
    // x-edge (i,j,k)→(i+1,j,k): cells (i, j-1..j, k-1..k)
    if (j > 0 && k > 0) {
      const v1 = vals[base + 1];
      if (v1 !== 1e9 && v1 < 0 !== inside) {
        emit(vertOf(i, j - 1, k - 1), vertOf(i, j, k - 1), vertOf(i, j, k), vertOf(i, j - 1, k), !inside, r.midline && k === 1);
      }
    }
    // y-edge: cells (i-1..i, j, k-1..k)
    if (i > 0 && k > 0) {
      const v1 = vals[base + nx];
      if (v1 !== 1e9 && v1 < 0 !== inside) {
        emit(vertOf(i - 1, j, k - 1), vertOf(i - 1, j, k), vertOf(i, j, k), vertOf(i, j, k - 1), !inside, r.midline && k === 1);
      }
    }
    // z-edge: cells (i-1..i, j-1..j, k)
    if (i > 0 && j > 0) {
      const v1 = vals[base + sxy];
      if (v1 !== 1e9 && v1 < 0 !== inside) {
        emit(vertOf(i - 1, j - 1, k), vertOf(i, j - 1, k), vertOf(i, j, k), vertOf(i - 1, j, k), !inside, false);
      }
    }
  }

  // Axis handedness flips the winding.
  const det =
    ax[0] * (ay[1] * az[2] - ay[2] * az[1]) - ax[1] * (ay[0] * az[2] - ay[2] * az[0]) + ax[2] * (ay[0] * az[1] - ay[1] * az[0]);
  const fix = (list: number[]) => {
    if (det > 0) return;
    for (let t = 0; t < list.length; t += 3) {
      const tmp = list[t + 1];
      list[t + 1] = list[t + 2];
      list[t + 2] = tmp;
    }
  };
  fix(tris);
  fix(midTris);

  const pos = Float32Array.from(posList);
  const mesh: RegionMesh = {
    pos,
    nrm: new Float32Array(pos.length),
    tris: Uint32Array.from(tris),
    vertexCount,
    midline: r.midline,
    midTris: Uint32Array.from(midTris),
  };
  project(sculpt, mesh, h, r.midline);
  clip(mesh, r.keep);
  return mesh;
}

/** One Newton step onto the surface; the same gradient gives the normal. */
function project(sculpt: Sculpt, m: RegionMesh, h: number, midline: boolean) {
  const e = Math.max(0.05, h * 0.3);
  const P = m.pos;
  for (let v = 0; v < m.vertexCount; v++) {
    let x = P[v * 3];
    let y = P[v * 3 + 1];
    let z = P[v * 3 + 2];
    const a = sculpt.eval(x + e, y - e, z - e);
    const b = sculpt.eval(x - e, y - e, z + e);
    const c = sculpt.eval(x - e, y + e, z - e);
    const d = sculpt.eval(x + e, y + e, z + e);
    let gx = a - b - c + d;
    let gy = -a - b + c + d;
    let gz = -a + b - c + d;
    const gl = Math.hypot(gx, gy, gz) || 1;
    gx /= gl;
    gy /= gl;
    gz /= gl;
    const step = Math.max(-h * 0.5, Math.min(h * 0.5, (a + b + c + d) / 4));
    x -= gx * step;
    y -= gy * step;
    z -= gz * step;
    if (midline && z < h * 0.05) z = h * 0.05;
    m.nrm[v * 3] = gx;
    m.nrm[v * 3 + 1] = gy;
    m.nrm[v * 3 + 2] = gz;
    P[v * 3] = x;
    P[v * 3 + 1] = y;
    P[v * 3 + 2] = z;
  }
}

/** Drops triangles outside the region's seam and compacts the vertex list. */
function clip(m: RegionMesh, keep: Region["keep"]) {
  const n = m.vertexCount;
  const P = m.pos;
  const vx = (i: number) => (i >= n ? P[(i - n) * 3] : P[i * 3]);
  const vy = (i: number) => (i >= n ? P[(i - n) * 3 + 1] : P[i * 3 + 1]);
  const vz = (i: number) => (i >= n ? -P[(i - n) * 3 + 2] : P[i * 3 + 2]);
  const filter = (tris: Uint32Array) => {
    const out: number[] = [];
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t];
      const b = tris[t + 1];
      const c = tris[t + 2];
      const x = (vx(a) + vx(b) + vx(c)) / 3;
      const y = (vy(a) + vy(b) + vy(c)) / 3;
      const z = (vz(a) + vz(b) + vz(c)) / 3;
      if (keep(x, y, z)) out.push(a, b, c);
    }
    return out;
  };
  const tris = filter(m.tris);
  const mid = filter(m.midTris);
  const remap = new Int32Array(n).fill(-1);
  let count = 0;
  const mark = (i: number) => {
    const b = i >= n ? i - n : i;
    if (remap[b] < 0) remap[b] = count++;
  };
  for (const i of tris) mark(i);
  for (const i of mid) mark(i);
  const pos = new Float32Array(count * 3);
  const nrm = new Float32Array(count * 3);
  for (let v = 0; v < n; v++) {
    const r = remap[v];
    if (r < 0) continue;
    pos.set(m.pos.subarray(v * 3, v * 3 + 3), r * 3);
    nrm.set(m.nrm.subarray(v * 3, v * 3 + 3), r * 3);
  }
  const map = (i: number) => (i >= n ? remap[i - n] + count : remap[i]);
  m.tris = Uint32Array.from(tris, map);
  m.midTris = Uint32Array.from(mid, map);
  m.pos = pos;
  m.nrm = nrm;
  m.vertexCount = count;
}
