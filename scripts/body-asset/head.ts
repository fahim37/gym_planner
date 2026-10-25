/**
 * Grafts the stylised head (scripts/body-asset/stylized-head.bin, see head-source.ts) onto
 * the fitted MakeHuman body, replacing its head:
 *   1. place the head in bind space: scaled to the body's face (eye to chin) and aligned on
 *      the eyes, ears and nose;
 *   2. cut the body's neck above CUT_Y, thin the head's neck edge to the same number of
 *      vertices and reshape the top of the body's neck so its cross-section grows into the
 *      head's (the sculpt's neck is thicker at the back);
 *   3. zip the two edges together with a strip of triangles and pair every head and strip
 *      triangle into a quad (the runtime Catmull-Clark subdivision takes quads only);
 *   4. give the new vertices their attributes: skin weights, muscle map and skin tone from the
 *      nearest body vertices; hair, brows, lips and eyes measured on the stylised head.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { MAT_EYE, MAT_HAIR, MAT_SKIN } from "../../src/lib/three/body/sdf";
import { decodeHeadSource } from "./head-format";
import { boundaryLoops, pairTriangles, relax, SurfaceIndex, thinBoundary, type V3 } from "./trimesh";

export interface Body {
  pos: V3[];
  quads: number[];
  bones: Uint8Array;
  weights: Uint8Array;
  info: Uint8Array;
  fibre: Int8Array;
  extra: Float32Array;
  fuv: Float32Array;
  seg: Uint8Array;
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** GLB metres → bind cm: the head's eye-to-chin distance matched to the body's face. */
const SCALE = 189.6;
/**
 * Where the head's eye mid-point lands relative to the body's (cm). Its ears sit over the
 * body's and its throat close to the body's; the face comes a little forward.
 */
const OFFSET: V3 = [2.0, -0.9, 0];
/** Height (cm) above which the body's neck and head are replaced. */
const CUT_Y = 167.5;
/** Vertical axis of the neck (x, cm) that the neck reshaping works around. */
const NECK_X = 0.9;

const azimuth = (p: V3) => Math.atan2(p[2], p[0] - NECK_X);
const radius = (p: V3) => Math.hypot(p[0] - NECK_X, p[2]);

/** Periodic linear interpolation of samples [azimuth, value]. */
function periodic(samples: [number, number][]): (th: number) => number {
  const s = [...samples].sort((a, b) => a[0] - b[0]);
  return (th: number) => {
    let k = s.findIndex(([a]) => a >= th);
    if (k < 0) k = s.length;
    const [a0, v0] = k === 0 ? [s[s.length - 1][0] - 2 * Math.PI, s[s.length - 1][1]] : s[k - 1];
    const [a1, v1] = k === s.length ? [s[0][0] + 2 * Math.PI, s[0][1]] : s[k];
    return v0 + ((v1 - v0) * (th - a0)) / (a1 - a0 || 1);
  };
}

/** Vertex neighbours of polygons with `n` corners. */
function adjacency(faces: number[], n: number): Map<number, Set<number>> {
  const adj = new Map<number, Set<number>>();
  const link = (a: number, b: number) => {
    let s = adj.get(a);
    if (!s) adj.set(a, (s = new Set()));
    s.add(b);
  };
  for (let f = 0; f < faces.length; f += n)
    for (let k = 0; k < n; k++) {
      link(faces[f + k], faces[f + ((k + 1) % n)]);
      link(faces[f + ((k + 1) % n)], faces[f + k]);
    }
  return adj;
}

/**
 * Harmonic interpolation of displacements over a mesh: `fixed` vertices keep theirs, every
 * `free` one ends up at the mean of its neighbours' (Gauss–Seidel). Returns the free and
 * fixed displacements.
 */
function harmonic(adj: Map<number, Set<number>>, fixed: Map<number, V3>, free: number[]): Map<number, V3> {
  const d = new Map<number, V3>(fixed);
  for (const v of free) d.set(v, [0, 0, 0]);
  for (let it = 0; it < 3000; it++)
    for (const v of free) {
      const s: V3 = [0, 0, 0];
      let k = 0;
      for (const u of adj.get(v)!) {
        const du = d.get(u);
        if (!du) continue;
        s[0] += du[0];
        s[1] += du[1];
        s[2] += du[2];
        k++;
      }
      if (k) d.set(v, [s[0] / k, s[1] / k, s[2] / k]);
    }
  return d;
}

export interface GraftResult {
  body: Body;
  /** Eye mid-point of the new head (bind cm). */
  eyeMid: V3;
}

