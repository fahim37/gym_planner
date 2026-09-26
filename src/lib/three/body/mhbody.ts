import { MH_BODY } from "./asset/mh-body";
import { decodeAsset, type AssetData } from "./asset/format";
import type { BodyData } from "./build";
import { BONE_COUNT, BoneSolver, B_HEAD } from "./skeleton";
import { MAT_EYE } from "./sdf";

/**
 * The sculpted body: the MakeHuman-derived mesh (see scripts/build-body-asset.mjs)
 * decoded, refined with Catmull-Clark subdivision and dressed with eyes. It
 * produces the same BodyData as the procedural generator, so the rig, the
 * materials, highlights and picking work unchanged.
 */

/** Gunzips the embedded asset (DecompressionStream, available in browsers, workers and Node ≥ 18). */
async function gunzip(b64: string): Promise<Uint8Array> {
  const bin = typeof atob === "function" ? Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) : new Uint8Array(Buffer.from(b64, "base64"));
  const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

let decoded: Promise<AssetData> | null = null;
export function loadAsset(): Promise<AssetData> {
  decoded ??= gunzip(MH_BODY).then(decodeAsset);
  return decoded;
}

/** Mutable per-vertex attribute set during subdivision. */
interface Mesh {
  n: number;
  pos: Float64Array;
  quads: Uint32Array;
  bones: Uint8Array;
  weights: Uint8Array;
  info: Uint8Array;
  fibre: Int8Array;
  extra: Float32Array;
  fuv: Float32Array;
  seg: Uint8Array;
}

function fromAsset(a: AssetData): Mesh {
  return {
    n: a.position.length / 3,
    pos: Float64Array.from(a.position),
    quads: a.quads,
    bones: a.bones,
    weights: a.weights,
    info: a.info,
    fibre: a.fibre,
    extra: a.extra,
    fuv: a.fuv,
    seg: a.seg,
  };
}

// Attribute blending -----------------------------------------------------------

const wAcc = new Float64Array(BONE_COUNT);
const touched: number[] = [];

