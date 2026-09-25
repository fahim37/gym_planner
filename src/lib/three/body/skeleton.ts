import * as THREE from "three";
import { solvePose } from "../../anatomy/solver";
import type { Pose, Skeleton, Vec3 } from "../../anatomy/types";
import { FINGERS, FLAT, FOREARM, GRIP_CENTER, RELAXED, THUMB, wrapCurl } from "./hand";

/**
 * Bones of the procedural body and how their frames follow the solved pose.
 *
 * Every bone frame is computed by the same code for the bind pose and for
 * any animated pose, so skin matrices are simply pose × bind⁻¹.
 */

/** The pose the mesh is sculpted in: A-pose, straight limbs, feet flat. */
export const BIND_POSE: Pose = {
  hip: [160, 153.3],
  torso: 0,
  head: 0,
  twist: 0,
  arms: [{ angles: [0, 0], spread: [45, 45] }],
  legs: [{ angles: [0, 0], spread: [4, 4] }],
};

// Bone indices ---------------------------------------------------------------
export const B_PELVIS = 0;
export const B_SPINE = 1;
export const B_CHEST = 2;
export const B_NECK = 3;
export const B_HEAD = 4;
const ARM0 = 5;
const ARM_BONES = 21;
const LEG0 = ARM0 + 2 * ARM_BONES;
const LEG_BONES = 5;
export const BONE_COUNT = LEG0 + 2 * LEG_BONES;

export const A_CLAVICLE = 0;
export const A_UA_ROOT = 1;
export const A_UPPER = 2;
export const A_FORE = 3;
export const A_TWIST = 4;
export const A_HAND = 5;
/** First finger bone; finger f, segment k is A_FINGER + f * 3 + k. */
export const A_FINGER = 6;
export const L_THIGH_ROOT = 0;
export const L_THIGH = 1;
export const L_SHIN = 2;
export const L_FOOT = 3;
export const L_TOES = 4;

export const armBone = (side: number, b: number) => ARM0 + side * ARM_BONES + b;
export const legBone = (side: number, b: number) => LEG0 + side * LEG_BONES + b;

/** Bone of the other side (identity for midline bones). */
export function mirrorBone(b: number) {
  if (b >= ARM0 && b < LEG0) return b < ARM0 + ARM_BONES ? b + ARM_BONES : b - ARM_BONES;
  if (b >= LEG0) return b < LEG0 + LEG_BONES ? b + LEG_BONES : b - LEG_BONES;
  return b;
}

/** Offset from the ankle to the ball of the foot (toe joint), in the foot frame: forward, up (cm). */
export const BALL: [number, number] = [12.6, -3.2];

// Hands --------------------------------------------------------------------

export type GripStyle = "overhand" | "underhand" | "neutral";

/** How a hand holds equipment; set by the prop set every frame. */
export interface GripSpec {
  /** Handle radius, metres. */
  radius: number;
  /**
   * World axis of a fixed handle (a bar). When omitted the rig picks the
   * handle orientation from the grip style (dumbbells, kettlebells).
   */
  axis?: THREE.Vector3;
  style?: GripStyle;
}

const PREF: Record<GripStyle, number> = { overhand: 175, underhand: 5, neutral: 90 };
const DEG = Math.PI / 180;
/** Pronation of the hand in the bind pose (palm facing the thigh). */
const BIND_PRONATION = 90;

// Scratch ---------------------------------------------------------------------
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const v4 = new THREE.Vector3();
const q1 = new THREE.Quaternion();
const m1 = new THREE.Matrix4();
const m2 = new THREE.Matrix4();

const toW = (p: Vec3, out: THREE.Vector3) => out.set((p[0] - 160) / 100, (250 - p[1]) / 100, p[2] / 100);
const toD = (d: Vec3, out: THREE.Vector3) => out.set(d[0], -d[1], d[2]).normalize();

/** Rotates `v` about unit `axis` by `angle` radians (in place). */
function rotate(v: THREE.Vector3, axis: THREE.Vector3, angle: number) {
  return v.applyQuaternion(q1.setFromAxisAngle(axis, angle));
}