/** Replaces the head of `b`; `eyeMid` is the body's eye mid-point (bind cm). */
export function graftHead(b: Body, eyeMid: V3): GraftResult {
  const src = decodeHeadSource(new Uint8Array(gunzipSync(readFileSync(join(process.cwd(), "scripts", "body-asset", "stylized-head.bin")))));
  const anchor = mul(add(src.eyes[0].c, src.eyes[1].c), 0.5);
  const target = add(eyeMid, OFFSET);
  const toBind = (g: V3): V3 => add(target, mul(sub(g, anchor), SCALE));
  const eyes = src.eyes.map((e) => ({ c: toBind(e.c), r: e.r * SCALE }));
  const newEyeMid = mul(add(eyes[0].c, eyes[1].c), 0.5);

  // -------------------------------------------------------------------------
  // Cut the body along one of its neck edge loops (a ring of quad edges round the neck: the
  // flattest one near CUT_Y) and drop everything above it.
  const nb = b.pos.length;
  const nq = b.quads.length / 4;
  const ek = (a: number, c: number) => (a < c ? a * 1048576 + c : c * 1048576 + a);
  const edgeQuads = new Map<number, number[]>();
  for (let f = 0; f < nq; f++)
    for (let k = 0; k < 4; k++) {
      const e = ek(b.quads[f * 4 + k], b.quads[f * 4 + ((k + 1) % 4)]);
      let l = edgeQuads.get(e);
      if (!l) edgeQuads.set(e, (l = []));
      l.push(f);
    }
  const vAdj = adjacency(b.quads, 4);
  /** The edge loop through a→c: straight on through every valence-4 vertex. */
  const walk = (a: number, c: number): number[] | null => {
    const loop = [a];
    let prev = a;
    let cur = c;
    for (let step = 0; step < 400; step++) {
      if (cur === a) return loop;
      loop.push(cur);
      const nbrs = vAdj.get(cur)!;
      if (nbrs.size !== 4) return null;
      const side = new Set<number>();
      for (const q of edgeQuads.get(ek(prev, cur)) ?? []) for (let k = 0; k < 4; k++) side.add(b.quads[q * 4 + k]);
      const on = [...nbrs].filter((u) => !side.has(u));
      if (on.length !== 1) return null;
      prev = cur;
      cur = on[0];
    }
    return null;
  };
  let A: number[] = [];
  {
    let best = Infinity;
    for (let v = 0; v < nb; v++) {
      const p = b.pos[v];
      if (Math.abs(p[2]) > 1.5 || p[0] < 2 || Math.abs(p[1] - CUT_Y) > 3) continue;
      // Start along the most horizontal edge.
      const u = [...vAdj.get(v)!].sort((x, y) => {
        const h = (w: number) => Math.abs(b.pos[w][1] - p[1]) / (Math.abs(b.pos[w][2] - p[2]) + 1e-6);
        return h(x) - h(y);
      })[0];
      const loop = walk(v, u);
      if (!loop || loop.length < 16) continue;
      const ys = loop.map((w) => b.pos[w][1]);
      const mean = ys.reduce((s, y) => s + y, 0) / ys.length;
      const spread = Math.max(...ys) - Math.min(...ys);
      const score = Math.abs(mean - CUT_Y) + spread;
      if (spread < 6 && score < best) {
        best = score;
        A = loop;
      }
    }
  }
  if (!A.length) throw new Error("no neck edge loop near the cut");
  // Everything reachable from the top of the head without crossing the loop goes.
  const kept: number[] = [];
  {
    const loopEdges = new Set<number>(A.map((v, i) => ek(v, A[(i + 1) % A.length])));
    let top = 0;
    for (let v = 1; v < nb; v++) if (b.pos[v][1] > b.pos[top][1]) top = v;
    const gone = new Uint8Array(nq);
    const stack = [...new Set([...vAdj.get(top)!].flatMap((u) => edgeQuads.get(ek(top, u)) ?? []))];
    for (const f of stack) gone[f] = 1;
    while (stack.length) {
      const f = stack.pop()!;
      for (let k = 0; k < 4; k++) {
        const e = ek(b.quads[f * 4 + k], b.quads[f * 4 + ((k + 1) % 4)]);
        if (loopEdges.has(e)) continue;
        for (const g of edgeQuads.get(e)!)
          if (!gone[g]) {
            gone[g] = 1;
            stack.push(g);
          }
      }
    }
    for (let f = 0; f < nq; f++) if (!gone[f]) for (let k = 0; k < 4; k++) kept.push(b.quads[f * 4 + k]);
    // Walk the loop the way the kept quads walk their edges.
    const walked = new Set<number>();
    for (let f = 0; f < kept.length; f += 4) for (let k = 0; k < 4; k++) walked.add(kept[f + k] * 1048576 + kept[f + ((k + 1) % 4)]);
    if (!walked.has(A[0] * 1048576 + A[1])) A.reverse();
    const ys = A.map((v) => b.pos[v][1]);
    console.log(`neck loop: ${A.length} vertices, y ${Math.min(...ys).toFixed(1)}…${Math.max(...ys).toFixed(1)}; ${nq - kept.length / 4} quads replaced`);
  }

  // The head, its neck edge thinned to the body's loop.
  const thinned = thinBoundary({ pos: Float64Array.from(src.pos), tri: src.tri }, A.length);
  const hn = thinned.pos.length / 3;
  const hp: V3[] = Array.from({ length: hn }, (_, i) => toBind([thinned.pos[i * 3], thinned.pos[i * 3 + 1], thinned.pos[i * 3 + 2]]));
  const htri = Array.from(thinned.tri);
  const hLoops = boundaryLoops(htri);
  if (hLoops.length !== 1) throw new Error(`the head has ${hLoops.length} open edges (expected the neck only)`);
  // The head walks its edge the other way round from the body.
  const B = [...hLoops[0]].reverse();
  const na = A.length;
  // Both edges must run the same way round the neck (signed area seen from above).
  const area = (pts: V3[]) => pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length][2] - pts[(i + 1) % pts.length][0] * p[2], 0);
  if (Math.sign(area(A.map((v) => b.pos[v]))) !== Math.sign(area(B.map((v) => hp[v])))) throw new Error("the neck edges run opposite ways (orientation mismatch)");
  // Pair the edges by the direction round each one's own centre, from the front of the neck,
  // and place each head edge vertex on the head's original (unthinned) edge where its partner
  // sits on the body's loop, so the strip between them is made of upright quads.
  {
    const front = (pts: V3[]) => pts.reduce((k, p, i) => (p[0] - Math.abs(p[2]) > pts[k][0] - Math.abs(pts[k][2]) ? i : k), 0);
    /** Unwrapped direction round the centre, 0…1 over the loop; held where a concave stretch turns back. */
    const params = (pts: V3[]) => {
      const c = mul(pts.reduce(add, [0, 0, 0] as V3), 1 / pts.length);
      const az = (p: V3) => Math.atan2(p[2] - c[2], p[0] - c[0]);
      const out = [0];
      let prev = az(pts[0]);
      for (let i = 1; i <= pts.length; i++) {
        const a = az(pts[i % pts.length]);
        const d = Math.atan2(Math.sin(a - prev), Math.cos(a - prev));
        prev = a;
        out.push(out[i - 1] + d);
      }
      const total = out[pts.length];
      let hold = 0;
      return out.map((x) => (hold = Math.max(hold, x / total)));
    };
    const fa = front(A.map((v) => b.pos[v]));
    A.push(...A.splice(0, fa));
    const tA = params(A.map((v) => b.pos[v]));
    const edge0 = [...boundaryLoops(src.tri)[0]].reverse().map((i) => toBind([src.pos[i * 3], src.pos[i * 3 + 1], src.pos[i * 3 + 2]]));
    const edge = [...edge0.slice(front(edge0)), ...edge0.slice(0, front(edge0))];
    const tE = params(edge);
    const at = (t: number): V3 => {
      let k = 1;
      while (k < tE.length - 1 && tE[k] < t) k++;
      const u = (t - tE[k - 1]) / (tE[k] - tE[k - 1] || 1);
      const p = edge[k - 1];
      const q = edge[k % edge.length];
      return add(p, mul(sub(q, p), u));
    };
    const targets = A.map((_, i) => at(tA[i]));
    let shift = 0;
    let best = Infinity;
    for (let s = 0; s < na; s++) {
      let d = 0;
      for (let i = 0; i < na; i++) d += len(sub(hp[B[(i + s) % na]], targets[i])) ** 2;
      if (d < best) {
        best = d;
        shift = s;
      }
    }
    B.push(...B.splice(0, shift));
    B.forEach((v, i) => (hp[v] = targets[i]));
  }
  // Thinning and moving the edge leaves long, thin triangles along it: even them out over the
  // three rings of vertices next to it, keeping to the head's surface.
  {
    const ref = new SurfaceIndex({ pos: Float64Array.from(Array.from({ length: src.pos.length / 3 }, (_, i) => toBind([src.pos[i * 3], src.pos[i * 3 + 1], src.pos[i * 3 + 2]])).flat()), tri: src.tri }, 2);
    const adj = adjacency(htri, 3);
    const near = new Set<number>(B);
    let ring = [...B];
    for (let r = 0; r < 3; r++) {
      const next: number[] = [];
      for (const v of ring)
        for (const u of adj.get(v)!)
          if (!near.has(u)) {
            near.add(u);
            next.push(u);
          }
      ring = next;
    }
    const relaxed = relax({ pos: Float64Array.from(hp.flat()), tri: Uint32Array.from(htri) }, ref, 12, (v) => near.has(v));
    for (let v = 0; v < hn; v++) hp[v] = [relaxed.pos[v * 3], relaxed.pos[v * 3 + 1], relaxed.pos[v * 3 + 2]];
  }

  // Meet in the middle: the sculpt's neck is much thicker at the back (its trapezius runs high
  // up the neck), so paired edge vertices lie up to ~7 cm apart there. The top of the body's
  // neck moves by BODY_SHARE of each pair's horizontal offset (fully at the cut, fading out
  // below: low at the back, higher at the sides, under the throat at the front) and the head's
  // neck by the rest (fully at its edge, fading out above: just under the chin, up to the
  // hairline at the back), so each pair ends up one above the other.
  // Both blends are harmonic: the edge's offset spreads smoothly over the surface (solved on
  // the mesh) to zero at the far end of the blend, so sloping parts don't shear into folds.
  const BODY_SHARE = 0.3;
  const pos = b.pos.map((p) => [...p] as V3);
  // Head vertices are numbered after the body's (unused body vertices are dropped at the end).
  const H0 = nb;
  /** How much of the blend each vertex takes (1 at the seam, 0 where the blend ends). */
  const blend = new Map<number, number>();
  {
    const rA = periodic(A.map((v) => [azimuth(b.pos[v]), radius(b.pos[v])]));
    const offset = A.map((v, i): V3 => [hp[B[i]][0] - b.pos[v][0], 0, hp[B[i]][2] - b.pos[v][2]]);
    // Body: from the loop down 3.5 cm under the throat, 4 cm at the sides of the neck and 9 cm
    // at the back of the neck; not over the trapezius.
    const yA = periodic(A.map((v) => [azimuth(b.pos[v]), b.pos[v][1]]));
    const bodyAdj = adjacency(kept, 4);
    const bodyFixed = new Map<number, V3>();
    A.forEach((v, i) => bodyFixed.set(v, mul(offset[i], BODY_SHARE)));
    const bodyFree: number[] = [];
    for (const v of bodyAdj.keys()) {
      if (bodyFixed.has(v)) continue;
      const p = b.pos[v];
      const th = azimuth(p);
      const at = Math.abs(th);
      const low = yA(th) - 3.5 - 0.5 * smooth(0, Math.PI / 2, at) - 5 * smooth(Math.PI / 2, Math.PI, at);
      if (p[1] < low || radius(p) - rA(th) > 6) bodyFixed.set(v, [0, 0, 0]);
      else bodyFree.push(v);
    }
    for (const [v, d] of harmonic(bodyAdj, bodyFixed, bodyFree)) pos[v] = add(b.pos[v], d);
    const bodyT = new Map<number, V3>();
    for (const [v, d] of bodyFixed) bodyT.set(v, [len(d) > 0 || A.includes(v) ? 1 : 0, 0, 0]);
    for (const [v, t] of harmonic(bodyAdj, bodyT, bodyFree)) blend.set(v, t[0]);
    // Head: from its edge up 2 cm under the chin, 5 cm at the sides (the jaw) and 7 cm at the
    // back (the hairline).
    const yB = periodic(B.map((v) => [azimuth(hp[v]), hp[v][1]]));
    const headAdj = adjacency(htri, 3);
    const headFixed = new Map<number, V3>();
    B.forEach((v, i) => headFixed.set(v, mul(offset[i], BODY_SHARE - 1)));
    const headFree: number[] = [];
    for (let v = 0; v < hn; v++) {
      if (headFixed.has(v)) continue;
      const p = hp[v];
      const th = azimuth(p);
      const at = Math.abs(th);
      const top = yB(th) + 2 + 3 * smooth(0, Math.PI / 2, at) + 2 * smooth(Math.PI / 2, Math.PI, at);
      if (p[1] > top) headFixed.set(v, [0, 0, 0]);
      else headFree.push(v);
    }
    for (const [v, d] of harmonic(headAdj, headFixed, headFree)) hp[v] = add(hp[v], d);
    const headT = new Map<number, V3>();
    for (const v of headFixed.keys()) headT.set(v, [B.includes(v) ? 1 : 0, 0, 0]);
    for (const [v, t] of harmonic(headAdj, headT, headFree)) blend.set(H0 + v, t[0]);
  }

  // -------------------------------------------------------------------------
  // Join the edges with a strip of quads, each head edge vertex above its body loop vertex.
  const strip: number[] = [];
  for (let i = 0; i < na; i++) strip.push(A[(i + 1) % na], A[i], H0 + B[i], H0 + B[(i + 1) % na]);

  // Pair the head's triangles into quads.
  const allPos: V3[] = [...pos, ...hp];
  const flat = new Float64Array(allPos.length * 3);
  allPos.forEach((p, i) => flat.set(p, i * 3));
  const newQuads = [...Array.from(pairTriangles(flat, htri.map((v) => v + H0))), ...strip];

  // Smooth over the blend (Taubin λ|μ, so the neck doesn't shrink), as strongly as each vertex
  // was blended: irons out the creases the reshaping leaves, keeps the sculpt where it wasn't.
  {
    const adj = adjacency([...kept, ...newQuads], 4);
    const weight = new Map<number, number>();
    for (const [v, t] of blend) if (t > 0.01) weight.set(v, Math.sqrt(t));
    for (let it = 0; it < 30; it++)
      for (const f of [0.5, -0.53]) {
        const step = new Map<number, V3>();
        for (const [v, w] of weight) {
          const c: V3 = [0, 0, 0];
          const nbrs = adj.get(v)!;
          for (const u of nbrs) for (let k = 0; k < 3; k++) c[k] += allPos[u][k] / nbrs.size;
          step.set(v, mul(sub(c, allPos[v]), f * w));
        }
        for (const [v, d] of step) allPos[v] = add(allPos[v], d);
      }
    for (let h = 0; h < hn; h++) hp[h] = allPos[H0 + h];
  }
  // Orientation check: every directed edge is walked once at most.
  {
    const walked = new Set<string>();
    for (const f of [kept, newQuads])
      for (let q = 0; q < f.length; q += 4)
        for (let k = 0; k < 4; k++) {
          const e = `${f[q + k]},${f[q + ((k + 1) % 4)]}`;
          if (walked.has(e)) throw new Error(`edge ${e} walked twice: inconsistent orientation at the seam`);
          walked.add(e);
        }
  }

  // -------------------------------------------------------------------------
  // Attributes of the head vertices: copied from the nearest vertices of the old body first.
  const CELL = 3;
  const grid = new Map<string, number[]>();
  b.pos.forEach((p, i) => {
    const k = p.map((x) => Math.floor(x / CELL)).join(",");
    let l = grid.get(k);
    if (!l) grid.set(k, (l = []));
    l.push(i);
  });
  const nearestOld = (p: V3, k: number): [number, number][] => {
    const found: [number, number][] = [];
    const c = p.map((x) => Math.floor(x / CELL));
    for (let r = 1; r <= 4 && found.length < k; r++) {
      found.length = 0;
      for (let x = c[0] - r; x <= c[0] + r; x++)
        for (let y = c[1] - r; y <= c[1] + r; y++)
          for (let z = c[2] - r; z <= c[2] + r; z++) for (const i of grid.get(`${x},${y},${z}`) ?? []) found.push([i, len(sub(b.pos[i], p))]);
    }
    return found.sort((u, v) => u[1] - v[1]).slice(0, k);
  };

  const n = allPos.length;
  const out: Body = {
    pos: allPos,
    quads: [...kept, ...newQuads],
    bones: new Uint8Array(n * 4),
    weights: new Uint8Array(n * 4),
    info: new Uint8Array(n * 4),
    fibre: new Int8Array(n * 4),
    extra: new Float32Array(n * 4),
    fuv: new Float32Array(n * 2),
    seg: new Uint8Array(n * 4),
  };
  out.bones.set(b.bones);
  out.weights.set(b.weights);
  out.info.set(b.info);
  out.fibre.set(b.fibre);
  out.extra.set(b.extra);
  out.fuv.set(b.fuv);
  out.seg.set(b.seg);
  const acc = new Map<number, number>();
  for (let h = 0; h < hn; h++) {
    const v = H0 + h;
    const near = nearestOld(hp[h], 6);
    const [i0] = near[0];
    for (let k = 0; k < 4; k++) {
      out.info[v * 4 + k] = b.info[i0 * 4 + k];
      out.fibre[v * 4 + k] = b.fibre[i0 * 4 + k];
      out.extra[v * 4 + k] = b.extra[i0 * 4 + k];
      out.seg[v * 4 + k] = b.seg[i0 * 4 + k];
    }
    out.fuv[v * 2] = b.fuv[i0 * 2];
    out.fuv[v * 2 + 1] = b.fuv[i0 * 2 + 1];
    // Skin weights: inverse-distance blend of the nearest vertices, top 4.
    acc.clear();
    for (const [i, d] of near) {
      const wd = 1 / (d + 0.5);
      for (let k = 0; k < 4; k++) {
        const w = (b.weights[i * 4 + k] / 255) * wd;
        if (w > 0) acc.set(b.bones[i * 4 + k], (acc.get(b.bones[i * 4 + k]) ?? 0) + w);
      }
    }
    const order = [...acc.entries()].sort((u, w) => w[1] - u[1]).slice(0, 4);
    const tot = order.reduce((s, [, w]) => s + w, 0);
    let left = 255;
    order.forEach(([bone, w], k) => {
      const q = k === order.length - 1 ? left : Math.min(left, Math.round((w / tot) * 255));
      out.bones[v * 4 + k] = bone;
      out.weights[v * 4 + k] = q;
      left -= q;
    });
  }

  // Hair, brows, lips and eyes.
  paintHead(out, H0, hn, htri, eyes, newEyeMid);

  // Drop the old head's vertices.
  const remap = new Int32Array(n).fill(-1);
  let m = 0;
  const usedV = new Uint8Array(n);
  for (const v of out.quads) usedV[v] = 1;
  for (let v = 0; v < n; v++) if (usedV[v]) remap[v] = m++;
  const pick = <T extends Uint8Array | Int8Array | Float32Array>(arr: T, k: number): T => {
    const r = new (arr.constructor as new (n: number) => T)(m * k);
    for (let v = 0; v < n; v++) if (remap[v] >= 0) for (let c = 0; c < k; c++) r[remap[v] * k + c] = arr[v * k + c];
    return r;
  };
  const body: Body = {
    pos: out.pos.filter((_, v) => remap[v] >= 0),
    quads: out.quads.map((v) => remap[v]),
    bones: pick(out.bones, 4),
    weights: pick(out.weights, 4),
    info: pick(out.info, 4),
    fibre: pick(out.fibre, 4),
    extra: pick(out.extra, 4),
    fuv: pick(out.fuv, 2),
    seg: pick(out.seg, 4),
  };
  console.log(`head: ${hn} vertices, ${newQuads.length / 4} quads (neck loop ${A.length}); body ${nb} → ${body.pos.length} vertices`);
  return { body, eyeMid: newEyeMid };
}

