import type { Animation, Keyframe, Pose } from "./types";

const DEFAULT_DUR = 1.1;

/** Fills in the mirrored second limb so every pose has the same shape. */
function normalize(pose: Pose): Pose {
  return {
    ...pose,
    head: pose.head ?? 0,
    twist: pose.twist ?? 0,
    arms: [pose.arms[0], pose.arms[1] ?? pose.arms[0]],
    legs: [pose.legs[0], pose.legs[1] ?? pose.legs[0]],
  };
}

/** Recursively interpolates numbers; non-numbers are taken from `a`. */
function lerpDeep<T>(a: T, b: T, k: number): T {
  if (typeof a === "number" && typeof b === "number") return (a + (b - a) * k) as T;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerpDeep(v, b[i], k)) as T;
  if (a && b && typeof a === "object" && typeof b === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(a)) {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      out[key] = bv === undefined ? av : lerpDeep(av, bv, k);
    }
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
    const k = local <= 0 ? 0 : ease(Math.min(1, local / (frame.dur ?? DEFAULT_DUR)));

    let reps = loops * this.repsPerLoop;
    for (let j = 0; j <= i; j++) {
      const reached = j < i || local >= (frame.dur ?? DEFAULT_DUR);
      if (this.frames[(j + 1) % this.frames.length].rep && reached) reps++;
    }
    return {
      pose: lerpDeep(frame.pose, next.pose, k),
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
