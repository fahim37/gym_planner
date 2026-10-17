import { describe, expect, it } from "vitest";
import { getExercise } from "@/data/exercises";
import { getProgram } from "@/data/programs";
import { solvePose } from "@/lib/anatomy/solver";
import { Timeline } from "@/lib/anatomy/timeline";
import type { Vec3 } from "@/lib/anatomy/types";
import { dist, dot, len, scale, sub } from "./support/anatomy";

const direction = (a: Vec3, b: Vec3) => {
  const v = sub(b, a);
  return scale(v, 1 / len(v));
};

describe("home brick workout", () => {
  it("includes all four requested additions and leaves core until the end", () => {
    const day = getProgram("home-brick-workout")!.days[0];
    const slugs = day.exercises.map((e) => e.slug);
    expect(slugs).toHaveLength(14);
    expect(new Set(slugs).size).toBe(14);
    for (const slug of ["straight-leg-raise", "seated-knee-extension", "bodyweight-calf-raise", "glute-bridge"]) {
      expect(slugs).toContain(slug);
    }
    expect(slugs.indexOf("incline-push-up")).toBeLessThan(slugs.indexOf("overhead-brick-triceps-extension"));
    expect(slugs.indexOf("brick-bent-over-row")).toBeLessThan(slugs.indexOf("brick-biceps-curl"));
    expect(day.exercises.slice(-4).every((e) => getExercise(e.slug)!.region === "Core")).toBe(true);
    expect(day.instructions).toContain("01–14");
  });

  it("keeps incline push-up knees straight, hips aligned and hands planted throughout the rep", () => {
    const animation = getExercise("incline-push-up")!.animation;
    const timeline = new Timeline(animation, { life: false });
    const first = solvePose(timeline.sample(0).pose);
    for (let i = 0; i <= 40; i++) {
      const skeleton = solvePose(timeline.sample(timeline.duration * i / 40).pose);
      for (const side of [0, 1] as const) {
        const joints = skeleton.sides[side];
        const thigh = direction(joints.hip, joints.knee);
        const shin = direction(joints.knee, joints.ankle);
        const torso = direction(skeleton.pelvis, skeleton.chest);
        expect(dot(thigh, shin), `bent knee at sample ${i}`).toBeGreaterThan(0.999);
        expect(dot(torso, thigh), `hip sag at sample ${i}`).toBeLessThan(-0.999);
        expect(dist(joints.wrist, first.sides[side].wrist)).toBeLessThan(0.1);
        expect(dist(joints.toe, first.sides[side].toe), `sliding foot at sample ${i}`).toBeLessThan(0.6);
      }
    }
  });
});
