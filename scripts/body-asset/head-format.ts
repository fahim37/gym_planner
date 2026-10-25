/**
 * The extracted stylised head (scripts/body-asset/stylized-head.bin, gzipped):
 *
 *   u32 magic, u32 vertex count, u32 triangle count, 2 × (f32 x, y, z, radius) eyeballs
 *   f32 × 3n   positions (GLB metres: y up, facing +x)
 *   u16 × 3t   triangles
 */
export interface HeadSource {
  pos: Float32Array;
  tri: Uint32Array;
  eyes: { c: [number, number, number]; r: number }[];
}

const MAGIC = 0x31444853; // "SHD1"
const HEADER = 12 + 32;

export function encodeHeadSource(h: HeadSource): Uint8Array {
  const n = h.pos.length / 3;
  const t = h.tri.length / 3;
  if (n > 65535) throw new Error("too many head vertices for u16 indices");
  const buf = new ArrayBuffer(HEADER + n * 12 + t * 6);
  const dv = new DataView(buf);
  dv.setUint32(0, MAGIC, true);
  dv.setUint32(4, n, true);
  dv.setUint32(8, t, true);
  h.eyes.forEach((e, i) => {
    for (let c = 0; c < 3; c++) dv.setFloat32(12 + i * 16 + c * 4, e.c[c], true);
    dv.setFloat32(12 + i * 16 + 12, e.r, true);
  });
  let o = HEADER;
  for (let i = 0; i < n * 3; i++, o += 4) dv.setFloat32(o, h.pos[i], true);
  for (let i = 0; i < t * 3; i++, o += 2) dv.setUint16(o, h.tri[i], true);
  return new Uint8Array(buf);
}

export function decodeHeadSource(u8: Uint8Array): HeadSource {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error("bad head source");
  const n = dv.getUint32(4, true);
  const t = dv.getUint32(8, true);
  const eyes = [0, 1].map((i) => ({
    c: [0, 1, 2].map((c) => dv.getFloat32(12 + i * 16 + c * 4, true)) as [number, number, number],
    r: dv.getFloat32(12 + i * 16 + 12, true),
  }));
  let o = HEADER;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++, o += 4) pos[i] = dv.getFloat32(o, true);
  const tri = new Uint32Array(t * 3);
  for (let i = 0; i < t * 3; i++, o += 2) tri[i] = dv.getUint16(o, true);
  return { pos, tri, eyes };
}