/** Component of `v` perpendicular to unit `axis`, normalised; falls back to `alt`. */
function perp(v: THREE.Vector3, axis: THREE.Vector3, out: THREE.Vector3, alt?: THREE.Vector3) {
  out.copy(v).addScaledVector(axis, -v.dot(axis));
  if (out.lengthSq() < 1e-8) {
    if (alt) out.copy(alt).addScaledVector(axis, -alt.dot(axis));
    if (out.lengthSq() < 1e-8) out.set(axis.y, axis.z, axis.x).addScaledVector(axis, -axis.dot(v4.set(axis.y, axis.z, axis.x)));
  }
  return out.normalize();
}

/** Signed angle from a to b about unit axis (both ⊥ axis). */
function signedAngle(a: THREE.Vector3, b: THREE.Vector3, axis: THREE.Vector3) {
  return Math.atan2(v4.crossVectors(a, b).dot(axis), a.dot(b));
}

/** Writes a rigid frame (x, y axes; z = x × y) with origin into a matrix. */
function frame(m: THREE.Matrix4, origin: THREE.Vector3, x: THREE.Vector3, y: THREE.Vector3) {
  v4.crossVectors(x, y);
  m.set(x.x, y.x, v4.x, origin.x, x.y, y.y, v4.y, origin.y, x.z, y.z, v4.z, origin.z, 0, 0, 0, 1);
  return m;
}

export interface SideWorld {
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  wrist: THREE.Vector3;
  hand: THREE.Vector3;
  hip: THREE.Vector3;
  knee: THREE.Vector3;
  ankle: THREE.Vector3;
  heel: THREE.Vector3;
  toe: THREE.Vector3;
  armFront: THREE.Vector3;
  legFront: THREE.Vector3;
  /** Centre of a gripped handle (or the palm centre when empty). */
  grip: THREE.Vector3;
  /** Knuckle axis of the hand: a held handle runs along it. */
  gripAxis: THREE.Vector3;
  /** Palm normal. */
  palm: THREE.Vector3;
}

/** Joints of the solved skeleton converted to three.js space (metres, y up). */
export interface WorldJoints {
  pelvis: THREE.Vector3;
  chest: THREE.Vector3;
  head: THREE.Vector3;
  up: THREE.Vector3;
  forward: THREE.Vector3;
  side: THREE.Vector3;
  chestForward: THREE.Vector3;
  chestSide: THREE.Vector3;
  headUp: THREE.Vector3;
  headForward: THREE.Vector3;
  sides: SideWorld[];
}

const vec = () => new THREE.Vector3();

export function emptyJoints(): WorldJoints {
  const side = (): SideWorld => ({
    shoulder: vec(),
    elbow: vec(),
    wrist: vec(),
    hand: vec(),
    hip: vec(),
    knee: vec(),
    ankle: vec(),
    heel: vec(),
    toe: vec(),
    armFront: vec(),
    legFront: vec(),
    grip: vec(),
    gripAxis: vec(),
    palm: vec(),
  });
  return {
    pelvis: vec(),
    chest: vec(),
    head: vec(),
    up: vec(),
    forward: vec(),
    side: vec(),
    chestForward: vec(),
    chestSide: vec(),
    headUp: vec(),
    headForward: vec(),
    sides: [side(), side()],
  };
}

/** Converts a solved skeleton into `out` (no allocation). */
export function fillJoints(sk: Skeleton, out: WorldJoints) {
  toW(sk.pelvis, out.pelvis);
  toW(sk.chest, out.chest);
  toW(sk.head, out.head);
  toD(sk.up, out.up);
  toD(sk.forward, out.forward);
  if (sk.side) toD(sk.side, out.side);
  else out.side.set(0, 0, 1);
  toD(sk.chestForward, out.chestForward);
  toD(sk.chestSide, out.chestSide);
  toD(sk.headUp, out.headUp);
  toD(sk.headForward, out.headForward);
  for (let i = 0; i < 2; i++) {
    const s = sk.sides[i];
    const o = out.sides[i];
    toW(s.shoulder, o.shoulder);
    toW(s.elbow, o.elbow);
    toW(s.wrist, o.wrist);
    toW(s.hand, o.hand);
    toW(s.hip, o.hip);
    toW(s.knee, o.knee);
    toW(s.ankle, o.ankle);
    toW(s.heel, o.heel);
    toW(s.toe, o.toe);
    toD(s.armFront, o.armFront);
    toD(s.legFront, o.legFront);
  }
  return out;
}

