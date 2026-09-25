import type {
  AngleLimb,
  LimbSpec,
  Pose,
  SideJoints,
  Skeleton,
  Target,
  Vec3,
} from "./types";
import { GRIP_TURN } from "./types";

/** Segment lengths in centimetres. */
export const BODY = {
  torso: 62,
  neck: 7,
  headRadius: 11,
  shoulderHalfWidth: 19,
  hipHalfWidth: 10,
  hipDrop: 3,
  upperArm: 31,
  forearm: 28,
  hand: 7,
  thigh: 45,
  shin: 43,
  foot: 16,
  heel: 4,
} as const;

const DEG = Math.PI / 180;

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3) => Math.sqrt(dot(a, a));
const norm = (a: Vec3): Vec3 => {
  const l = len(a);
  return l < 1e-9 ? [0, 0, 0] : scale(a, 1 / l);
};

/** Removes the component of `v` along unit vector `axis`. */
function orthogonal(v: Vec3, axis: Vec3): Vec3 {
  return sub(v, scale(axis, dot(v, axis)));
}

/** First candidate that is not (nearly) parallel to `axis`, made perpendicular. */
function frontOf(axis: Vec3, candidates: Vec3[]): Vec3 {
  for (const c of candidates) {
    const o = orthogonal(c, axis);
    if (len(o) > 0.25) return norm(o);
  }
  return norm(orthogonal([0, -1, 0], axis));
}

/** Two-bone inverse kinematics: returns [middle joint, end joint]. */
export function solveTwoBone(
  root: Vec3,
  target: Vec3,
  l1: number,
  l2: number,
  pole: Vec3,
): [Vec3, Vec3] {
  const toTarget = sub(target, root);
  const dir = norm(toTarget);
  const dist = Math.min(Math.max(len(toTarget), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA)));
  const bend = frontOf(dir, [pole, [0, 0, 1]]);
  const mid = add(root, add(scale(dir, l1 * Math.cos(a)), scale(bend, l1 * Math.sin(a))));
  return [mid, add(root, scale(dir, dist))];
}

function angleDir(angle: number, spread: number, sign: number): Vec3 {
  const a = angle * DEG;
  const s = spread * DEG;
  return [Math.sin(a) * Math.cos(s), Math.cos(a) * Math.cos(s), sign * Math.sin(s)];
}

function isAngleLimb(l: LimbSpec): l is AngleLimb {
  return "angles" in l;
}

interface Frame {
  chest: Vec3;
  pelvis: Vec3;
  up: Vec3;
  forward: Vec3;
}

function resolveTarget(t: Target, root: Vec3, sign: number, f: Frame): Vec3 {
  const rel = t.rel ?? "world";
  const offset: Vec3 = t.local
    ? add(scale(f.forward, t.x), scale(f.up, -t.y))
    : [t.x, t.y, 0];
  if (rel === "world") return [t.x, t.y, sign * (t.z ?? Math.abs(root[2]))];
  if (rel === "root") return add(add(root, offset), [0, 0, sign * (t.z ?? 0)]);
  const base = rel === "chest" ? f.chest : f.pelvis;
  const p = add(base, offset);
  return [p[0], p[1], sign * (t.z ?? Math.abs(root[2]))];
}

function solveLimb(
  spec: LimbSpec,
  root: Vec3,
  l1: number,
  l2: number,
  sign: number,
  f: Frame,
  defaultFront: Vec3,
  poleIsFront: boolean,
): { mid: Vec3; end: Vec3; front: Vec3 } {
  if (isAngleLimb(spec)) {
    const d1 = angleDir(spec.angles[0], spec.spread?.[0] ?? 0, sign);
    const d2 = angleDir(spec.angles[1], spec.spread?.[1] ?? 0, sign);
    const mid = add(root, scale(d1, l1));
    return { mid, end: add(mid, scale(d2, l2)), front: frontOf(d1, [defaultFront, f.up]) };
  }
  const pole: Vec3 = [spec.pole[0], spec.pole[1], sign * spec.pole[2]];
  const [mid, end] = solveTwoBone(root, resolveTarget(spec.ik, root, sign, f), l1, l2, pole);
  // Knees bend toward the front of the leg; elbows point away from the biceps.
  const front = poleIsFront ? pole : scale(pole, -1);
  return { mid, end, front: frontOf(norm(sub(mid, root)), [front, defaultFront]) };
}

