/**
 * Solves every keyframe (and ~20 in-between times) of every exercise and checks
 * that the figure stays physically plausible. Failure messages name the slug,
 * the keyframe (or the time and the two keyframes it lies between) and the
 * limb, so content authors can go straight to the fix. Open /dev/<slug> in
 * `npm run dev` to see the frames.
 *
 * Coordinates are the authoring space from src/lib/anatomy/types.ts:
 * centimetres, x forward, y DOWN (floor at y = 250), z outward.
 */
import { describe, it } from "vitest";
import { EXERCISES } from "@/data/exercises";
import { BODY, solvePose } from "@/lib/anatomy/solver";
import { Timeline } from "@/lib/anatomy/timeline";
import { FLOOR_Y, type Animation, type Pose, type Skeleton, type Vec3 } from "@/lib/anatomy/types";
import {
  dist,
  fmt,
  fmtVec,
  frameTimes,
  ikReaches,
  isIkLimb,
  limbSpecs,
  namedJoints,
  skeletonNumbers,
  structuralDiff,
} from "./support/anatomy";
import { expectNoProblems } from "./support/problems";

/** Joint centres may dip this far below the floor line (cm) before it counts as an error. */
const FLOOR_TOLERANCE = 2;
/** How far (cm) an IK wrist/ankle may miss its target before it counts as over-stretched. */
const IK_TOLERANCE = 3;
/** Largest joint jump (cm) allowed where one keyframe hands over to the next. */
const SNAP_TOLERANCE = 2;
/** Planted heel/toe sliding further than this (cm) between keyframes is reported as a warning. */
const SLIDE_WARNING = 5;
/** In-between times sampled per loop, on top of every keyframe. */
const SAMPLES = 20;

const MAX_Y = FLOOR_Y + FLOOR_TOLERANCE;

interface Check {
  /** Human-readable location, e.g. "frame 2" or "t=1.35s (between frames 1→2)". */
  where: string;
  pose: Pose;
  /** Keyframe index, for keyframe checks. */
  frame?: number;
  /** [from, to] keyframe indices, for in-between samples. */
  segment?: [number, number];
  /** Whether limb [1] is the implicit mirror of limb [0] (the pose lists a single spec). */
  single: { arms: boolean; legs: boolean };
}

function checksFor(animation: Animation): Check[] {
  const tl = new Timeline(animation);
  const { starts } = frameTimes(animation);
  const n = animation.frames.length;
  const single = (...ks: number[]) => ({
    arms: ks.every((k) => animation.frames[k].pose.arms.length === 1),
    legs: ks.every((k) => animation.frames[k].pose.legs.length === 1),
  });
  const out: Check[] = animation.frames.map((f, i) => ({ where: `frame ${i}`, pose: f.pose, frame: i, single: single(i) }));
  for (let j = 0; j < SAMPLES; j++) {
    const t = (tl.duration * (j + 0.5)) / SAMPLES;
    let i = n - 1;
    while (i > 0 && starts[i] > t) i--;
    const next = (i + 1) % n;
    out.push({ where: `t=${t.toFixed(2)}s (between frames ${i}→${next})`, pose: tl.sample(t).pose, segment: [i, next], single: single(i, next) });
  }
  return out;
}

/**
 * Collects problems keyed by (location, limb) so each mistake is reported
 * once: keyframe problems are always kept; an in-between problem is dropped
 * when the same limb already fails at one of the segment's keyframes, and
 * otherwise only the worst sample per segment is kept. A mirrored far limb
 * (single spec in the pose) failing like the near one is folded into it.
 */
class Problems {
  private readonly atFrame = new Set<string>();
  private readonly items = new Map<string, { score: number; message: string; mirrored?: string }>();
  add(c: Check, limb: string, score: number, message: string) {
    const loc = c.frame !== undefined ? `frame ${c.frame}` : `seg ${c.segment!.join("→")}`;
    const mirror = /^(arms|legs)\[1\]$/.exec(limb);
    if (mirror && c.single[mirror[1] as "arms" | "legs"]) {
      const near = this.items.get(`${loc}|${mirror[1]}[0]`);
      if (near) {
        near.mirrored = limb;
        if (c.frame !== undefined) this.atFrame.add(`${c.frame}|${limb}`);
        return;
      }
    }
    if (c.frame !== undefined) {
      this.atFrame.add(`${c.frame}|${limb}`);
      this.items.set(`${loc}|${limb}`, { score, message });
      return;
    }
    const [a, b] = c.segment!;
    if (this.atFrame.has(`${a}|${limb}`) || this.atFrame.has(`${b}|${limb}`)) return;
    const cur = this.items.get(`${loc}|${limb}`);
    if (!cur || score > cur.score) this.items.set(`${loc}|${limb}`, { score, message, mirrored: cur?.mirrored });
  }
  get size() {
    return this.items.size;
  }
  list() {
    return [...this.items.values()].map((v) => (v.mirrored ? `${v.message} (same for the mirrored ${v.mirrored})` : v.message));
  }
}