/** A horizontal surface a free hand can rest on (world metres). */
export interface Support {
  y: number;
  /** Optional x/z extent; omitted = infinite (the floor). */
  minX?: number;
  maxX?: number;
  minZ?: number;
  maxZ?: number;
}

const FLOOR: Support = { y: 0 };

/** Per-side hand state resolved every frame. */
interface HandPose {
  pronation: number;
  /** Wrist flexion (+) / extension (−), radians. */
  flex: number;
  curl: number[][];
  /** Thumb opposition, radians. */
  oppose: number;
}

/**
 * Computes every bone's world matrix for a pose. Reused for the bind pose,
 * so it never allocates after construction.
 */
export class BoneSolver {
  readonly matrices: THREE.Matrix4[] = Array.from({ length: BONE_COUNT }, () => new THREE.Matrix4());
  readonly joints = emptyJoints();
  grips: (GripSpec | null)[] = [null, null];
  supports: Support[] = [FLOOR];
  /** Direction each upper arm / thigh points in the bind pose, in the parent frame. */
  private bindDirs: THREE.Vector3[] = [vec(), vec(), vec(), vec()];
  private bindRootRel: THREE.Matrix4[] = [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()];
  private hands: HandPose[] = [0, 1].map(() => ({ pronation: BIND_PRONATION, flex: 0, curl: [0, 1, 2, 3, 4].map(() => [0, 0, 0]), oppose: 0 }));
  private bound = false;

  // Scratch owned by the instance.
  private d1 = vec();
  private d2 = vec();
  private f1 = vec();
  private f2 = vec();
  private h = vec();
  private x = vec();
  private y = vec();
  private z = vec();
  private o = vec();
  private tmp = vec();
  private radial = vec();
  private curlScratch = [0, 0, 0];

  constructor() {
    // Capture the swing reference of the bind pose.
    this.compute(solvePose(BIND_POSE), true);
    this.bound = true;
  }

  /** Recomputes all bone matrices for a solved skeleton. */
  update(sk: Skeleton) {
    this.compute(sk, false);
  }

  private compute(sk: Skeleton, bind: boolean) {
    const j = fillJoints(sk, this.joints);
    const M = this.matrices;
    const { x, y, o } = this;

    // --- Torso ---
    frame(M[B_PELVIS], j.pelvis, j.forward, j.up);
    o.copy(j.pelvis).addScaledVector(j.up, 0.25);
    x.copy(j.forward).add(j.chestForward).normalize();
    frame(M[B_SPINE], o, perp(x, j.up, x), j.up);
    frame(M[B_CHEST], j.chest, perp(j.chestForward, j.up, x), j.up);
    o.copy(j.chest).addScaledVector(j.up, 0.03);
    y.copy(j.up).add(j.headUp).normalize();
    x.copy(j.chestForward).add(j.headForward);
    frame(M[B_NECK], o, perp(x, y, x), y);
    frame(M[B_HEAD], j.head, perp(j.headForward, j.headUp, x), j.headUp);

    for (let i = 0; i < 2; i++) {
      const s = j.sides[i];
      const sign = i === 0 ? 1 : -1;
      this.arm(i, sign, s, j, bind);
      this.leg(i, s, j, bind);
    }
  }

  /** Front of an upper segment, corrected so a bent joint always flexes towards it. */
  private bentFront(d1: THREE.Vector3, d2: THREE.Vector3, solverFront: THREE.Vector3, bendsForward: boolean, out: THREE.Vector3) {
    perp(solverFront, d1, out);
    const b = this.tmp.copy(d2).addScaledVector(d1, -d2.dot(d1));
    const s = b.length();
    if (s < 0.12) return out;
    b.multiplyScalar(bendsForward ? 1 / s : -1 / s);
    const w = THREE.MathUtils.smoothstep(s, 0.12, 0.45);
    const ang = signedAngle(out, b, d1);
    return rotate(out, d1, ang * w).normalize();
  }

