import { FINGERS } from "./hand";
import {
  A_CLAVICLE,
  A_FINGER,
  A_FORE,
  A_HAND,
  A_TWIST,
  A_UA_ROOT,
  A_UPPER,
  B_CHEST,
  B_HEAD,
  B_NECK,
  B_PELVIS,
  B_SPINE,
  L_FOOT,
  L_SHIN,
  L_THIGH,
  L_THIGH_ROOT,
  L_TOES,
  armBone,
  legBone,
  type BindFrame,
} from "./skeleton";

/**
 * Skinning chains. Every sculpt primitive belongs to a chain (or blends
 * between two along its length); within a chain, bone weights are smooth
 * ramps of the position along the chain's bind axis, so the skin bends
 * evenly across each joint no matter which primitives meet there.
 */

export const CH_TORSO = 0;
export const chArm = (side: number) => 1 + side;
export const chLeg = (side: number) => 3 + side;
export const chFoot = (side: number) => 5 + side;
export const chFinger = (side: number, f: number) => 7 + side * 5 + f;
export const CHAIN_COUNT = 17;

type V3 = [number, number, number];

export interface BindInfo {
  pelvis: V3;
  chest: V3;
  head: V3;
  sides: { shoulder: V3; elbow: V3; wrist: V3; hip: V3; knee: V3; ankle: V3 }[];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export class Chains {
  private shoulder: V3[];
  private armDir: V3[];
  private hip: V3[];
  private legDir: V3[];
  private ankle: V3[];
  private footDir: V3[];
  private fingerBase: V3[][];
  private fingerDir: V3[][];
  private headO: V3;
  private headX: V3;
  private headY: V3;
  /** Arm axis positions (cm from the shoulder) of the elbow and wrist. */
  readonly elbowA: number;
  readonly wristA: number;
  readonly kneeA: number;
  readonly ankleA: number;

  constructor(
    bind: BindInfo,
    private frames: BindFrame[],
  ) {
    this.shoulder = bind.sides.map((s) => s.shoulder);
    this.armDir = bind.sides.map((s) => norm(sub(s.elbow, s.shoulder)));
    this.hip = bind.sides.map((s) => s.hip);
    this.legDir = bind.sides.map((s) => norm(sub(s.knee, s.hip)));
    this.ankle = bind.sides.map((s) => s.ankle);
    this.footDir = [0, 1].map((i) => frames[legBone(i, L_FOOT)].x);
    this.fingerBase = [0, 1].map((i) => FINGERS.map((_, f) => frames[armBone(i, A_FINGER + f * 3)].o));
    this.fingerDir = [0, 1].map((i) => FINGERS.map((_, f) => frames[armBone(i, A_FINGER + f * 3)].y));
    const hf = frames[B_HEAD];
    this.headO = hf.o;
    this.headX = hf.x;
    this.headY = hf.y;
    const s0 = bind.sides[0];
    this.elbowA = Math.hypot(...sub(s0.elbow, s0.shoulder));
    this.wristA = this.elbowA + 25.5;
    this.kneeA = Math.hypot(...sub(s0.knee, s0.hip));
    this.ankleA = this.kneeA + Math.hypot(...sub(s0.ankle, s0.knee));
  }

  /** Position along the side's arm axis, cm from the shoulder joint. */
  armCoord(side: number, x: number, y: number, z: number) {
    const s = this.shoulder[side];
    const d = this.armDir[side];
    return (x - s[0]) * d[0] + (y - s[1]) * d[1] + (z - s[2]) * d[2];
  }

  /** Distance from the arm axis, given the axial coordinate `a`. */
  armRadius(side: number, x: number, y: number, z: number, a: number) {
    const s = this.shoulder[side];
    const d = this.armDir[side];
    return Math.hypot(x - s[0] - d[0] * a, y - s[1] - d[1] * a, z - s[2] - d[2] * a);
  }

  legCoord(side: number, x: number, y: number, z: number) {
    const s = this.hip[side];
    const d = this.legDir[side];
    return (x - s[0]) * d[0] + (y - s[1]) * d[1] + (z - s[2]) * d[2];
  }

  footCoord(side: number, x: number, y: number, z: number) {
    const s = this.ankle[side];
    const d = this.footDir[side];
    return (x - s[0]) * d[0] + (y - s[1]) * d[1] + (z - s[2]) * d[2];
  }

  /** Signed height above the head/neck seam plane (cm), tilted from under the chin to the nape. */
  headCoord(x: number, y: number, z: number) {
    const o = this.headO;
    const lx = (x - o[0]) * this.headX[0] + (y - o[1]) * this.headX[1] + (z - o[2]) * this.headX[2];
    const ly = (x - o[0]) * this.headY[0] + (y - o[1]) * this.headY[1] + (z - o[2]) * this.headY[2];
    // Plane through (forward 6, up −15) and (forward −9, up −11).
    return (ly - (-13.4 - 0.267 * lx)) * 0.966;
  }

  /** Adds `w` × the chain's bone weights at p into `acc` (indexed by bone). */
  add(chain: number, x: number, y: number, z: number, w: number, acc: Float64Array) {
    if (w <= 0) return;
    if (chain === CH_TORSO) {
      const s1 = smooth(100, 117, y);
      const s2 = smooth(121, 139, y);
      const hc = this.headCoord(x, y, z);
      const head = smooth(-4.2, -1.2, hc);
      const r = Math.hypot(x, z);
      const neck = Math.max(smooth(156, 164, y) * (1 - smooth(6.5, 10.5, r)), head);
      acc[B_PELVIS] += w * (1 - s1);
      acc[B_SPINE] += w * s1 * (1 - s2);
      acc[B_CHEST] += w * s2 * (1 - neck);
      acc[B_NECK] += w * s2 * neck * (1 - head);
      acc[B_HEAD] += w * s2 * head;
      return;
    }
    if (chain <= 2) {
      const side = chain - 1;
      const a = this.armCoord(side, x, y, z);
      const e = this.elbowA;
      const wr = this.wristA;
      const r1 = smooth(-5, 5, a);
      const r2 = smooth(3, 24, a);
      const r3 = smooth(e - 3.2, e + 3.4, a);
      const r4 = smooth(e + 4, e + 15, a);
      const r5 = smooth(wr - 8.5, wr + 1, a);
      const bone = (b: number) => armBone(side, b);
      acc[bone(A_CLAVICLE)] += w * (1 - r1);
      acc[bone(A_UA_ROOT)] += w * r1 * (1 - r2);
      acc[bone(A_UPPER)] += w * r2 * (1 - r3);
      acc[bone(A_FORE)] += w * r3 * (1 - r4);
      acc[bone(A_TWIST)] += w * r4 * (1 - r5);
      acc[bone(A_HAND)] += w * r5;
      return;
    }
    if (chain <= 4) {
      const side = chain - 3;
      const a = this.legCoord(side, x, y, z);
      const r1 = smooth(-6, 7, a);
      const r2 = smooth(8, 28, a);
      const r3 = smooth(this.kneeA - 4, this.kneeA + 4, a);
      const r4 = smooth(this.ankleA - 3.5, this.ankleA + 0.5, a);
      const bone = (b: number) => legBone(side, b);
      acc[B_PELVIS] += w * (1 - r1);
      acc[bone(L_THIGH_ROOT)] += w * r1 * (1 - r2);
      acc[bone(L_THIGH)] += w * r2 * (1 - r3);
      acc[bone(L_SHIN)] += w * r3 * (1 - r4);
      acc[bone(L_FOOT)] += w * r4;
      return;
    }
    if (chain <= 6) {
      const side = chain - 5;
      const f = this.footCoord(side, x, y, z);
      const t = smooth(11.4, 13.6, f);
      acc[legBone(side, L_FOOT)] += w * (1 - t);
      acc[legBone(side, L_TOES)] += w * t;
      return;
    }
    const side = chain < 12 ? 0 : 1;
    const f = chain - 7 - side * 5;
    const b = this.fingerBase[side][f];
    const d = this.fingerDir[side][f];
    const u = (x - b[0]) * d[0] + (y - b[1]) * d[1] + (z - b[2]) * d[2];
    const L = FINGERS[f].lengths;
    const r0 = f === 0 ? smooth(-1.2, 1.4, u) : smooth(-1.0, 0.45, u);
    const r1 = smooth(L[0] - 0.5, L[0] + 0.45, u);
    const r2 = smooth(L[0] + L[1] - 0.42, L[0] + L[1] + 0.4, u);
    acc[armBone(side, A_HAND)] += w * (1 - r0);
    acc[armBone(side, A_FINGER + f * 3)] += w * r0 * (1 - r1);
    acc[armBone(side, A_FINGER + f * 3 + 1)] += w * r1 * (1 - r2);
    acc[armBone(side, A_FINGER + f * 3 + 2)] += w * r2;
  }

  frame(b: number) {
    return this.frames[b];
  }
}