// ---------------------------------------------------------------------------
// Painting the stylised head (bind cm, relative to its eye mid-point unless stated).

/**
 * Hairline of the sculpted cut, measured on this head (cm above eye level by azimuth round
 * the skull: 0° = forward, 90° = the side, 180° = the back): under the front of the
 * pompadour, receding at the temples, down to short sideburns, over the ear and down to the
 * nape. The sculpted hair mass sits above it.
 */
const HAIRLINE: [number, number][] = [
  [0, 6.9], [18, 6.7], [32, 5.6], [44, 4.3], [56, 3.2], [66, 2.0], [74, 0.6], [80, 0.4],
  [86, 2.6], [100, 2.9], [112, 2.2], [120, 0.2], [128, -2.4], [140, -4.6], [158, -6.0], [180, -6.4],
];
/** Skull axis (cm behind the eyes) that the hairline's azimuths are measured round. */
const SKULL_BACK = 8.5;
/** Brow height above each eyeball's centre (cm): on the sculpt's brow ridge. */
const BROW_Y = 1.45;
/** Mouth: the lip line (cm below eye level), upper and lower lip heights, half width. */
const MOUTH = { y: 6.75, upper: 1.0, lower: 1.0, half: 2.5 };
/** Eye-local depth of the iris centre behind the front of the eyeball (cm). */
const EYE_DEPTH = 1.15;