  private arm(i: number, sign: number, s: SideWorld, j: WorldJoints, bind: boolean) {
    const M = this.matrices;
    const { d1, d2, f1, f2, h, x, y, o } = this;
    const at = (b: number) => M[armBone(i, b)];

    // Clavicle: rides with the chest (sternoclavicular joint in front of the spine).
    o.copy(j.chest).addScaledVector(j.chestSide, sign * 0.02).addScaledVector(j.chestForward, 0.04);
    frame(at(A_CLAVICLE), o, perp(j.chestForward, j.up, x), j.up);

    d1.subVectors(s.elbow, s.shoulder).normalize();
    d2.subVectors(s.wrist, s.elbow).normalize();
    this.bentFront(d1, d2, s.armFront, true, f1);
    s.armFront.copy(f1);

    // Upper arm (full) frame.
    frame(at(A_UPPER), s.shoulder, f1, d1);
    // Upper arm root: swing only, relative to the clavicle.
    this.swingRoot(i, at(A_CLAVICLE), at(A_UPPER), d1, s.shoulder, at(A_UA_ROOT), bind);

    // Forearm frame from the elbow hinge.
    h.crossVectors(d1, f1);
    f2.crossVectors(h, d2);
    if (f2.lengthSq() < 1e-6) f2.copy(f1);
    perp(f2, d2, f2, f1);
    frame(at(A_FORE), s.elbow, f2, d2);

    // Hand.
    const hand = this.hands[i];
    const wrist = o.copy(s.elbow).addScaledVector(d2, FOREARM / 100);
    this.solveHand(i, sign, s, j, wrist, d2, f2, hand, bind);

    // Forearm twist bone: half of the pronation away from bind.
    y.copy(d2);
    x.copy(f2);
    rotate(x, d2, (-sign * ((hand.pronation - BIND_PRONATION) * DEG)) / 2);
    o.copy(s.elbow).addScaledVector(d2, 0.13);
    frame(at(A_TWIST), o, x, y);
  }

  /** Swing-only root bone: the bind child frame, swung (minimal arc) to the current direction within the parent. */
  private swingRoot(k: number, parent: THREE.Matrix4, child: THREE.Matrix4, dir: THREE.Vector3, origin: THREE.Vector3, out: THREE.Matrix4, bind: boolean) {
    // Direction in the parent's rotation frame.
    m1.extractRotation(parent);
    m2.copy(m1).transpose();
    const local = v1.copy(dir).applyMatrix4(m2).normalize();
    if (bind) {
      this.bindDirs[k].copy(local);
      // Child relative to parent in bind.
      this.bindRootRel[k].copy(m2).multiply(m1.extractRotation(child));
      out.copy(child);
      return;
    }
    q1.setFromUnitVectors(this.bindDirs[k], local);
    m2.makeRotationFromQuaternion(q1);
    out.copy(m1).multiply(m2).multiply(this.bindRootRel[k]);
    out.setPosition(origin);
  }

  private leg(i: number, s: SideWorld, j: WorldJoints, bind: boolean) {
    const M = this.matrices;
    const { d1, d2, f1, f2, h, x, y, o } = this;
    const at = (b: number) => M[legBone(i, b)];
    d1.subVectors(s.knee, s.hip).normalize();
    d2.subVectors(s.ankle, s.knee).normalize();
    this.bentFront(d1, d2, s.legFront, false, f1);
    s.legFront.copy(f1);
    frame(at(L_THIGH), s.hip, f1, d1);
    this.swingRoot(2 + i, M[B_PELVIS], at(L_THIGH), d1, s.hip, at(L_THIGH_ROOT), bind);

    h.crossVectors(d1, f1);
    f2.crossVectors(h, d2);
    perp(f2, d2, f2, f1);
    frame(at(L_SHIN), s.knee, f2, d2);

    // Foot: x = heel → toe, z ≈ knee hinge axis.
    x.subVectors(s.toe, s.heel).normalize();
    const zAxis = perp(h, x, this.z, j.side);
    y.crossVectors(zAxis, x).normalize();
    frame(at(L_FOOT), s.ankle, x, y);

    // Toes: bend up to stay flat when the ball of the foot is on the floor.
    o.copy(s.ankle).addScaledVector(x, BALL[0] / 100).addScaledVector(y, BALL[1] / 100);
    let bend = 0;
    if (!bind && x.y < -0.05) {
      const ballHeight = o.y - 0.01;
      const k = 1 - THREE.MathUtils.smoothstep(ballHeight, 0.02, 0.08);
      bend = Math.asin(Math.min(1, -x.y)) * k;
    }
    x.applyAxisAngle(zAxis, bend);
    y.applyAxisAngle(zAxis, bend);
    frame(at(L_TOES), o, x, y);
  }

