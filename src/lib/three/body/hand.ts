/**
 * Hand layout shared by the sculpt (bind geometry) and the rig (finger bones).
 *
 * Hand-local coordinates, centimetres, origin at the wrist joint:
 *   p – palmar (the direction the palm faces)
 *   a – along the hand, towards the fingertips
 *   r – radial (towards the thumb)
 */

export interface FingerSpec {
  /** Base joint (MCP; CMC for the thumb) in hand-local [p, a, r]. */
  base: [number, number, number];
  /** Bind direction of the first segment in hand-local [p, a, r] (normalised on use). */
  dir: [number, number, number];
  /** Segment lengths, proximal → distal. */
  lengths: [number, number, number];
  /** Radius at each joint and at the tip: [base, j1, j2, tip]. */
  radii: [number, number, number, number];
  /** Maximum flexion per joint, degrees. */
  maxFlex: [number, number, number];
}

/** Elbow to wrist joint along the forearm (cm); the solver's "wrist" sits 2.5 cm further. */
export const FOREARM = 25.5;

export const THUMB = 0;

export const FINGERS: FingerSpec[] = [
  // Thumb: metacarpal, proximal, distal.
  { base: [1.0, 2.3, 2.0], dir: [0.42, 0.66, 0.62], lengths: [4.5, 3.2, 2.7], radii: [1.3, 1.12, 1.02, 0.9], maxFlex: [55, 60, 80] },
  // Index, middle, ring, pinky: proximal, middle, distal phalanges.
  { base: [0.15, 9.3, 2.5], dir: [0, 1, 0.07], lengths: [4.3, 2.55, 2.05], radii: [1.0, 0.9, 0.82, 0.72], maxFlex: [95, 110, 85] },
  { base: [0.15, 9.65, 0.55], dir: [0, 1, 0], lengths: [4.75, 2.95, 2.25], radii: [1.03, 0.93, 0.84, 0.74], maxFlex: [95, 110, 85] },
  { base: [0.15, 9.25, -1.4], dir: [0, 1, -0.07], lengths: [4.45, 2.8, 2.15], radii: [0.97, 0.88, 0.8, 0.7], maxFlex: [95, 110, 85] },
  { base: [0.25, 8.45, -3.15], dir: [0, 1, -0.18], lengths: [3.55, 2.15, 1.95], radii: [0.86, 0.78, 0.71, 0.63], maxFlex: [95, 110, 85] },
];

/** Where a gripped handle's axis sits in the hand (cm, hand-local p/a), for a 1.4 cm radius bar. */
export const GRIP_CENTER: [number, number] = [2.7, 7.2];

/** Relaxed curl per finger (MCP, PIP, DIP degrees) and thumb (CMC opposition, MCP, IP). */
export const RELAXED: [number, number, number][] = [
  [12, 12, 14],
  [14, 24, 12],
  [17, 30, 14],
  [21, 34, 16],
  [26, 38, 18],
];

/** Fingers flat on a surface. */
export const FLAT: [number, number, number][] = [
  [4, 6, 6],
  [2, 4, 4],
  [2, 4, 4],
  [2, 4, 4],
  [3, 5, 5],
];

/**
 * Flexion angles (radians) that wrap a finger around a cylinder whose axis is
 * parallel to the knuckles, centred at (cp, ca) in the finger's flexion plane
 * (hand-local palmar / along), with radius `wrap` (handle radius + finger
 * thickness). Each segment's end is placed on the wrap circle, continuing
 * around it; angles are clamped to the finger's range.
 */
export function wrapCurl(f: FingerSpec, cp: number, ca: number, wrap: number, out: number[]) {
  let sp = f.base[0];
  let sa = f.base[1];
  // Current direction in the (p, a) plane.
  let dp = 0;
  let da = 1;
  for (let k = 0; k < 3; k++) {
    const L = f.lengths[k];
    // Intersect circle(S, L) with circle(C, wrap).
    const ex = cp - sp;
    const ey = ca - sa;
    const D = Math.hypot(ex, ey);
    let angle = 0;
    if (D > 1e-6 && D < L + wrap && D > Math.abs(L - wrap)) {
      const aa = (L * L - wrap * wrap + D * D) / (2 * D);
      const h = Math.sqrt(Math.max(0, L * L - aa * aa));
      const mx = sp + (ex * aa) / D;
      const my = sa + (ey * aa) / D;
      // Two candidates; take the one that flexes least past the current direction (continuing around the handle).
      let best = Infinity;
      for (const s of [1, -1]) {
        const px = mx + (s * h * -ey) / D;
        const py = my + (s * h * ex) / D;
        const ux = (px - sp) / L;
        const uy = (py - sa) / L;
        // Signed flexion: rotation from (dp, da) towards +p.
        const cross = da * ux - dp * uy;
        const dotv = dp * ux + da * uy;
        const ang = Math.atan2(cross, dotv);
        if (ang > -0.2 && ang < best) best = ang;
      }
      angle = Number.isFinite(best) ? best : (f.maxFlex[k] * Math.PI) / 180;
    } else if (D <= Math.abs(L - wrap)) {
      angle = (f.maxFlex[k] * Math.PI) / 180;
    }
    angle = Math.min(Math.max(angle, 0), (f.maxFlex[k] * Math.PI) / 180);
    out[k] = angle;
    // Advance along the rotated direction.
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const ndp = dp * c + da * s;
    const nda = -dp * s + da * c;
    dp = ndp;
    da = nda;
    sp += dp * L;
    sa += da * L;
  }
}