/** Converts a pose into joint positions (authoring space, centimetres). */
export function solvePose(pose: Pose): Skeleton {
  const t = pose.torso * DEG;
  const up: Vec3 = [Math.sin(t), -Math.cos(t), 0];
  const forward: Vec3 = [Math.cos(t), Math.sin(t), 0];
  const side: Vec3 = [0, 0, 1];
  const pelvis: Vec3 = [pose.hip[0], pose.hip[1], 0];
  const chest = add(pelvis, scale(up, BODY.torso));

  const tw = (pose.twist ?? 0) * DEG;
  const chestForward = add(scale(forward, Math.cos(tw)), scale(side, -Math.sin(tw)));
  const chestSide = add(scale(side, Math.cos(tw)), scale(forward, Math.sin(tw)));

  const p = (pose.head ?? 0) * DEG;
  const headUp = add(scale(up, Math.cos(p)), scale(chestForward, Math.sin(p)));
  const headForward = add(scale(chestForward, Math.cos(p)), scale(up, -Math.sin(p)));
  const neck = add(chest, scale(up, 3));
  const head = add(neck, scale(headUp, BODY.neck + BODY.headRadius));

  const frame: Frame = { chest, pelvis, up, forward };
  const armSpecs = [pose.arms[0], pose.arms[1] ?? pose.arms[0]];
  const legSpecs = [pose.legs[0], pose.legs[1] ?? pose.legs[0]];

  const sides = [0, 1].map((i): SideJoints => {
    const sign = i === 0 ? 1 : -1;
    const shoulder = add(chest, scale(chestSide, sign * BODY.shoulderHalfWidth));
    const hip = add(add(pelvis, scale(side, sign * BODY.hipHalfWidth)), scale(up, -BODY.hipDrop));

    const arm = solveLimb(armSpecs[i], shoulder, BODY.upperArm, BODY.forearm, sign, frame, chestForward, false);
    const hand = add(arm.end, scale(norm(sub(arm.end, arm.mid)), BODY.hand));

    const legSpec = legSpecs[i];
    const leg = solveLimb(legSpec, hip, BODY.thigh, BODY.shin, sign, frame, forward, true);

    const tilt = (legSpec.foot ?? 0) * DEG;
    let footDir: Vec3 = [Math.cos(tilt), Math.sin(tilt), 0];
    if (isAngleLimb(legSpec) && legSpec.footFollowsShin) {
      // Pointed toes: the foot continues roughly along the shin.
      const shin = norm(sub(leg.end, leg.mid));
      footDir = norm(add(scale(shin, 0.85), scale(leg.front, 0.35)));
    }
    return {
      shoulder,
      elbow: arm.mid,
      wrist: arm.end,
      hand,
      hip,
      knee: leg.mid,
      ankle: leg.end,
      heel: add(leg.end, scale(footDir, -BODY.heel)),
      toe: add(leg.end, scale(footDir, BODY.foot)),
      armFront: arm.front,
      legFront: leg.front,
      wristFlex: armSpecs[i].wrist ?? 0,
      gripTurn: pose.gripTurn ? pose.gripTurn[i] : pose.grip ? GRIP_TURN[typeof pose.grip === "string" ? pose.grip : pose.grip[i]] : undefined,
    };
  }) as [SideJoints, SideJoints];

  const sk: Skeleton = { pelvis, chest, neck, head, up, forward, side, chestForward, chestSide, headUp, headForward, sides };
  if (pose.orient) orientSkeleton(sk, pose.orient.roll ?? 0, pose.orient.yaw ?? 0);
  return sk;
}

/**
 * Rigidly rotates a solved skeleton about its pelvis centre: `roll` degrees
 * about the world x axis (+z side goes down), then `yaw` about the vertical
 * axis (+x turns toward +z). Mutates `sk`.
 */
function orientSkeleton(sk: Skeleton, roll: number, yaw: number) {
  if (!roll && !yaw) return;
  const cr = Math.cos(roll * DEG);
  const sr = Math.sin(roll * DEG);
  const cy = Math.cos(yaw * DEG);
  const sy = Math.sin(yaw * DEG);
  // Authoring space is y-down, so "+z goes down" means z rotates into +y.
  const dir = (v: Vec3) => {
    const y = v[1] * cr + v[2] * sr;
    const z = -v[1] * sr + v[2] * cr;
    const x = v[0];
    v[0] = x * cy - z * sy;
    v[1] = y;
    v[2] = x * sy + z * cy;
  };
  const o: Vec3 = [sk.pelvis[0], sk.pelvis[1], sk.pelvis[2]];
  const point = (v: Vec3) => {
    v[0] -= o[0];
    v[1] -= o[1];
    v[2] -= o[2];
    dir(v);
    v[0] += o[0];
    v[1] += o[1];
    v[2] += o[2];
  };
  for (const v of [sk.pelvis, sk.chest, sk.neck, sk.head]) point(v);
  for (const v of [sk.up, sk.forward, sk.side, sk.chestForward, sk.chestSide, sk.headUp, sk.headForward]) dir(v);
  for (const s of sk.sides) {
    for (const v of [s.shoulder, s.elbow, s.wrist, s.hand, s.hip, s.knee, s.ankle, s.heel, s.toe]) point(v);
    dir(s.armFront);
    dir(s.legFront);
  }
}