  /** Resolves pronation, wrist and finger curl, and writes the hand and finger bones. */
  private solveHand(
    i: number,
    sign: number,
    s: SideWorld,
    j: WorldJoints,
    wrist: THREE.Vector3,
    d2: THREE.Vector3,
    f2: THREE.Vector3,
    hand: HandPose,
    bind: boolean,
  ) {
    const M = this.matrices;
    const X = v2;
    const Y = v3;
    const grip = bind ? null : this.grips[i];
    let curls = RELAXED;
    let flatOn: Support | null = null;
    hand.flex = 0;
    hand.oppose = 0;
    if (bind) {
      hand.pronation = BIND_PRONATION;
      curls = FLAT.map(() => [0, 0, 0] as [number, number, number]);
    } else if (grip) {
      // Knuckle axis along the handle: choose the palm side nearest the preferred style.
      const pref = PREF[grip.style ?? (grip.axis ? "overhand" : "neutral")];
      if (grip.axis) {
        const a = perp(grip.axis, d2, this.tmp, j.chestSide);
        let bestP = pref;
        let bestErr = Infinity;
        for (const sg of [1, -1]) {
          // Palm normal X = d2 × (±a).
          X.crossVectors(d2, a).multiplyScalar(sg);
          let p = (-sign * signedAngle(f2, X, d2)) / DEG;
          while (p < pref - 180) p += 360;
          while (p > pref + 180) p -= 360;
          const err = Math.abs(p - pref);
          if (err < bestErr) {
            bestErr = err;
            bestP = p;
          }
        }
        hand.pronation = bestP;
      } else hand.pronation = pref;
      const r = (grip.radius * 100) / 1.4;
      const cp = GRIP_CENTER[0] + (r - 1) * 1.1;
      const ca = GRIP_CENTER[1];
      hand.flex = -Math.atan2(cp, ca);
      hand.oppose = 0.75;
      curls = FINGERS.map((f, k) => {
        if (k === THUMB) return [42, 38, 30];
        wrapCurl(f, cp, ca, grip.radius * 100 + f.radii[1], this.curlScratch);
        return this.curlScratch.map((c) => c / DEG) as [number, number, number];
      }) as [number, number, number][];
    } else {
      // A free hand resting on a surface lies flat.
      for (const sp of this.supports) {
        if (sp.minX !== undefined && (wrist.x < sp.minX || wrist.x > sp.maxX! || wrist.z < sp.minZ! || wrist.z > sp.maxZ!)) continue;
        const hgt = wrist.y - sp.y;
        if (hgt > -0.02 && hgt < 0.11 && d2.y < -0.3) flatOn = sp;
      }
      hand.pronation = 90;
      if (flatOn) curls = FLAT;
    }

    // Palm normal from pronation, then wrist flex about the knuckle axis.
    X.copy(f2);
    rotate(X, d2, -sign * hand.pronation * DEG);
    Y.copy(d2);
    if (flatOn) {
      // Palm down, fingers continuing the forearm's heading.
      X.set(0, -1, 0);
      Y.copy(d2).setY(0);
      if (Y.lengthSq() < 1e-4) Y.copy(j.chestForward).setY(0);
      if (Y.lengthSq() < 1e-4) Y.set(1, 0, 0);
      Y.normalize();
      let p = (-sign * signedAngle(f2, perp(X, d2, this.tmp, f2), d2)) / DEG;
      while (p < -90) p += 360;
      while (p > 270) p -= 360;
      hand.pronation = p;
    } else if (hand.flex) {
      const zk = v1.crossVectors(X, Y).normalize();
      rotate(X, zk, -hand.flex);
      rotate(Y, zk, -hand.flex);
    }
    const handM = M[armBone(i, A_HAND)];
    frame(handM, wrist, X, Y);

    // Outputs for props.
    const R = this.radial.crossVectors(X, Y).normalize().multiplyScalar(-sign);
    s.palm.copy(X);
    s.gripAxis.copy(R);
    const cp = grip ? GRIP_CENTER[0] + ((grip.radius * 100) / 1.4 - 1) * 1.1 : 1.5;
    const ca = GRIP_CENTER[1];
    s.grip.copy(wrist).addScaledVector(X, cp / 100).addScaledVector(Y, ca / 100);

    // Fingers.
    for (let f = 0; f < FINGERS.length; f++) {
      const c = curls[f];
      this.finger(i, sign, f, handM, X, Y, R, c, hand.oppose);
    }
  }

