import type { AngleLimb, IkLimb, LimbSpec, Pose } from "@/lib/anatomy/types";

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
