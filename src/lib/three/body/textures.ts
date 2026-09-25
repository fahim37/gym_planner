import * as THREE from "three";

/**
 * Tileable normal map of muscle fibres: bundles of fibres running along the
 * texture's u axis, with finer fibres inside each bundle. RGB is the normal,
 * A the height (used to darken the grooves between fibres).
 */
export function fibreNormalMap(size = 512): THREE.DataTexture {
  const H = new Float32Array(size * size);
  const hash = (n: number) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const BUNDLES = 11;
  const FINE = 4;
  const TAU = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // Bundles wander a little along their length (periodic in u).
      const wob = 0.28 * Math.sin(TAU * (2 * u + hash(Math.floor(v * BUNDLES)) * 3)) + 0.12 * Math.sin(TAU * (5 * u + 0.3));
      const fy = v * BUNDLES + wob;
      const b = Math.floor(fy);
      const bi = ((b % BUNDLES) + BUNDLES) % BUNDLES;
      const f = fy - b;
      const ridge = Math.pow(Math.max(0, 1 - (2 * f - 1) * (2 * f - 1)), 0.6);
      const amp = 0.65 + 0.35 * hash(bi + 7);
      const along = 0.82 + 0.18 * Math.sin(TAU * (3 * u + hash(bi + 3) * 5));
      // Fine fibres inside the bundle.
      const ff = (fy * FINE + 0.18 * Math.sin(TAU * (7 * u + hash(bi) * 4))) % 1;
      const fine = Math.max(0, 1 - (2 * ff - 1) * (2 * ff - 1));
      H[y * size + x] = amp * ridge * along * 0.8 + fine * 0.22 * ridge;
    }
  }
  const data = new Uint8Array(size * size * 4);
  const strength = 3.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = (xx: number, yy: number) => H[((yy + size) % size) * size + ((xx + size) % size)];
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      data[i] = Math.round(((-dx / l) * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round(((-dy / l) * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255);
      data[i + 3] = Math.round(Math.min(1, H[y * size + x]) * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}