/** Blends vertex attributes of `src` (indices `ids`, weights `ws`) into vertex `d` of `m`. */
function blend(s: Mesh, m: Mesh, d: number, ids: number[], ws: number[]) {
  // Skin weights: merge, keep the top 4.
  touched.length = 0;
  for (let k = 0; k < ids.length; k++) {
    const v = ids[k];
    for (let j = 0; j < 4; j++) {
      const b = s.bones[v * 4 + j];
      const w = s.weights[v * 4 + j] * ws[k];
      if (w <= 0) continue;
      if (wAcc[b] === 0) touched.push(b);
      wAcc[b] += w;
    }
  }
  touched.sort((a, b) => wAcc[b] - wAcc[a]);
  let tot = 0;
  for (let j = 0; j < Math.min(4, touched.length); j++) tot += wAcc[touched[j]];
  let left = 255;
  for (let j = 0; j < 4; j++) {
    const b = touched[j];
    const q = b === undefined ? 0 : j === 3 || j === touched.length - 1 ? left : Math.min(left, Math.round((wAcc[b] / tot) * 255));
    m.bones[d * 4 + j] = b ?? 0;
    m.weights[d * 4 + j] = q;
    left -= q;
  }
  for (const b of touched) wAcc[b] = 0;

  // Muscle identity: a signed "margin" field per candidate group, so borders move smoothly.
  let best = -1;
  let bestS = -Infinity;
  let second = 255;
  let secondS = -Infinity;
  const cands: number[] = [];
  for (const v of ids) {
    const a = s.info[v * 4];
    const b = s.seg[v * 4];
    if (!cands.includes(a)) cands.push(a);
    if (!cands.includes(b)) cands.push(b);
  }
  for (const c of cands) {
    let sc = 0;
    for (let k = 0; k < ids.length; k++) {
      const v = ids[k];
      const mg = s.seg[v * 4 + 1] / 255;
      sc += ws[k] * (s.info[v * 4] === c ? mg : s.seg[v * 4] === c ? -mg : -1);
    }
    if (sc > bestS) {
      second = best;
      secondS = bestS;
      best = c;
      bestS = sc;
    } else if (sc > secondS) {
      second = c;
      secondS = sc;
    }
  }
  m.info[d * 4] = best;
  m.seg[d * 4] = second < 0 ? 255 : second;
  m.seg[d * 4 + 1] = Math.round(Math.max(0, Math.min(1, bestS)) * 255);

  // Material: the heaviest corner; fibre strength, tendon: averages.
  let heavy = ids[0];
  let hw = -1;
  for (let k = 0; k < ids.length; k++)
    if (ws[k] > hw) {
      hw = ws[k];
      heavy = ids[k];
    }
  m.info[d * 4 + 1] = s.info[heavy * 4 + 1];
  let fs = 0;
  let td = 0;
  let sh = 0;
  let tone = 0;
  const fib = [0, 0, 0];
  const ex = [0, 0, 0, 0];
  let lineW = 0;
  let uvOk = true;
  let u = 0;
  let vv = 0;
  for (let k = 0; k < ids.length; k++) {
    const v = ids[k];
    const w = ws[k];
    fs += s.info[v * 4 + 2] * w;
    td += s.info[v * 4 + 3] * w;
    sh += s.seg[v * 4 + 2] * w;
    tone += s.seg[v * 4 + 3] * w;
    const sg = s.fibre[v * 4] * s.fibre[heavy * 4] + s.fibre[v * 4 + 1] * s.fibre[heavy * 4 + 1] + s.fibre[v * 4 + 2] * s.fibre[heavy * 4 + 2] < 0 ? -1 : 1;
    for (let c = 0; c < 3; c++) fib[c] += s.fibre[v * 4 + c] * w * sg;
    const line = s.extra[v * 4];
    if (line < 50) {
      ex[0] += line * w;
      lineW += w;
    }
    for (let c = 1; c < 4; c++) ex[c] += s.extra[v * 4 + c] * w;
    if (s.fuv[v * 2] > 1e5 || s.info[v * 4] !== s.info[heavy * 4]) uvOk = false;
    u += s.fuv[v * 2] * w;
    vv += s.fuv[v * 2 + 1] * w;
  }
  m.info[d * 4 + 2] = Math.round(fs);
  m.info[d * 4 + 3] = Math.round(td);
  m.seg[d * 4 + 2] = Math.round(sh);
  m.seg[d * 4 + 3] = Math.round(tone);
  const fl = Math.hypot(fib[0], fib[1], fib[2]) || 1;
  for (let c = 0; c < 3; c++) m.fibre[d * 4 + c] = Math.round((fib[c] / fl) * 127);
  m.fibre[d * 4 + 3] = s.fibre[heavy * 4 + 3];
  m.extra[d * 4] = lineW >= 0.5 ? ex[0] / lineW : 99;
  for (let c = 1; c < 4; c++) m.extra[d * 4 + c] = ex[c];
  m.fuv[d * 2] = uvOk ? u : 1e6;
  m.fuv[d * 2 + 1] = uvOk ? vv : 0;
}

