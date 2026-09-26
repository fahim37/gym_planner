/**
 * A barbell must never pass through the head: samples every barbell exercise and
 * checks the bar (the line through both hands) against the skull and the face.
 * Coordinates: centimetres, x forward, y down (src/lib/anatomy/types.ts).
 */
import { expect, it } from "vitest";
import { EXERCISES } from "@/data/exercises";
import { BODY, solvePose } from "@/lib/anatomy/solver";
import { Timeline } from "@/lib/anatomy/timeline";
import type { Vec3 } from "@/lib/anatomy/types";

/** Bar radius plus a little air (cm). */
const CLEARANCE = 1.5;
const SAMPLES = 200;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3) => Math.sqrt(dot(a, a));

/** Distance from p to the bar line through a and b (extended past the hands). */
function toBar(p: Vec3, a: Vec3, b: Vec3) {
  const ab = sub(b, a);
  const u = Math.max(-1, Math.min(2, dot(sub(p, a), ab) / dot(ab, ab)));
  return len(sub(p, [a[0] + ab[0] * u, a[1] + ab[1] * u, a[2] + ab[2] * u]));
}

it("keeps every barbell clear of the head and face", () => {
  const problems: string[] = [];
  for (const e of EXERCISES) {
    if (!e.animation.props?.some((p) => p.type === "barbell")) continue;
    const tl = new Timeline(e.animation);
    let worst = Infinity;
    let at = 0;
    for (let j = 0; j < SAMPLES; j++) {
      const t = (tl.duration * j) / SAMPLES;
      const s = solvePose(tl.sample(t).pose);
      const [a, b] = [s.sides[0].hand, s.sides[1].hand];
      const f = s.headForward;
      // Skull sphere, and a smaller sphere for the face/chin in front of it.
      const face: Vec3 = [s.head[0] + f[0] * 6, s.head[1] + f[1] * 6 + 3, s.head[2] + f[2] * 6];
      const gap = Math.min(toBar(s.head, a, b) - BODY.headRadius, toBar(face, a, b) - 7);
      if (gap < worst) [worst, at] = [gap, t];
    }
    if (worst < CLEARANCE) problems.push(`${e.slug}: bar ${(-worst).toFixed(1)} cm into the head at t=${at.toFixed(2)}s`);
  }
  expect(problems).toEqual([]);
});

/** Hands holding a dumbbell or kettlebell: the weight stays this far (cm) from the skull and face surfaces. */
const WEIGHT_CLEARANCE = 3;
const holdsWeight = (e: (typeof EXERCISES)[number]) =>
  e.animation.props?.some((p) => p.type === "dumbbell" || p.type === "kettlebell" || (p.type === "extra" && /dumbbell/.test(p.kind)));

it("keeps dumbbells and kettlebells out of the face", () => {
  const problems: string[] = [];
  for (const e of EXERCISES) {
    if (!holdsWeight(e)) continue;
    const tl = new Timeline(e.animation);
    let worst = Infinity;
    let at = 0;
    for (let j = 0; j < SAMPLES; j++) {
      const t = (tl.duration * j) / SAMPLES;
      const s = solvePose(tl.sample(t).pose);
      const f = s.headForward;
      const face: Vec3 = [s.head[0] + f[0] * 6, s.head[1] + f[1] * 6 + 3, s.head[2] + f[2] * 6];
      for (const side of s.sides) {
        // The dumbbell runs across the palm (about along the chest's side axis), ±12 cm.
        for (let k = -12; k <= 12; k += 4) {
          const p: Vec3 = [side.hand[0] + s.chestSide[0] * k, side.hand[1] + s.chestSide[1] * k, side.hand[2] + s.chestSide[2] * k];
          const gap = Math.min(len(sub(p, s.head)) - BODY.headRadius, len(sub(p, face)) - 7);
          if (gap < worst) [worst, at] = [gap, t];
        }
      }
    }
    if (worst < WEIGHT_CLEARANCE) problems.push(`${e.slug}: weight ${worst.toFixed(1)} cm from the head at t=${at.toFixed(2)}s`);
  }
  expect(problems).toEqual([]);
});