/** Keyframes first, so in-between samples can be de-duplicated against them. */
const ordered = (checks: Check[]) => [...checks.filter((c) => c.frame !== undefined), ...checks.filter((c) => c.frame === undefined)];

/** "arms[0] hand" → "arms[0]"; trunk joints are grouped as "trunk". */
const limbOf = (joint: string) => (joint.startsWith("arms[") || joint.startsWith("legs[") ? joint.split(" ")[0] : "trunk");

/** JSON with numbers rounded to 0.1, for readable interpolated targets. */
const brief = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "number" ? Math.round(x * 10) / 10 : x));

/**
 * The pose before its whole-body `orient` rotation. IK targets are authored in
 * this space: the solver reaches them first, then rotates the solved skeleton.
 */
function unrotated(p: Pose): Pose {
  const q: Pose & { orient?: unknown } = { ...p };
  delete q.orient;
  return q;
}

/** What the timeline actually interpolates: both limbs filled in, head/twist defaulted. */
const normalized = (p: Pose) => ({ ...p, head: p.head ?? 0, twist: p.twist ?? 0, ...limbSpecs(p) });

const onFloor = (p: Vec3) => p[1] >= FLOOR_Y - 9;
const horizontal = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);

function floorProblems(c: Check, s: Skeleton, out: Problems) {
  const below = new Map<string, [string, Vec3][]>();
  for (const [name, p] of namedJoints(s)) {
    if (p[1] > MAX_Y) below.set(limbOf(name), [...(below.get(limbOf(name)) ?? []), [name, p]]);
  }
  for (const [limb, joints] of below) {
    const [name, p] = joints.reduce((w, j) => (j[1][1] > w[1][1] ? j : w));
    const others = joints.filter(([n]) => n !== name).map(([n]) => n.replace(/^\S+ /, ""));
    out.add(
      c,
      limb,
      p[1],
      `${c.where}: ${name} at y=${fmt(p[1])} is ` +
        `${fmt(p[1] - FLOOR_Y)} cm below the floor (y=${FLOOR_Y}, tolerance ${FLOOR_TOLERANCE} cm)` +
        (others.length ? `; also below: ${others.join(", ")}` : ""),
    );
  }
  const headBottom = s.head[1] + BODY.headRadius;
  if (headBottom > MAX_Y) {
    out.add(
      c,
      "head",
      headBottom,
      `${c.where}: head (radius ${BODY.headRadius} cm around y=${fmt(s.head[1])}) sinks ${fmt(headBottom - FLOOR_Y)} cm into the floor — raise the torso or pitch the head (\`head\`)`,
    );
  }
}

