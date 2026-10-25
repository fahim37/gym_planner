/**
 * Offline extraction of the stylised head (see scripts/build-head-source.mjs).
 *
 * Source: the "Male Anatomy Stylized" sculpt (a single ~1M-triangle mesh, metres, y up,
 * facing +x). Steps:
 *   1. crop the head and upper neck (above a tilted plane; the cut is exact, so the neck
 *      boundary is one planar loop);
 *   2. quadric-error decimation to TARGET triangles, then a few rounds of tangential
 *      relaxation, re-projected onto the full-resolution surface;
 *   3. fit a sphere to the visible part of each sculpted eyeball;
 *   4. write scripts/body-asset/stylized-head.bin (gzipped; read by head.ts).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { boundaryLoops, crop, decimate, readGlb, relax, SurfaceIndex, type TriMesh, type V3 } from "./trimesh";
import { encodeHeadSource } from "./head-format";

const src = process.argv[2];
if (!src) throw new Error('usage: node scripts/build-head-source.mjs "<path to Male Anatomy Stylized.glb>"');

/**
 * Crop plane (GLB metres): y + CROP_TILT·x ≥ CROP_Y. It runs 1.5 cm above the body's neck
 * edge loop where the head is joined (head.ts; 164.6 cm at the front rising to 169.7 cm at the
 * back, as placed there): under the chin at the front, below the nape hairline at the back.
 */
const CROP_Y = 0.8674;
const CROP_TILT = 0.455;
const TARGET = 9000;

console.log("reading", src);
const full = readGlb(src);
console.log("source", full.pos.length / 3, "vertices", full.tri.length / 3, "triangles");
const head = crop(full, (p) => p[1] + CROP_TILT * p[0] - CROP_Y);
console.log("cropped", head.pos.length / 3, "vertices", head.tri.length / 3, "triangles");

// ---------------------------------------------------------------------------
// Eyes: sample the front-most surface on a fine grid over each eye (seen from the front) and
// fit a sphere of fixed radius to the samples inside the lid opening.
function frontSurface(m: TriMesh, y0: number, y1: number, z0: number, z1: number, res: number) {
  const W = Math.round((z1 - z0) / res);
  const H = Math.round((y1 - y0) / res);
  const depth = new Float64Array(W * H).fill(-Infinity);
  for (let t = 0; t < m.tri.length; t += 3) {
    const v = [0, 1, 2].map((k) => m.tri[t + k]);
    const gx = v.map((i) => (m.pos[i * 3 + 2] - z0) / res);
    const gy = v.map((i) => (m.pos[i * 3 + 1] - y0) / res);
    if (Math.max(...gx) < 0 || Math.min(...gx) > W || Math.max(...gy) < 0 || Math.min(...gy) > H) continue;
    const area = (gx[1] - gx[0]) * (gy[2] - gy[0]) - (gy[1] - gy[0]) * (gx[2] - gx[0]);
    if (Math.abs(area) < 1e-12) continue;
    for (let j = Math.max(0, Math.floor(Math.min(...gy))); j <= Math.min(H - 1, Math.ceil(Math.max(...gy))); j++)
      for (let i = Math.max(0, Math.floor(Math.min(...gx))); i <= Math.min(W - 1, Math.ceil(Math.max(...gx))); i++) {
        const px = i + 0.5;
        const py = j + 0.5;
        const w0 = ((gx[1] - px) * (gy[2] - py) - (gy[1] - py) * (gx[2] - px)) / area;
        const w1 = ((gx[2] - px) * (gy[0] - py) - (gy[2] - py) * (gx[0] - px)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const x = w0 * m.pos[v[0] * 3] + w1 * m.pos[v[1] * 3] + w2 * m.pos[v[2] * 3];
        if (x > depth[j * W + i]) depth[j * W + i] = x;
      }
  }
  return { W, H, depth };
}

/** Least-squares sphere through the points (algebraic: |p|² = 2c·p + d). */
function fitSphere(pts: V3[]): { c: V3; r: number } {
  const M = Array.from({ length: 4 }, () => [0, 0, 0, 0, 0]);
  for (const [x, y, z] of pts) {
    const row = [2 * x, 2 * y, 2 * z, 1];
    const s = x * x + y * y + z * z;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) M[i][j] += row[i] * row[j];
      M[i][4] += row[i] * s;
    }
  }
  for (let i = 0; i < 4; i++) {
    let p = i;
    for (let k = i + 1; k < 4; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    for (let k = 0; k < 4; k++) {
      if (k === i) continue;
      const f = M[k][i] / M[i][i];
      for (let j = i; j < 5; j++) M[k][j] -= f * M[i][j];
    }
  }
  const s = M.map((row, i) => row[4] / row[i]);
  const c: V3 = [s[0], s[1], s[2]];
  return { c, r: Math.sqrt(s[3] + c[0] ** 2 + c[1] ** 2 + c[2] ** 2) };
}

