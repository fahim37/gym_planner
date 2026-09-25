/** Camera directions (from the target towards the camera) for the dev previews. */
export const VIEWS = {
  "3q": [1, 0.55, 0.85],
  front: [1, 0.28, 0.02],
  side: [0.02, 0.28, 1],
  left: [0.95, 0.55, -0.85],
  back: [-0.9, 0.55, -0.8],
  top: [0.3, 1, 0.25],
} satisfies Record<string, [number, number, number]>;

export type View = keyof typeof VIEWS;

export function isView(v: unknown): v is View {
  return typeof v === "string" && v in VIEWS;
}