/** One Catmull-Clark step (quads in, quads out; open boundaries keep their curve). */
function subdivide(s: Mesh): Mesh {
  const nq = s.quads.length / 4;
  // Edges.
  const edgeId = new Map<number, number>();
  const edgeV: number[] = [];
  const edgeF: number[][] = [];
  const quadE = new Uint32Array(nq * 4);
  for (let f = 0; f < nq; f++)
    for (let k = 0; k < 4; k++) {
      const a = s.quads[f * 4 + k];
      const b = s.quads[f * 4 + ((k + 1) % 4)];
      const key = a < b ? a * 1048576 + b : b * 1048576 + a;
      let e = edgeId.get(key);
      if (e === undefined) {
        e = edgeV.length / 2;
        edgeId.set(key, e);
        edgeV.push(a, b);
        edgeF.push([]);
      }
      edgeF[e].push(f);
      quadE[f * 4 + k] = e;
    }
  const ne = edgeV.length / 2;
  const n = s.n + ne + nq;
  const m: Mesh = {
    n,
    pos: new Float64Array(n * 3),
    quads: new Uint32Array(nq * 16),
    bones: new Uint8Array(n * 4),
    weights: new Uint8Array(n * 4),
    info: new Uint8Array(n * 4),
    fibre: new Int8Array(n * 4),
    extra: new Float32Array(n * 4),
    fuv: new Float32Array(n * 2),
    seg: new Uint8Array(n * 4),
  };
  const E0 = s.n;
  const F0 = s.n + ne;
  // Face points.
  for (let f = 0; f < nq; f++) {
    const ids = [s.quads[f * 4], s.quads[f * 4 + 1], s.quads[f * 4 + 2], s.quads[f * 4 + 3]];
    for (let c = 0; c < 3; c++) m.pos[(F0 + f) * 3 + c] = (s.pos[ids[0] * 3 + c] + s.pos[ids[1] * 3 + c] + s.pos[ids[2] * 3 + c] + s.pos[ids[3] * 3 + c]) / 4;
    blend(s, m, F0 + f, ids, [0.25, 0.25, 0.25, 0.25]);
  }
  // Edge points.
  const boundary = new Uint8Array(s.n);
  for (let e = 0; e < ne; e++) {
    const a = edgeV[e * 2];
    const b = edgeV[e * 2 + 1];
    const fs = edgeF[e];
    for (let c = 0; c < 3; c++) {
      let p = s.pos[a * 3 + c] + s.pos[b * 3 + c];
      if (fs.length === 2) p = (p + m.pos[(F0 + fs[0]) * 3 + c] + m.pos[(F0 + fs[1]) * 3 + c]) / 4;
      else p /= 2;
      m.pos[(E0 + e) * 3 + c] = p;
    }
    if (fs.length !== 2) boundary[a] = boundary[b] = 1;
    blend(s, m, E0 + e, [a, b], [0.5, 0.5]);
  }
  // Vertex points.
  const Q = new Float64Array(s.n * 3);
  const R = new Float64Array(s.n * 3);
  const val = new Uint16Array(s.n);
  const bsum = new Float64Array(s.n * 3);
  const bcnt = new Uint8Array(s.n);
  for (let f = 0; f < nq; f++)
    for (let k = 0; k < 4; k++) {
      const v = s.quads[f * 4 + k];
      for (let c = 0; c < 3; c++) Q[v * 3 + c] += m.pos[(F0 + f) * 3 + c];
    }
  for (let e = 0; e < ne; e++) {
    const a = edgeV[e * 2];
    const b = edgeV[e * 2 + 1];
    for (let c = 0; c < 3; c++) {
      const mp = (s.pos[a * 3 + c] + s.pos[b * 3 + c]) / 2;
      R[a * 3 + c] += mp;
      R[b * 3 + c] += mp;
    }
    val[a]++;
    val[b]++;
    if (edgeF[e].length !== 2) {
      for (let c = 0; c < 3; c++) {
        bsum[a * 3 + c] += s.pos[b * 3 + c];
        bsum[b * 3 + c] += s.pos[a * 3 + c];
      }
      bcnt[a]++;
      bcnt[b]++;
    }
  }
  for (let v = 0; v < s.n; v++) {
    const k = val[v];
    for (let c = 0; c < 3; c++) {
      const P = s.pos[v * 3 + c];
      if (boundary[v] && bcnt[v] === 2) m.pos[v * 3 + c] = (6 * P + bsum[v * 3 + c]) / 8;
      else if (boundary[v] || k < 3) m.pos[v * 3 + c] = P;
      else m.pos[v * 3 + c] = (Q[v * 3 + c] / k + (2 * R[v * 3 + c]) / k + (k - 3) * P) / k;
    }
    for (let j = 0; j < 4; j++) {
      m.bones[v * 4 + j] = s.bones[v * 4 + j];
      m.weights[v * 4 + j] = s.weights[v * 4 + j];
      m.info[v * 4 + j] = s.info[v * 4 + j];
      m.fibre[v * 4 + j] = s.fibre[v * 4 + j];
      m.extra[v * 4 + j] = s.extra[v * 4 + j];
      m.seg[v * 4 + j] = s.seg[v * 4 + j];
    }
    m.fuv[v * 2] = s.fuv[v * 2];
    m.fuv[v * 2 + 1] = s.fuv[v * 2 + 1];
  }
  // New quads: corner, edge, face, previous edge.
  for (let f = 0; f < nq; f++)
    for (let k = 0; k < 4; k++) {
      const o = (f * 4 + k) * 4;
      m.quads[o] = s.quads[f * 4 + k];
      m.quads[o + 1] = E0 + quadE[f * 4 + k];
      m.quads[o + 2] = F0 + f;
      m.quads[o + 3] = E0 + quadE[f * 4 + ((k + 3) % 4)];
    }
  return m;
}

