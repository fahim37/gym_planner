import { describe, expect, it } from "vitest";
import { Timeline } from "@/lib/anatomy/timeline";
import type { Animation, Pose } from "@/lib/anatomy/types";
import { EXERCISES } from "@/data/exercises";
import { frameTimes } from "./support/anatomy";

/** A pose whose hip x doubles as an easy-to-read "position" value. */
const at = (x: number, extra: Partial<Pose> = {}): Pose => ({
  hip: [x, 150],
  torso: 0,
  arms: [{ angles: [x / 10, 0] }],
  legs: [{ angles: [0, 0] }],
  ...extra,
});

const x = (tl: Timeline, t: number) => tl.sample(t).pose.hip[0];

/*
 * frame 0: x=100, moves for 1 s, rep            starts at 0
 * frame 1: x=200, holds 0.5 s, moves for 2 s    starts at 1
 * frame 2: x=300, holds 0.25 s, moves for 1 s   starts at 3.5, rep
 * loop length: 4.75 s
 */
const ANIM: Animation = {
  frames: [
    { pose: at(100), dur: 1, cue: "a", rep: true },
    { pose: at(200), dur: 2, hold: 0.5, cue: "b" },
    { pose: at(300), dur: 1, hold: 0.25, cue: "c", rep: true },
  ],
};
const LOOP = 4.75;
/** Unit tests check exact interpolation, so the subtle "alive" motion is off. */
const EXACT = { life: false };
/** Minimum-jerk ease (the Timeline's smooth blend). */
const ease = (k: number) => k * k * k * (10 - 15 * k + 6 * k * k);

describe("Timeline: durations", () => {
  it("sums holds and move times", () => {
    const tl = new Timeline(ANIM, EXACT);
    expect(tl.duration).toBeCloseTo(LOOP, 12);
    expect(tl.length).toBe(3);
  });

  it("uses a default move time for frames without `dur`", () => {
    const tl = new Timeline({ frames: [{ pose: at(0) }, { pose: at(10), hold: 1 }] }, EXACT);
    expect(tl.duration).toBeGreaterThan(1);
    const defaultDur = (tl.duration - 1) / 2;
    expect(defaultDur).toBeGreaterThan(0.3);
    expect(defaultDur).toBeLessThan(3);
    expect(new Timeline({ frames: [{ pose: at(0) }] }, EXACT).duration).toBeCloseTo(defaultDur, 12);
  });
});

