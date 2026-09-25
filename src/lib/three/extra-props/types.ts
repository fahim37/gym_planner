import type * as THREE from "three";
import type { BodyRig } from "../rig";

export type ExtraPropParams = Record<string, number | string | boolean>;

/** A prop built by a plug-in module; `update` runs every frame after the pose is solved. */
export interface ExtraProp {
  object: THREE.Object3D;
  /**
   * Hands that hold this prop: their fingers close around a handle of
   * `radius` metres (default 0.014) at the hand's grip centre
   * (rig.joints.sides[i].grip, knuckle axis gripAxis). "near" = side 0.
   */
  grip?: { hands: "both" | "near" | "far"; radius?: number; style?: "overhand" | "underhand" | "neutral" };
  /**
   * Flat surfaces a free hand lies on when it rests there (like the built-in bench and
   * box): authoring coordinates in cm — x range `from`..`to`, top height `top`
   * (y down, floor = 250), optional lateral centre `z` and `width` (default 30).
   */
  supports?: { from: number; to: number; top: number; z?: number; width?: number }[];
  update?: (rig: BodyRig) => void;
  dispose?: () => void;
}

export type ExtraPropBuilder = (params: ExtraPropParams) => ExtraProp;