/**
 * Centres (y, z) of the lid openings, seen from the front, measured on the sculpt: the
 * figure's right eye (+z, as in bind space) first, like the body asset's eyes. The heavy upper
 * lids cover the top of each eyeball, so the openings sit below the eyeballs' centres. The
 * sculpt's eyes differ a little (the left eyeball is flatter), so each gets its own sphere.
 */
const EYE_OPENINGS: [number, number][] = [
  [0.9215, 0.0165],
  [0.9215, -0.0143],
];
const eyes = EYE_OPENINGS.map(([yc, zc]) => {
  const res = 0.0002;
  const y0 = yc - 0.004;
  const z0 = zc - 0.006;
  const { W, H, depth } = frontSurface(head, y0, yc + 0.004, z0, zc + 0.006, res);
  const pts: V3[] = [];
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const z = z0 + (i + 0.5) * res;
      const y = y0 + (j + 0.5) * res;
      if (((z - zc) / 0.003) ** 2 + ((y - yc) / 0.0014) ** 2 <= 1 && depth[j * W + i] > -Infinity) pts.push([depth[j * W + i], y, z]);
    }
  return fitSphere(pts);
});
console.log("eyes", eyes.map((e) => e.c.map((x) => x.toFixed(4)).join(",") + " r" + e.r.toFixed(4)).join(" | "));

/** The mouth (GLB metres), for the decimation weights. */
const MOUTH: V3 = [0.082, 0.8905, 0.0012];

// ---------------------------------------------------------------------------
const index = new SurfaceIndex(head, 0.003);
// Small, expressive features keep a finer mesh: the eyes (the lid margins carry the eye
// material's border) and the lips.
let mesh = decimate(head, TARGET, (p) => {
  let w = 1;
  for (const e of eyes) {
    const d = Math.hypot(p[0] - e.c[0], p[1] - e.c[1], p[2] - e.c[2]) - e.r;
    w = Math.max(w, 1 + 40 * (1 - Math.min(1, Math.max(0, d / 0.004))));
  }
  const m = Math.hypot((p[1] - MOUTH[1]) / 0.008, (p[2] - MOUTH[2]) / 0.022);
  if (p[0] > MOUTH[0] - 0.012) w = Math.max(w, 1 + 8 * (1 - Math.min(1, m)));
  return w;
  // A light hold on the neck edge: it thins out to about the body's neck loop (~1 cm spacing).
}, 1);
const edge = boundaryLoops(mesh.tri);
console.log("neck edge", edge.map((l) => l.length).join(", "), "vertices");
console.log("decimated", mesh.pos.length / 3, "vertices", mesh.tri.length / 3, "triangles");
mesh = relax(mesh, index, 4);

const bin = encodeHeadSource({ pos: Float32Array.from(mesh.pos), tri: mesh.tri, eyes });
const out = join(process.cwd(), "scripts", "body-asset", "stylized-head.bin");
writeFileSync(out, gzipSync(bin, { level: 9 }));
console.log("wrote", out);
