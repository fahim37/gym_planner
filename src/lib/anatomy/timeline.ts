import { GRIP_TURN, type Animation, type Keyframe, type LimbSpec, type Pose } from "./types";

const DEFAULT_DUR = 1.1;

/** Gives a limb spec the defaults of its optional fields, so they interpolate instead of snapping. */
function limb(spec: LimbSpec): LimbSpec {
  if ("angles" in spec) return { ...spec, spread: spec.spread ?? [0, 0], foot: spec.foot ?? 0, footFollowsShin: spec.footFollowsShin ?? false };
  return { ...spec, foot: spec.foot ?? 0 };
}

const arm = (spec: LimbSpec): LimbSpec => ({ ...limb(spec), wrist: spec.wrist ?? 0 });

/** Numeric palm turn per arm from a pose's `grip`, so grip changes interpolate. */
function gripTurn(pose: Pose): [number, number] | undefined {
  if (pose.gripTurn) return [pose.gripTurn[0], pose.gripTurn[1]];
  if (!pose.grip) return undefined;
  const [a, b] = typeof pose.grip === "string" ? [pose.grip, pose.grip] : pose.grip;
  return [GRIP_TURN[a], GRIP_TURN[b]];
}

/** Fills in the mirrored second limb and every optional value, so every pose has the same shape. */
function normalize(pose: Pose): Pose {
  const arm0 = arm(pose.arms[0]);
  const leg = limb(pose.legs[0]);
  const turn = gripTurn(pose);
  return {
    ...pose,
    ...(turn ? { gripTurn: turn } : {}),
    head: pose.head ?? 0,
    twist: pose.twist ?? 0,
    shrug: pose.shrug ?? 0,
    orient: { roll: pose.orient?.roll ?? 0, yaw: pose.orient?.yaw ?? 0 },
    arms: [arm0, pose.arms[1] ? arm(pose.arms[1]) : arm0],
    legs: [leg, pose.legs[1] ? limb(pose.legs[1]) : leg],
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Recursively interpolates numbers over the union of both sides' keys; a key
 * present on one side only keeps that side's value, and other non-numbers
 * are taken from `a`. Limb specs of different kinds (IK vs angles) are not
 * blended: `a` is kept until the next keyframe.
 */
function lerpDeep<T>(a: T, b: T, k: number): T {
  if (typeof a === "number" && typeof b === "number") return (a + (b - a) * k) as T;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => (i < b.length ? lerpDeep(v, b[i], k) : v)) as T;
  if (isObject(a) && isObject(b)) {
    if (("ik" in a && "angles" in b) || ("angles" in a && "ik" in b)) return a;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(a)) {
      const av = a[key];
      const bv = b[key];
      out[key] = bv === undefined ? av : lerpDeep(av, bv, k);
    }
    for (const key of Object.keys(b)) if (!(key in out)) out[key] = b[key];
    return out as T;
  }
  return a;
}

const ease = (k: number) => 0.5 - Math.cos(Math.PI * k) / 2;

export interface Sample {
  pose: Pose;
  cue?: string;
  /** Completed repetitions since t = 0. */
  reps: number;
  /** 0..1 progress through the current repetition cycle. */
  cycle: number;
}

export class Timeline {
  private readonly frames: Keyframe[];
  private readonly starts: number[] = [];
  readonly duration: number;
  private readonly repsPerLoop: number;

  constructor(animation: Animation) {
    this.frames = animation.frames.map((f) => ({ ...f, pose: normalize(f.pose) }));
    let t = 0;
    for (const f of this.frames) {
      this.starts.push(t);
      t += (f.hold ?? 0) + (f.dur ?? DEFAULT_DUR);
    }
    this.duration = t;
    this.repsPerLoop = Math.max(1, this.frames.filter((f) => f.rep).length);
  }

  /** Pose at time `time` seconds (loops forever). */
  sample(time: number): Sample {
    const loops = Math.floor(time / this.duration);
    const t = time - loops * this.duration;
    let i = this.starts.length - 1;
    while (i > 0 && this.starts[i] > t) i--;
    const frame = this.frames[i];
    const next = this.frames[(i + 1) % this.frames.length];
    const local = t - this.starts[i] - (frame.hold ?? 0);
    const progress = local <= 0 ? 0 : Math.min(1, local / (frame.dur ?? DEFAULT_DUR));
    const k = frame.ease === "linear" ? progress : ease(progress);

    let reps = loops * this.repsPerLoop;
    for (let j = 0; j <= i; j++) {
      const reached = j < i || local >= (frame.dur ?? DEFAULT_DUR);
      if (this.frames[(j + 1) % this.frames.length].rep && reached) reps++;
    }
    const pose = lerpDeep(frame.pose, next.pose, k);
    // The discrete style label follows the nearer keyframe (the numeric turn blends).
    if (next.pose.grip !== undefined && k >= 0.5) pose.grip = next.pose.grip;
    return {
      pose,
      cue: frame.cue,
      reps,
      cycle: t / this.duration,
    };
  }

  /** Pose of a single keyframe, for thumbnails. */
  keyframe(index: number): Pose {
    return this.frames[Math.min(index, this.frames.length - 1)].pose;
  }

  get length() {
    return this.frames.length;
  }
}
