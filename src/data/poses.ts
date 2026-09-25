import type { AngleLimb, IkLimb, Keyframe, LimbSpec, Pose } from "@/lib/anatomy/types";

/** Standing pelvis height with soft knees. */
export const STAND_Y = 156;
export const ANKLE_Y = 245;

/** Planted foot at x, `width` cm from the midline. */
export const planted = (x: number, width = 11, pole: [number, number, number] = [1, 0, 0.12]): IkLimb => ({
  ik: { x, y: ANKLE_Y, z: width },
  pole,
});

/** Arms hanging relaxed by the sides. */
export const armsDown: AngleLimb = { angles: [2, 4], spread: [9, 5] };

/** Hand position relative to the shoulder centre, in world axes. */
export const hand = (
  x: number,
  y: number,
  z: number,
  pole: [number, number, number] = [-1, 0.2, 0.3],
): LimbSpec => ({ ik: { x, y, z, rel: "chest" }, pole });

/** Hand position relative to the shoulder centre, in torso axes (x: chest normal, y: down the spine). */
export const handLocal = (
  x: number,
  y: number,
  z: number,
  pole: [number, number, number],
): LimbSpec => ({ ik: { x, y, z, rel: "chest", local: true }, pole });

export const standing = (overrides: Partial<Pose> = {}): Pose => ({
  hip: [160, STAND_Y],
  torso: 0,
  arms: [armsDown],
  legs: [planted(162)],
  ...overrides,
});

/** Lying face-up on the floor or a bench, head towards -x, knees bent. */
export const lyingOnBack = (
  pelvisY: number,
  torso: number,
  arms: [LimbSpec] | [LimbSpec, LimbSpec],
  pelvisX = 160,
): Pose => ({
  hip: [pelvisX, pelvisY],
  torso,
  arms,
  legs: [{ ik: { x: 205, y: 245, z: 13 }, pole: [0.2, -1, 0.1] }],
});

/** High plank: straight body from toes to shoulders, hands under shoulders. */
export const HIGH_PLANK = { hip: [150, 204] as [number, number], torso: 72 };
export const plankHands: LimbSpec = { ik: { x: 209, y: 243, z: 24 }, pole: [-0.6, -1, 0.5] };
export const straightLegBack = (angle: number, foot = 72): LimbSpec => ({ angles: [angle, angle], foot });

/**
 * One repetition as two keyframes. `go` is the time from start to end,
 * `hold` the pause at the end, `back` the return; the rep counts on return.
 */
export function repFrames(
  start: Pose,
  end: Pose,
  opts: { go?: number; back?: number; hold?: number; cues?: [string, string] } = {},
): Keyframe[] {
  return [
    { pose: start, dur: opts.go ?? 1.3, cue: opts.cues?.[0], rep: true },
    { pose: end, dur: opts.back ?? 1, hold: opts.hold ?? 0.15, cue: opts.cues?.[1] },
  ];
}