function paintHead(b: Body, h0: number, hn: number, tri: number[], eyes: { c: V3; r: number }[], eyeMid: V3) {
  const at = (v: number) => b.pos[h0 + v];
  // Vertex normals of the head.
  const nrm: V3[] = Array.from({ length: hn }, () => [0, 0, 0]);
  for (let t = 0; t < tri.length; t += 3) {
    const [a, c, d] = [tri[t], tri[t + 1], tri[t + 2]];
    const e1 = sub(at(c), at(a));
    const e2 = sub(at(d), at(a));
    const fn: V3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    for (const v of [a, c, d]) nrm[v] = add(nrm[v], fn);
  }
  for (let v = 0; v < hn; v++) nrm[v] = mul(nrm[v], 1 / (len(nrm[v]) || 1));

  // Eyes: the visible part of each sculpted eyeball. The iris is centred on the lid opening,
  // looking straight ahead.
  const isEye = (v: number) => eyes.some((e) => Math.abs(len(sub(at(v), e.c)) - e.r) < 0.06 && at(v)[0] > e.c[0]);
  const irisC = eyes.map((e) => {
    const vs = [...Array(hn).keys()].filter((v) => isEye(v) && Math.sign(at(v)[2] - eyeMid[2]) === Math.sign(e.c[2] - eyeMid[2]));
    const m = mul(vs.map(at).reduce(add, [0, 0, 0] as V3), 1 / vs.length);
    const front = Math.max(...vs.map((v) => at(v)[0]));
    return [front - EYE_DEPTH, m[1], m[2]] as V3;
  });

  const hairlineAt = (deg: number) => {
    const d = Math.min(180, Math.max(0, deg));
    let k = 1;
    while (k < HAIRLINE.length - 1 && HAIRLINE[k][0] < d) k++;
    const [d0, h0_] = HAIRLINE[k - 1];
    const [d1, h1] = HAIRLINE[k];
    // A little irregularity so it reads as hair, not a stencil.
    return h0_ + ((h1 - h0_) * (d - d0)) / (d1 - d0) + 0.16 * Math.sin(d * 0.3);
  };
  const skullX = eyeMid[0] - SKULL_BACK;
  /** Signed distance (scaled for a soft edge; < 0 = hair) to the scalp hair. */
  const hairAt = (p: V3) => {
    const r = sub(p, eyeMid);
    if (r[1] < -10) return 3;
    const cx = p[0] - skullX;
    const deg = (Math.atan2(Math.abs(r[2]), cx) * 180) / Math.PI;
    const rho = Math.max(4, Math.hypot(cx, r[2]));
    const slope = (hairlineAt(deg + 1) - hairlineAt(deg - 1)) / ((2 * rho * Math.PI) / 180);
    const d = (hairlineAt(deg) - r[1]) / Math.sqrt(1 + slope * slope);
    return Math.max(-3, Math.min(3, d * 0.2));
  };
  /** Brows, as on the body's own head (see build.ts browAt), on this head's brow ridge. */
  const browAt = (p: V3, n: V3) => {
    if (n[0] < 0.2) return 3;
    let best = 3;
    for (const e of eyes) {
      if (p[0] < e.c[0] - 2) continue;
      const u = (p[2] - e.c[2]) * Math.sign(e.c[2] - eyeMid[2]);
      const dy = p[1] - e.c[1];
      const yc = BROW_Y + 0.08 * smooth(-1.6, 1.0, u) - 0.1 * smooth(1.4, 2.9, u);
      const th = 0.23 - 0.04 * smooth(-1.5, 0.3, u) - 0.14 * smooth(0.9, 2.8, u);
      const across = dy > yc ? (dy - yc - th) * 0.6 : (yc - dy - th) * 0.85;
      const along = Math.max((-1.5 - u) * 0.6, u - 2.6);
      const d = across > 0 && along > 0 ? Math.hypot(across, along) : Math.max(across, along);
      if (d > 2.5) continue;
      const dens = 0.45 + 0.3 * smooth(-1.5, -0.4, u) - 0.2 * smooth(1.5, 2.6, u);
      best = Math.min(best, Math.max(0.035 + (1 - dens) * 0.13, 0.035 + d * 0.5));
    }
    return best;
  };
  /**
   * Skin tone (-1…1, seg.w; see build.ts faceTone): > 0 warms the skin (cheeks, nose, ears),
   * ≥ 0.62 is lip colour, < 0 shades it (under the eyes, a light stubble shadow), ≤ -0.62 is
   * the upper lash line.
   */
  const toneAt = (v: number, p: V3, n: V3) => {
    const r = sub(p, eyeMid);
    if (r[1] < -14 || r[1] > 10) return 0;
    const u = Math.abs(r[2]);
    const g = (dx: number, dy: number, sx: number, sy: number) => Math.exp(-0.5 * ((dx / sx) ** 2 + (dy / sy) ** 2));
    const front = smooth(-0.1, 0.5, n[0]);
    // Lips: the vermilion between the borders, tapering into the corners.
    const k = Math.min(1, u / MOUTH.half);
    const hU = MOUTH.upper * Math.max(0, 1 - k ** 2.2) ** 0.6 + 0.06 * Math.exp(-(((u - 0.4) / 0.2) ** 2)) - 0.04 * Math.exp(-((u / 0.16) ** 2));
    const hL = MOUTH.lower * Math.max(0, 1 - k * k) ** 0.55;
    const dm = r[1] + MOUTH.y;
    const inside = dm > 0 ? hU - dm : hL + dm;
    const lip = n[0] > 0.2 && r[0] > -3 ? smooth(-0.06, dm > 0 ? 0.12 : 0.24, inside) * (1 - smooth(MOUTH.half - 0.2, MOUTH.half + 0.15, u)) : 0;
    let t = 0;
    t += 0.35 * g(u - 3.0, r[1] + 2.8, 1.5, 1.2) * front; // cheeks
    t += 0.3 * g(u, r[1] + 3.9, 0.9, 0.9) * smooth(-1, 1, r[0]); // nose tip
    t += 0.45 * smooth(5.6, 6.6, u) * smooth(-5.5, -4, r[1]) * (1 - smooth(2, 3.5, r[1])) * smooth(-12, -9.5, r[0]) * (1 - smooth(-6, -4, r[0])); // ears
    t += 0.12 * g(u, r[1] + 9.6, 1.8, 1.1) * front; // chin
    t -= 0.28 * g(u - 2.6, r[1] + 1.2, 1.0, 0.4) * smooth(-2.5, -0.5, r[0]); // under the eyes
    t -= 0.12 * front * smooth(-4.5, -6, r[1]) * (1 - smooth(4.5, 6, u)); // stubble shadow
    t = t * (1 - lip) + (0.62 + 0.38 * lip) * lip;
    if (r[0] > -3) t -= 0.3 * g(u - MOUTH.half + 0.1, dm, 0.35, 0.3); // the corners of the mouth
    // Lash line: the skin along the upper lid margin.
    for (let e = 0; e < eyes.length; e++) {
      const ic = irisC[e];
      const rel = sub(p, ic);
      if (rel[1] < 0 || Math.abs(rel[2]) > 1.1 || rel[0] < 0) continue;
      let near = Infinity;
      for (const w of lidRim[e]) near = Math.min(near, len(sub(p, at(w))));
      if (near < 0.3) t = Math.min(t, -0.62 - 0.38 * (1 - smooth(0.05, 0.3, near)) * smooth(1.1, 0.6, Math.abs(rel[2])));
    }
    void v;
    return Math.max(-1, Math.min(1, t));
  };
  // Eye vertices on the rim of each opening (next to the lids).
  const eyeSet = new Set([...Array(hn).keys()].filter(isEye));
  const nbr = new Map<number, Set<number>>();
  for (let t = 0; t < tri.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const a = tri[t + k];
      const c = tri[t + ((k + 1) % 3)];
      if (!nbr.has(a)) nbr.set(a, new Set());
      if (!nbr.has(c)) nbr.set(c, new Set());
      nbr.get(a)!.add(c);
      nbr.get(c)!.add(a);
    }
  const lidRim = eyes.map((_, e) =>
    [...eyeSet].filter((v) => Math.sign(at(v)[2] - eyeMid[2]) === Math.sign(eyes[e].c[2] - eyeMid[2]) && [...nbr.get(v)!].some((u) => !eyeSet.has(u))),
  );

  for (let h = 0; h < hn; h++) {
    const v = h0 + h;
    const p = at(h);
    const n = nrm[h];
    let material = MAT_SKIN;
    const browD = browAt(p, n);
    const hairD = Math.min(hairAt(p), browD);
    if (eyeSet.has(h)) material = MAT_EYE;
    else if (hairD < 0.1) material = MAT_HAIR;
    b.info[v * 4 + 1] = material;
    b.fibre[v * 4 + 3] = material;
    // The face and scalp carry no muscle map, ink or fibre relief; brows a hint of hair texture.
    if (p[1] > eyeMid[1] - 13) {
      b.info[v * 4] = 255;
      b.seg[v * 4] = 255;
      b.seg[v * 4 + 1] = 255;
      b.extra[v * 4] = 99;
    }
    b.info[v * 4 + 2] = material === MAT_HAIR && browD < hairAt(p) ? 50 : 0;
    if (material !== MAT_SKIN) {
      b.info[v * 4] = 255;
      b.seg[v * 4] = 255;
      b.seg[v * 4 + 1] = 255;
      b.fuv[v * 2] = 1e6;
      b.fuv[v * 2 + 1] = 0;
    }
    if (material === MAT_EYE) {
      // Eye-local position (cm / 2) relative to the iris centre, as the eye spheres store it.
      const e = Math.sign(p[2] - eyeMid[2]) === Math.sign(eyes[0].c[2] - eyeMid[2]) ? 0 : 1;
      const local = sub(p, irisC[e]);
      for (let c = 0; c < 3; c++) b.fibre[v * 4 + c] = Math.round(Math.max(-1, Math.min(1, local[c] / 2)) * 127);
      b.extra[v * 4 + 3] = 15;
      b.seg[v * 4 + 3] = 128;
    } else {
      b.extra[v * 4 + 3] = hairD;
      b.seg[v * 4 + 3] = Math.round((toneAt(h, p, n) + 1) * 127.5);
    }
  }
}
