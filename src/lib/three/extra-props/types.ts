import type * as THREE from "three";
import type { BodyRig } from "../rig";

export type ExtraPropParams = Record<string, number | string | boolean>;

/** A prop built by a plug-in module; `update` runs every frame after the pose is solved. */
export interface ExtraProp {
  object: THREE.Object3D;
  update?: (rig: BodyRig) => void;
  dispose?: () => void;
}

export type ExtraPropBuilder = (params: ExtraPropParams) => ExtraProp;