  private finger(i: number, sign: number, f: number, handM: THREE.Matrix4, X: THREE.Vector3, Y: THREE.Vector3, R: THREE.Vector3, curl: number[], oppose: number) {
    const M = this.matrices;
    const spec = FINGERS[f];
    const o = this.o;
    const px = this.x;
    const py = this.y;
    // Base joint.
    o.setFromMatrixPosition(handM)
      .addScaledVector(X, spec.base[0] / 100)
      .addScaledVector(Y, spec.base[1] / 100)
      .addScaledVector(R, spec.base[2] / 100);
    // Bind direction of the first segment.
    py.set(0, 0, 0).addScaledVector(X, spec.dir[0]).addScaledVector(Y, spec.dir[1]).addScaledVector(R, spec.dir[2]).normalize();
    if (f === THUMB) {
      // The thumb pad faces across the palm (towards the index finger), partly palmar.
      px.set(0, 0, 0).addScaledVector(X, 0.55).addScaledVector(R, -0.83);
      perp(px, py, px);
      // Opposition swings the metacarpal across the palm.
      if (oppose) {
        rotate(py, Y, -sign * oppose * 0.5);
        rotate(px, Y, -sign * oppose * 0.5);
      }
    } else {
      perp(X, py, px);
    }
    for (let k = 0; k < 3; k++) {
      const ang = curl[k] * DEG;
      if (ang) {
        const zk = v1.crossVectors(px, py).normalize();
        // Flex: y tilts towards x (palmar).
        rotate(px, zk, -ang);
        rotate(py, zk, -ang);
      }
      const m = M[armBone(i, A_FINGER + f * 3 + k)];
      frame(m, o, px, py);
      o.addScaledVector(py, spec.lengths[k] / 100);
    }
  }
}

/** Bind-pose frames, for sculpting: origin and axes of every bone in centimetres. */
export interface BindFrame {
  o: [number, number, number];
  x: [number, number, number];
  y: [number, number, number];
  z: [number, number, number];
}

export function bindFrames(): BindFrame[] {
  const solver = new BoneSolver();
  return solver.matrices.map((m) => {
    const e = m.elements;
    return {
      o: [e[12] * 100, e[13] * 100, e[14] * 100],
      x: [e[0], e[1], e[2]],
      y: [e[4], e[5], e[6]],
      z: [e[8], e[9], e[10]],
    };
  });
}

/** Bind skeleton joints in centimetres (bind space = world × 100). */
export function bindJoints() {
  const solver = new BoneSolver();
  const j = solver.joints;
  const c = (v: THREE.Vector3): [number, number, number] => [v.x * 100, v.y * 100, v.z * 100];
  const d = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];
  return {
    pelvis: c(j.pelvis),
    chest: c(j.chest),
    head: c(j.head),
    up: d(j.up),
    forward: d(j.forward),
    headUp: d(j.headUp),
    headForward: d(j.headForward),
    sides: j.sides.map((s) => ({
      shoulder: c(s.shoulder),
      elbow: c(s.elbow),
      wrist: c(s.wrist),
      hip: c(s.hip),
      knee: c(s.knee),
      ankle: c(s.ankle),
      heel: c(s.heel),
      toe: c(s.toe),
      armFront: d(s.armFront),
      legFront: d(s.legFront),
    })),
  };
}