describe("Timeline: easing", () => {
  const tl = new Timeline(ANIM, EXACT);

  it("hits every keyframe exactly at its start", () => {
    expect(x(tl, 0)).toBe(100);
    expect(x(tl, 1)).toBe(200);
    expect(x(tl, 3.5)).toBe(300);
  });

  it("arrives at the next keyframe at the end of the move", () => {
    expect(x(tl, 1 - 1e-9)).toBeCloseTo(200, 6);
    expect(x(tl, 3.5 - 1e-9)).toBeCloseTo(300, 6);
    // The last frame eases back to the first.
    expect(x(tl, LOOP - 1e-9)).toBeCloseTo(100, 6);
  });

  it("is half-way at the middle of a move and follows the minimum-jerk ease", () => {
    expect(x(tl, 0.5)).toBeCloseTo(150, 9);
    expect(x(tl, 0.25)).toBeCloseTo(100 + 100 * ease(0.25), 9);
    expect(x(tl, 1.5 + 1)).toBeCloseTo(250, 9);
    expect(x(tl, 3.75 + 0.5)).toBeCloseTo(200, 9);
  });

  it("starts and stops slowly (zero velocity at the keyframes)", () => {
    const linearStep = 100 * 0.01;
    expect(x(tl, 0.01) - 100).toBeLessThan(linearStep / 10);
    expect(200 - x(tl, 0.99)).toBeLessThan(linearStep / 10);
  });

  it("moves monotonically between two keyframes", () => {
    let prev = x(tl, 1.5);
    for (let t = 1.5; t <= 3.5; t += 0.01) {
      const v = x(tl, t);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it("interpolates every number in the pose, including limb angles", () => {
    const p = tl.sample(0.5).pose;
    const arm = p.arms[0];
    expect("angles" in arm && arm.angles[0]).toBeCloseTo(15, 9);
  });

  it("takes non-numeric values from the frame being left", () => {
    const t = new Timeline({
      frames: [
        { pose: at(0, { legs: [{ angles: [0, 0], footFollowsShin: true }] }), dur: 1 },
        { pose: at(10, { legs: [{ angles: [0, 0], footFollowsShin: false }] }), dur: 1 },
      ],
    });
    const leg = t.sample(0.9).pose.legs[0];
    expect("footFollowsShin" in leg && leg.footFollowsShin).toBe(true);
  });
});

describe("Timeline: holds", () => {
  const tl = new Timeline(ANIM, EXACT);

  it("stays on a keyframe for its hold, then starts moving", () => {
    for (const t of [1, 1.1, 1.25, 1.49]) expect(x(tl, t), `t=${t}`).toBe(200);
    expect(x(tl, 1.51)).toBeGreaterThan(200);
    for (const t of [3.5, 3.6, 3.74]) expect(x(tl, t), `t=${t}`).toBe(300);
    expect(x(tl, 3.76)).toBeLessThan(300);
  });

  it("shows the cue of the keyframe being left (or held)", () => {
    expect(tl.sample(0.5).cue).toBe("a");
    expect(tl.sample(1.2).cue).toBe("b");
    expect(tl.sample(2).cue).toBe("b");
    expect(tl.sample(4).cue).toBe("c");
  });
});

describe("Timeline: looping", () => {
  const tl = new Timeline(ANIM, EXACT);

  it("repeats the same poses every loop", () => {
    for (const t of [0, 0.3, 1.2, 2.2, 3.6, 4.5]) {
      for (const loops of [1, 2, 7, 100]) {
        const a = tl.sample(t).pose;
        const b = tl.sample(t + loops * LOOP).pose;
        expect(b.hip[0], `t=${t} loop ${loops}`).toBeCloseTo(a.hip[0], 6);
        expect(b.hip[1]).toBeCloseTo(a.hip[1], 6);
      }
    }
  });

  it("reports cycle progress in [0, 1)", () => {
    for (let t = 0; t < 5 * LOOP; t += 0.37) {
      const { cycle } = tl.sample(t);
      expect(cycle).toBeGreaterThanOrEqual(0);
      expect(cycle).toBeLessThan(1);
    }
    expect(tl.sample(LOOP / 2).cycle).toBeCloseTo(0.5, 9);
  });

  it("fills in the mirrored second limb, head and twist", () => {
    const p = tl.sample(0.3).pose;
    expect(p.arms).toHaveLength(2);
    expect(p.legs).toHaveLength(2);
    expect(p.head).toBe(0);
    expect(p.twist).toBe(0);
  });

  it("keyframe() returns authored poses and clamps the index", () => {
    expect(tl.keyframe(1).hip[0]).toBe(200);
    expect(tl.keyframe(99).hip[0]).toBe(300);
  });
});

describe("Timeline: rep counting", () => {
  const tl = new Timeline(ANIM, EXACT);

  it("starts at zero", () => {
    expect(tl.sample(0).reps).toBe(0);
    expect(tl.sample(0.9).reps).toBe(0);
    expect(tl.sample(3.49).reps).toBe(0);
  });

  it("counts a rep on arrival at a rep frame (before its hold)", () => {
    expect(tl.sample(3.5).reps).toBe(1);
    expect(tl.sample(3.6).reps).toBe(1);
    expect(tl.sample(LOOP - 1e-6).reps).toBe(1);
  });

  it("counts arrival at a rep-marked first frame when the loop wraps", () => {
    expect(tl.sample(LOOP).reps).toBe(2);
    expect(tl.sample(LOOP + 3.5).reps).toBe(3);
    expect(tl.sample(3 * LOOP + 3.5).reps).toBe(7);
  });

  it("repFrames-style animations (rep on the start frame) count on return", () => {
    const t = new Timeline({
      frames: [
        { pose: at(0), dur: 1.3, rep: true },
        { pose: at(10), dur: 1, hold: 0.15 },
      ],
    });
    expect(t.sample(1.3).reps).toBe(0);
    expect(t.sample(2.44).reps).toBe(0);
    expect(t.sample(2.46).reps).toBe(1);
  });

  it("counts one rep per loop when no frame is marked", () => {
    const t = new Timeline({ frames: [{ pose: at(0), dur: 1 }, { pose: at(10), dur: 1 }] }, EXACT);
    expect(t.sample(1.5).reps).toBe(0);
    expect(t.sample(2).reps).toBe(1);
    expect(t.sample(6.5).reps).toBe(3);
  });

  it.each(EXERCISES.map((e) => [e.slug, e] as const))(
    "%s: reps never go backwards and advance by the marked reps per loop",
    (_slug, e) => {
      const t = new Timeline(e.animation);
      const marked = Math.max(1, e.animation.frames.filter((f) => f.rep).length);
      let prev = 0;
      const steps = 400;
      for (let n = 0; n <= steps; n++) {
        const time = (3 * t.duration * n) / steps;
        const { reps } = t.sample(time);
        expect(reps, `t=${time.toFixed(3)}s`).toBeGreaterThanOrEqual(prev);
        expect(reps - prev, `t=${time.toFixed(3)}s`).toBeLessThanOrEqual(marked);
        prev = reps;
      }
      expect(t.sample(3 * t.duration + 1e-6).reps).toBe(3 * marked);
    },
  );
});

describe("Timeline: alive motion (settle, breathing, sway, head follow-through)", () => {
  const dist = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
  it("is subtle and continuous, and planted feet stay put", async () => {
    const { solvePose } = await import("@/lib/anatomy/solver");
    const problems: string[] = [];
    for (const e of EXERCISES) {
      const live = new Timeline(e.animation);
      const exact = new Timeline(e.animation, EXACT);
      // No pops: the extra motion changes little between 5 ms samples.
      let prev = live.sample(0).pose;
      let prevX = exact.sample(0).pose;
      let jump = 0;
      for (let t = 0.005; t < live.duration * 2; t += 0.005) {
        const p = live.sample(t).pose;
        const x = exact.sample(t).pose;
        jump = Math.max(jump, Math.abs(p.torso - x.torso - (prev.torso - prevX.torso)), dist(p.hip, x.hip) - dist(prev.hip, prevX.hip));
        [prev, prevX] = [p, x];
      }
      if (jump > 0.3) problems.push(`${e.slug}: alive offset jumps ${jump.toFixed(2)} in 5 ms`);
      let head = 0;
      let pelvis = 0;
      let ankle = 0;
      // At the moments each keyframe is reached (where the rep-to-rep tempo variation is zero).
      const { starts } = frameTimes(e.animation);
      for (const t of starts) {
        const a = solvePose(live.sample(t).pose);
        const b = solvePose(exact.sample(t).pose);
        head = Math.max(head, dist(a.head, b.head));
        pelvis = Math.max(pelvis, dist(a.pelvis, b.pelvis));
        if ("ik" in e.animation.frames[0].pose.legs[0]) ankle = Math.max(ankle, dist(a.sides[0].ankle, b.sides[0].ankle));
      }
      if (head > 4 || pelvis > 2 || ankle > 1) problems.push(`${e.slug}: head ${head.toFixed(1)}, pelvis ${pelvis.toFixed(1)}, ankle ${ankle.toFixed(1)} cm`);
    }
    expect(problems).toEqual([]);
  }, 30000);

  it("can be turned off", () => {
    expect(new Timeline(ANIM, EXACT).sample(0.3).pose.twist).toBe(0);
    expect(new Timeline(ANIM).sample(0.3).pose.twist).not.toBe(0);
  });
});
