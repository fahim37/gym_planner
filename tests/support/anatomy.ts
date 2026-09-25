/**
 * Geometry helpers shared by the solver and pose-sanity tests.
 *
 * `resolveIkTarget` mirrors the private `resolveTarget` in
 * src/lib/anatomy/solver.ts so the tests can see where an IK target *asked*
 * the hand/foot to go (the solver silently clamps unreachable targets). The
 * solver tests pin the two together: if the solver's target semantics change,
 * "IK reaches reachable targets exactly" fails first.
 */
import { BODY, solvePose } from "@/lib/anatomy/solver";
import { Timeline } from "@/lib/anatomy/timeline";
import type { Animation, IkLimb, LimbSpec, Pose, Skeleton, Target, Vec3 } from "@/lib/anatomy/types";

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a: Vec3) => Math.sqrt(dot(a, a));
export const dist = (a: Vec3, b: Vec3) => len(sub(a, b));
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const ARM_REACH = { l1: BODY.upperArm, l2: BODY.forearm } as const;
export const LEG_REACH = { l1: BODY.thigh, l2: BODY.shin } as const;

export function isIkLimb(l: LimbSpec): l is IkLimb {
  return "ik" in l;
}

/** Where an IK target resolves to in world space (see solver.ts resolveTarget). */
export function resolveIkTarget(t: Target, root: Vec3, sign: number, s: Skeleton): Vec3 {
  const rel = t.rel ?? "world";
  const offset: Vec3 = t.local ? add(scale(s.forward, t.x), scale(s.up, -t.y)) : [t.x, t.y, 0];
  if (rel === "world") return [t.x, t.y, sign * (t.z ?? Math.abs(root[2]))];
  if (rel === "root") return add(add(root, offset), [0, 0, sign * (t.z ?? 0)]);
  const base = rel === "chest" ? s.chest : s.pelvis;
  const p = add(base, offset);
  return [p[0], p[1], sign * (t.z ?? Math.abs(root[2]))];
}

/** Every joint of a skeleton with an author-facing name (`arms[0] hand`, `legs[1] toe`…). */
export function namedJoints(s: Skeleton): [string, Vec3][] {
  const out: [string, Vec3][] = [
    ["pelvis", s.pelvis],
    ["chest", s.chest],
    ["neck", s.neck],
    ["head", s.head],
  ];
  s.sides.forEach((j, i) => {
    out.push(
      [`arms[${i}] shoulder`, j.shoulder],
      [`arms[${i}] elbow`, j.elbow],
      [`arms[${i}] wrist`, j.wrist],
      [`arms[${i}] hand`, j.hand],
      [`legs[${i}] hip`, j.hip],
      [`legs[${i}] knee`, j.knee],
      [`legs[${i}] ankle`, j.ankle],
      [`legs[${i}] heel`, j.heel],
      [`legs[${i}] toe`, j.toe],
    );
  });
  return out;
}

/** Every number in a skeleton, flattened, for NaN/Infinity checks. */
export function skeletonNumbers(s: Skeleton): [string, number][] {
  const out: [string, number][] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === "number") out.push([path, v]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(s, "");
  return out;
}

/** The limb specs a pose actually uses, with the mirrored second limb filled in. */
export function limbSpecs(pose: Pose): { arms: [LimbSpec, LimbSpec]; legs: [LimbSpec, LimbSpec] } {
  return {
    arms: [pose.arms[0], pose.arms[1] ?? pose.arms[0]],
    legs: [pose.legs[0], pose.legs[1] ?? pose.legs[0]],
  };
}

export interface IkReach {
  limb: string;
  /** Straight-line distance from the limb root (shoulder/hip) to the resolved target. */
  distance: number;
  /** Longest the limb can be (l1 + l2). */
  max: number;
  /** Shortest the limb can fold to (|l1 - l2|). */
  min: number;
  target: Vec3;
  spec: Target;
}

/** Reach analysis of every IK limb in a pose. */
export function ikReaches(pose: Pose, s: Skeleton = solvePose(pose)): IkReach[] {
  const specs = limbSpecs(pose);
  const out: IkReach[] = [];
  (["arms", "legs"] as const).forEach((kind) => {
    const { l1, l2 } = kind === "arms" ? ARM_REACH : LEG_REACH;
    specs[kind].forEach((spec, i) => {
      if (!isIkLimb(spec)) return;
      const root = kind === "arms" ? s.sides[i].shoulder : s.sides[i].hip;
      const target = resolveIkTarget(spec.ik, root, i === 0 ? 1 : -1, s);
      out.push({ limb: `${kind}[${i}]`, distance: dist(root, target), max: l1 + l2, min: Math.abs(l1 - l2), target, spec: spec.ik });
    });
  });
  return out;
}

/** Keyframe start times and the time spent on each (hold + move), as Timeline computes them. */
export function frameTimes(animation: Animation): { starts: number[]; holds: number[]; durs: number[] } {
  // Timeline does not export its default move time; measure it from a one-frame timeline.
  const probe = animation.frames[0];
  const defaultDur = new Timeline({ frames: [{ pose: probe.pose }] }).duration;
  const starts: number[] = [];
  const holds: number[] = [];
  const durs: number[] = [];
  let t = 0;
  for (const f of animation.frames) {
    starts.push(t);
    holds.push(f.hold ?? 0);
    durs.push(f.dur ?? defaultDur);
    t += (f.hold ?? 0) + (f.dur ?? defaultDur);
  }
  return { starts, holds, durs };
}

/**
 * Structural differences between two limb specs / poses that the timeline
 * cannot interpolate (it only blends numbers and keeps the first frame's keys):
 * IK vs angles, differing `rel`/`local`, optional keys present on one side only.
 */
export function structuralDiff(a: unknown, b: unknown, path = ""): string[] {
  if (typeof a === "number" && typeof b === "number") return [];
  if (Array.isArray(a) && Array.isArray(b)) {
    const out: string[] = [];
    if (a.length !== b.length) out.push(`${path} has ${a.length} items vs ${b.length}`);
    a.forEach((v, i) => out.push(...structuralDiff(v, b[i], `${path}[${i}]`)));
    return out;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const out: string[] = [];
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const av = (a as Record<string, unknown>)[k];
      const bv = (b as Record<string, unknown>)[k];
      const p = path ? `${path}.${k}` : k;
      if (av === undefined && bv !== undefined) out.push(`${p} only set on the second frame`);
      else if (bv === undefined && av !== undefined) out.push(`${p} only set on the first frame`);
      else out.push(...structuralDiff(av, bv, p));
    }
    return out;
  }
  return a === b ? [] : [`${path} changes from ${JSON.stringify(a)} to ${JSON.stringify(b)}`];
}

/** Deterministic PRNG (mulberry32) so random-pose tests are reproducible. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo: number, hi: number) => lo + (hi - lo) * next(),
    pick: <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)],
  };
}

export const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
export const fmtVec = (v: Vec3) => `(${fmt(v[0])}, ${fmt(v[1])}, ${fmt(v[2])})`;