/**
 * Eyeball: a UV sphere around the asset's eye centre, iris coordinates in the fibre slot. It
 * fills the socket (the helper sphere touches the lid margins, so it sits just inside them)
 * and its gaze is lowered a few degrees: a relaxed look, the iris tucked under the upper lid.
 */
function addEyes(parts: Mesh[], eyes: AssetData["eyes"]) {
  const SEG = 28;
  const RING = 18;
  const tilt = (3 * Math.PI) / 180;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  for (const e of eyes) {
    const r = e.r * 0.9;
    const n = (RING + 1) * (SEG + 1);
    const m: Mesh = {
      n,
      pos: new Float64Array(n * 3),
      quads: new Uint32Array(RING * SEG * 4),
      bones: new Uint8Array(n * 4),
      weights: new Uint8Array(n * 4),
      info: new Uint8Array(n * 4),
      fibre: new Int8Array(n * 4),
      extra: new Float32Array(n * 4),
      fuv: new Float32Array(n * 2),
      seg: new Uint8Array(n * 4),
    };
    let v = 0;
    for (let i = 0; i <= RING; i++) {
      // Pole on +x (looking forward).
      const th = (Math.PI * i) / RING;
      for (let j = 0; j <= SEG; j++, v++) {
        const ph = (2 * Math.PI * j) / SEG;
        const d = [Math.cos(th), Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph)];
        for (let c = 0; c < 3; c++) m.pos[v * 3 + c] = e.c[c] + d[c] * r;
        // Eye-local coordinates: x along the (lowered) gaze, y up, z sideways.
        const local = [d[0] * ct - d[1] * st, d[0] * st + d[1] * ct, d[2]];
        m.bones[v * 4] = B_HEAD;
        m.weights[v * 4] = 255;
        m.info[v * 4] = 255;
        m.info[v * 4 + 1] = MAT_EYE;
        for (let c = 0; c < 3; c++) m.fibre[v * 4 + c] = Math.round(Math.max(-1, Math.min(1, (local[c] * r) / 2)) * 127);
        m.fibre[v * 4 + 3] = MAT_EYE;
        m.extra[v * 4] = 99;
        m.extra[v * 4 + 1] = 1;
        m.extra[v * 4 + 3] = 15;
        m.fuv[v * 2] = 1e6;
        m.seg[v * 4] = 255;
        m.seg[v * 4 + 1] = 255;
        m.seg[v * 4 + 2] = 255;
        m.seg[v * 4 + 3] = 128;
      }
    }
    let q = 0;
    for (let i = 0; i < RING; i++)
      for (let j = 0; j < SEG; j++) {
        const a = i * (SEG + 1) + j;
        m.quads.set([a, a + SEG + 1, a + SEG + 2, a + 1], q);
        q += 4;
      }
    parts.push(m);
  }
}

