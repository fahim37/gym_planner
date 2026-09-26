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

/** Minimum-jerk profile: how people move a limb from rest to rest (gentler starts and stops than a cosine). */
const ease = (k: number) => k * k * k * (10 - 15 * k + 6 * k * k);
/** Its derivative, for velocities. */
const easeRate = (k: number) => 30 * k * k * (1 - k) * (1 - k);

/**
 * Subtle "alive" motion on top of the authored keyframes (all deterministic in time):
 * - settle: the body (hips, torso, head) carries a little momentum into each stop and
 *   settles back, so knees and hips give slightly as a rep lands;
 * - breathing: the chest rises and the shoulders lift a few millimetres;
 * - sway: tiny slow shifts of the trunk, as nobody holds perfectly still;
 * - follow-through: the head lags a fast torso movement and catches up.
 * Hands and feet keep their IK targets, so grips stay on the bar and feet stay planted.
 */
const LIFE = {
  /** Overshoot as a share of the distance travelled into a stop, for a fast (≤ 0.6 s) move. */
  settle: 0.04,
  settleDecay: 0.14,
  settlePeriod: 0.5,
  breathPeriod: 3.6,
  /** Shoulder lift (cm) and chest pitch (deg) of a breath. */
  breathShrug: 0.35,
  breathTorso: 0.3,
  swayTwist: 0.45,
  swayTorso: 0.3,
  /** Head lag per degree/second of torso speed, and its limit (deg). */
  headLag: 0.05,
  headLagMax: 3,
};

export interface Sample {
  pose: Pose;
  cue?: string;
  /** Completed repetitions since t = 0. */
  reps: number;
  /** 0..1 progress through the current repetition cycle. */
  cycle: number;
}

export interface TimelineOptions {
  /** Subtle settle, breathing, sway and head follow-through (default on). */
  life?: boolean;
}

export class Timeline {
  private readonly frames: Keyframe[];
  private readonly starts: number[] = [];
  readonly duration: number;
  private readonly repsPerLoop: number;
  private readonly life: boolean;
  /** Per-animation phase so two exercises side by side don't sway in step. */
  private readonly phase: number;

  constructor(animation: Animation, opts: TimelineOptions = {}) {
    this.life = opts.life ?? true;
    this.frames = animation.frames.map((f) => ({ ...f, pose: normalize(f.pose) }));
    let t = 0;
    for (const f of this.frames) {
      this.starts.push(t);
      t += (f.hold ?? 0) + (f.dur ?? DEFAULT_DUR);
    }
    this.duration = t;
    this.repsPerLoop = Math.max(1, this.frames.filter((f) => f.rep).length);
    this.phase = (this.frames.length * 1.7 + t * 2.3) % (2 * Math.PI);
  }

  private dur(i: number) {
    return this.frames[i].dur ?? DEFAULT_DUR;
  }

  /** Adds the subtle "alive" motion (see LIFE) to a sampled pose. */
  private alive(pose: Pose, time: number, i: number, local: number, progress: number) {
    const n = this.frames.length;
    const frame = this.frames[i];
    const next = this.frames[(i + 1) % n];
    const w = (2 * Math.PI) / LIFE.breathPeriod;
    const breath = Math.sin(w * time + this.phase);
    const sway = Math.sin(((2 * Math.PI) / 5.3) * time + this.phase * 1.3);
    const sway2 = Math.sin(((2 * Math.PI) / 4.1) * time + this.phase * 0.7);
    let dHipX = 0;
    let dHipY = 0;
    let dTorso = LIFE.swayTorso * sway2 - LIFE.breathTorso * breath;
    let dHead = 0;

    // Settle after arriving at this keyframe and, still fading out over a short move, the
    // one before it (so consecutive stops blend without a pop).
    let since = (frame.hold ?? 0) + local; // time since this keyframe was reached
    for (let back = 0; back < 2 && n > 1; back++) {
      const at = (i - back + n) % n;
      const to = this.frames[at];
      const from = this.frames[(at - 1 + n) % n];
      if (back) since += (to.hold ?? 0) + this.dur(at);
      if (since >= 6 * LIFE.settleDecay) break;
      if (from.ease === "linear") continue;
      const amount = LIFE.settle * Math.min(1, 0.6 / this.dur((at - 1 + n) % n));
      const env = amount * Math.exp(-since / LIFE.settleDecay) * Math.sin((2 * Math.PI * since) / LIFE.settlePeriod);
      const tx = to.pose.hip[0] - from.pose.hip[0];
      const ty = to.pose.hip[1] - from.pose.hip[1];
      dHipX += tx * env;
      // Hips never overshoot upward (the legs are straight at lockout): they give a little instead.
      dHipY += ty > 0 ? ty * env : -ty * Math.abs(env) * 0.5;
      dTorso += (to.pose.torso - from.pose.torso) * env;
      dHead += ((to.pose.head ?? 0) - (from.pose.head ?? 0)) * env;
    }

    // Head follow-through: it trails the torso's pitch speed a little.
    if (frame.ease !== "linear" && local > 0 && progress < 1) {
      const rate = ((next.pose.torso - frame.pose.torso) * easeRate(progress)) / this.dur(i);
      dHead -= Math.max(-LIFE.headLagMax, Math.min(LIFE.headLagMax, rate * LIFE.headLag));
    }

    pose.hip = [pose.hip[0] + dHipX, pose.hip[1] + dHipY];
    pose.torso += dTorso;
    pose.head = (pose.head ?? 0) + dHead;
    pose.shrug = (pose.shrug ?? 0) + LIFE.breathShrug * (0.5 + 0.5 * breath);
    pose.twist = (pose.twist ?? 0) + LIFE.swayTwist * sway;
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
    if (this.life) this.alive(pose, time, i, local, progress);
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
