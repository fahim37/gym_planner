/**
 * Binary layout of the sculpted body asset (quantised; gzipped + base64 in mh-body.ts).
 *
 *   u32 magic, u32 vertex count, u32 quad count, 2 × (f32 x, y, z, radius) eyes
 *   i16 × 3n   position, cm × 50
 *   i16 × 2n   fibre surface coordinates, cm × 10 (−32768 = none)
 *   u16 × 4q   quads
 *   u8  × 4n   bones, weights, info, then i8 × 4n fibre, i8/u8 × 4n extra, u8 × 4n seg
 */

export interface AssetData {
  /** Bind-pose positions, cm. */
  position: Float32Array;
  quads: Uint32Array;
  bones: Uint8Array;
  weights: Uint8Array;
  info: Uint8Array;
  fibre: Int8Array;
  /** Ink field (cm, 99 = none), AO, tone, hair distance. */
  extra: Float32Array;
  /** Fibre surface coordinates (cm); x > 1e5 = none. */
  fuv: Float32Array;
  seg: Uint8Array;
  eyes: { c: [number, number, number]; r: number }[];
}

const MAGIC = 0x31424d48; // "HMB1"
const HEADER = 12 + 32;

export function encodeAsset(a: AssetData): Uint8Array {
  const n = a.position.length / 3;
  const q = a.quads.length / 4;
  const size = HEADER + n * 6 + n * 4 + q * 8 + n * 4 * 6;
  const buf = new ArrayBuffer(size);
  const dv = new DataView(buf);
  dv.setUint32(0, MAGIC, true);
  dv.setUint32(4, n, true);
  dv.setUint32(8, q, true);
  a.eyes.forEach((e, i) => {
    for (let c = 0; c < 3; c++) dv.setFloat32(12 + i * 16 + c * 4, e.c[c], true);
    dv.setFloat32(12 + i * 16 + 12, e.r, true);
  });
  let o = HEADER;
  const i16 = (vals: ArrayLike<number>, f: (v: number, i: number) => number) => {
    for (let i = 0; i < vals.length; i++, o += 2) dv.setInt16(o, Math.max(-32768, Math.min(32767, Math.round(f(vals[i], i)))), true);
  };
  i16(a.position, (v) => v * 50);
  i16(a.fuv, (v, i) => (a.fuv[i - (i % 2)] > 1e5 ? -32768 : v * 10));
  for (let i = 0; i < a.quads.length; i++, o += 2) dv.setUint16(o, a.quads[i], true);
  const u8 = new Uint8Array(buf);
  for (const arr of [a.bones, a.weights, a.info]) {
    u8.set(arr, o);
    o += arr.length;
  }
  new Int8Array(buf, o, n * 4).set(a.fibre);
  o += n * 4;
  for (let i = 0; i < n; i++, o += 4) {
    const line = a.extra[i * 4];
    dv.setInt8(o, line > 50 ? 127 : Math.max(-126, Math.min(126, Math.round(line * 40))));
    dv.setUint8(o + 1, Math.round(Math.max(0, Math.min(1, a.extra[i * 4 + 1])) * 255));
    dv.setInt8(o + 2, Math.max(-127, Math.min(127, Math.round(a.extra[i * 4 + 2] * 127))));
    dv.setInt8(o + 3, Math.max(-127, Math.min(127, Math.round(a.extra[i * 4 + 3] * 40))));
  }
  u8.set(a.seg, o);
  return u8;
}

export function decodeAsset(u8: Uint8Array): AssetData {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error("bad body asset");
  const n = dv.getUint32(4, true);
  const q = dv.getUint32(8, true);
  const eyes = [0, 1].map((i) => ({
    c: [0, 1, 2].map((c) => dv.getFloat32(12 + i * 16 + c * 4, true)) as [number, number, number],
    r: dv.getFloat32(12 + i * 16 + 12, true),
  }));
  let o = HEADER;
  const position = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++, o += 2) position[i] = dv.getInt16(o, true) / 50;
  const fuv = new Float32Array(n * 2);
  for (let i = 0; i < n * 2; i++, o += 2) {
    const v = dv.getInt16(o, true);
    fuv[i] = v === -32768 ? 1e6 : v / 10;
  }
  const quads = new Uint32Array(q * 4);
  for (let i = 0; i < q * 4; i++, o += 2) quads[i] = dv.getUint16(o, true);
  const take = (len: number) => {
    const out = u8.slice(o, o + len);
    o += len;
    return out;
  };
  const bones = take(n * 4);
  const weights = take(n * 4);
  const info = take(n * 4);
  const fibre = new Int8Array(take(n * 4).buffer);
  const extra = new Float32Array(n * 4);
  for (let i = 0; i < n; i++, o += 4) {
    const line = dv.getInt8(o);
    extra[i * 4] = line === 127 ? 99 : line / 40;
    extra[i * 4 + 1] = dv.getUint8(o + 1) / 255;
    extra[i * 4 + 2] = dv.getInt8(o + 2) / 127;
    extra[i * 4 + 3] = dv.getInt8(o + 3) / 40;
  }
  const seg = take(n * 4);
  // Every fuv pair marked "none" keeps x > 1e5.
  for (let i = 0; i < n; i++) if (fuv[i * 2] > 1e5) fuv[i * 2 + 1] = 0;
  return { position, quads, bones, weights, info, fibre, extra, fuv, seg, eyes };
}