/** Builds the render mesh at `levels` subdivision steps (0 = the asset as is). */
export async function buildSculptedBody(levels: number): Promise<BodyData> {
  const t0 = performance.now();
  const asset = await loadAsset();
  let m = fromAsset(asset);
  for (let l = 0; l < levels; l++) m = subdivide(m);
  const parts: Mesh[] = [m];
  addEyes(parts, asset.eyes);

  let nv = 0;
  let nq = 0;
  for (const p of parts) {
    nv += p.n;
    nq += p.quads.length / 4;
  }
  const position = new Float32Array(nv * 3);
  const normal = new Float32Array(nv * 3);
  const bones = new Uint8Array(nv * 4);
  const weights = new Uint8Array(nv * 4);
  const info = new Uint8Array(nv * 4);
  const fibre = new Int8Array(nv * 4);
  const extra = new Float32Array(nv * 4);
  const fuv = new Float32Array(nv * 2);
  const seg = new Uint8Array(nv * 4);
  const index = new Uint32Array(nq * 6);
  let vo = 0;
  let io = 0;
  for (const p of parts) {
    for (let i = 0; i < p.n * 3; i++) position[vo * 3 + i] = p.pos[i] / 100;
    bones.set(p.bones, vo * 4);
    weights.set(p.weights, vo * 4);
    info.set(p.info, vo * 4);
    fibre.set(p.fibre, vo * 4);
    extra.set(p.extra, vo * 4);
    fuv.set(p.fuv, vo * 2);
    seg.set(p.seg, vo * 4);
    for (let f = 0; f < p.quads.length; f += 4) {
      const [a, b, c, d] = [p.quads[f] + vo, p.quads[f + 1] + vo, p.quads[f + 2] + vo, p.quads[f + 3] + vo];
      // Split along the shorter diagonal.
      const dac = (position[a * 3] - position[c * 3]) ** 2 + (position[a * 3 + 1] - position[c * 3 + 1]) ** 2 + (position[a * 3 + 2] - position[c * 3 + 2]) ** 2;
      const dbd = (position[b * 3] - position[d * 3]) ** 2 + (position[b * 3 + 1] - position[d * 3 + 1]) ** 2 + (position[b * 3 + 2] - position[d * 3 + 2]) ** 2;
      if (dac <= dbd) index.set([a, b, c, a, c, d], io);
      else index.set([a, b, d, b, c, d], io);
      io += 6;
    }
    vo += p.n;
  }
  // Smooth normals, area weighted.
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3;
    const b = index[t + 1] * 3;
    const c = index[t + 2] * 3;
    const ux = position[b] - position[a];
    const uy = position[b + 1] - position[a + 1];
    const uz = position[b + 2] - position[a + 2];
    const wx = position[c] - position[a];
    const wy = position[c + 1] - position[a + 1];
    const wz = position[c + 2] - position[a + 2];
    const nx = uy * wz - uz * wy;
    const ny = uz * wx - ux * wz;
    const nz = ux * wy - uy * wx;
    for (const v of [a, b, c]) {
      normal[v] += nx;
      normal[v + 1] += ny;
      normal[v + 2] += nz;
    }
  }
  for (let v = 0; v < nv; v++) {
    const l = Math.hypot(normal[v * 3], normal[v * 3 + 1], normal[v * 3 + 2]) || 1;
    normal[v * 3] /= l;
    normal[v * 3 + 1] /= l;
    normal[v * 3 + 2] /= l;
  }
  const solver = new BoneSolver();
  const bind = new Float32Array(BONE_COUNT * 16);
  solver.matrices.forEach((mat, i) => bind.set(mat.elements, i * 16));
  const ms = performance.now() - t0;
  return {
    position,
    normal,
    bones,
    weights,
    info,
    fibre,
    extra,
    fuv,
    seg,
    index,
    bind,
    stats: { vertices: nv, triangles: index.length / 3, ms, regions: { sculpted: { v: nv, t: index.length / 3, ms } } },
  };
}