describe.each(EXERCISES.map((e) => [e.slug, e] as const))("%s", (slug, e) => {
  const checks = ordered(checksFor(e.animation));
  const { frames } = e.animation;

  it("solves every keyframe and in-between pose without NaN", () => {
    const problems = new Problems();
    for (const c of checks) {
      const bad = skeletonNumbers(solvePose(c.pose)).filter(([, v]) => !Number.isFinite(v));
      if (bad.length) {
        problems.add(c, "all", 1, `${c.where}: ${bad.slice(0, 4).map(([k, v]) => `${k}=${v}`).join(", ")} — look for missing or NaN numbers in the pose`);
      }
    }
    expectNoProblems(problems.list(), slug);
  });

  it(`keeps every joint above the floor (y ≤ ${MAX_Y})`, () => {
    const problems = new Problems();
    for (const c of checks) floorProblems(c, solvePose(c.pose), problems);
    expectNoProblems(problems.list(), slug);
  });

  it(`reaches every IK target (within ${IK_TOLERANCE} cm)`, () => {
    const problems = new Problems();
    const warnings = new Problems();
    for (const c of checks) {
      const pose = unrotated(c.pose);
      const s = solvePose(pose);
      for (const r of ikReaches(pose, s)) {
        const i = r.limb.endsWith("[1]") ? 1 : 0;
        const isArm = r.limb.startsWith("arms");
        const miss = dist(isArm ? s.sides[i].wrist : s.sides[i].ankle, r.target);
        if (miss <= IK_TOLERANCE) continue;
        const detail =
          r.distance > r.max
            ? `is ${fmt(r.distance)} cm from the ${isArm ? "shoulder" : "hip"}, but the ${isArm ? "arm" : "leg"} reaches ${fmt(r.max)} cm (over-stretched by ${fmt(r.distance - r.max)} cm)`
            : `is ${fmt(r.distance)} cm from the ${isArm ? "shoulder" : "hip"}, closer than the folded limb allows (${fmt(r.min)} cm)`;
        const message = `${c.where}: ${r.limb} IK target ${brief(r.spec)} → ${fmtVec(r.target)} ${detail}`;
        if (c.segment) {
          // Mid-move misses only matter when the hand/foot is anchored (same
          // target at both ends: a bar, a bench, the floor). A target that moves
          // between keyframes just traces a slightly different path.
          const kind = isArm ? "arms" : "legs";
          const [a, b] = c.segment.map((k) => limbSpecs(frames[k].pose)[kind][i]);
          const anchored = isIkLimb(a) && isIkLimb(b) && JSON.stringify(a.ik) === JSON.stringify(b.ik);
          if (!anchored) {
            warnings.add(c, r.limb, miss, `${message} — the moving target is out of reach mid-move; add a keyframe or bring the body closer`);
            continue;
          }
        }
        problems.add(c, r.limb, miss, `${message}; the ${isArm ? "wrist" : "ankle"} misses it by ${fmt(miss)} cm`);
      }
    }
    if (warnings.size) console.warn(`[warning] ${slug}: IK target out of reach between keyframes\n  ${warnings.list().join("\n  ")}`);
    expectNoProblems(problems.list(), slug);
  });

  it("does not snap where one keyframe hands over to the next", () => {
    // Authored keyframes only: the live settle/breathing/sway is continuous in time anyway.
    const tl = new Timeline(e.animation, { life: false });
    const { starts, holds, durs } = frameTimes(e.animation);
    const problems: string[] = [];
    frames.forEach((f, i) => {
      const next = (i + 1) % frames.length;
      // Just before `next` starts, the timeline has (almost) finished blending i → next.
      const arriving = namedJoints(solvePose(tl.sample(starts[i] + holds[i] + durs[i] - 1e-7).pose));
      const target = namedJoints(solvePose(frames[next].pose));
      let worst = { name: "", d: 0 };
      arriving.forEach(([name, p], k) => {
        const d = dist(p, target[k][1]);
        if (d > worst.d) worst = { name, d };
      });
      if (worst.d > SNAP_TOLERANCE) {
        const why = structuralDiff(normalized(f.pose), normalized(frames[next].pose));
        problems.push(
          `frames ${i}→${next}: ${worst.name} jumps ${fmt(worst.d)} cm the instant frame ${next} starts. ` +
            `The timeline blends only numbers and keeps frame ${i}'s keys, so both frames need the same limb form (ik vs angles), rel/local and optional keys` +
            (why.length ? ` — differences: ${why.slice(0, 5).join("; ")}` : ""),
        );
      }
    });
    expectNoProblems(problems, slug);
  });

  it("keeps planted feet in place between keyframes (warning only)", () => {
    const solved = frames.map((f) => solvePose(f.pose));
    const warnings: string[] = [];
    frames.forEach((_, i) => {
      const next = (i + 1) % frames.length;
      for (const side of [0, 1] as const) {
        const a = solved[i].sides[side];
        const b = solved[next].sides[side];
        const slides = (["heel", "toe"] as const)
          .filter((k) => onFloor(a[k]) && onFloor(b[k]))
          .map((k) => ({ k, d: horizontal(a[k], b[k]) }));
        if (slides.length === 0) continue;
        const least = slides.reduce((m, s) => (s.d < m.d ? s : m));
        if (least.d > SLIDE_WARNING) warnings.push(`frames ${i}→${next}: legs[${side}] ${least.k} stays on the floor but slides ${fmt(least.d)} cm`);
      }
    });
    if (warnings.length) console.warn(`[warning] ${slug}: planted foot slides\n  ${warnings.join("\n  ")}`);
  });
});
