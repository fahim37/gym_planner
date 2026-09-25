import * as THREE from "three";
import type { EquipmentSlug } from "@/lib/equipment-catalog";
import { exerciseMat } from "./accessories";
import { adjustableBench, flatBench, powerRack } from "./benches";
import { exerciseBike, rowingMachine, treadmill } from "./cardio";
import { barbell, dumbbells, ezCurlBar, kettlebell } from "./free-weights";
import { cableMachine, latPulldown, legExtension, legPress, smithMachine } from "./machines";

/**
 * A procedurally built 3D model of one piece of gym equipment.
 *
 * Conventions: metres, y up, the model stands on the floor (min y = 0) and is
 * roughly centred on x/z. "Front" (where a user stands or sits) faces +x.
 */
export interface EquipmentModel {
  group: THREE.Group;
  /** Model-space anchor for each part id listed in EQUIPMENT_CATALOG. */
  hotspots: Record<string, THREE.Vector3>;
  /**
   * Optional "in use" animation of moving parts (belt, pedals, weight stack…).
   * `time` is seconds; `active` is false when the demo is switched off, in
   * which case moving parts should ease back to rest.
   */
  update?: (time: number, active: boolean) => void;
  dispose(): void;
}

const BUILDERS: Record<EquipmentSlug, () => EquipmentModel> = {
  barbell,
  dumbbells,
  kettlebell,
  "ez-curl-bar": ezCurlBar,
  "flat-bench": flatBench,
  "adjustable-bench": adjustableBench,
  "power-rack": powerRack,
  "cable-machine": cableMachine,
  "lat-pulldown": latPulldown,
  "smith-machine": smithMachine,
  "leg-press": legPress,
  "leg-extension": legExtension,
  treadmill,
  "rowing-machine": rowingMachine,
  "exercise-bike": exerciseBike,
  "exercise-mat": exerciseMat,
};

/** Builds the model for one catalogue slug (browser only: textures use canvas). */
export function buildEquipmentModel(slug: EquipmentSlug): EquipmentModel {
  return BUILDERS[slug]();
}

/**
 * Model-space bounds covering the model at rest and throughout its "in use"
 * animation (a raised backrest, an unrolled mat…), for camera framing.
 * Builds and disposes a throwaway copy of the model.
 */
export function equipmentBounds(slug: EquipmentSlug): THREE.Box3 {
  const model = buildEquipmentModel(slug);
  const box = new THREE.Box3();
  const sample = () => {
    model.group.updateMatrixWorld(true);
    box.union(new THREE.Box3().setFromObject(model.group));
  };
  sample();
  if (model.update) {
    for (let i = 0; i <= 8 * 30; i++) {
      model.update(i / 30, true);
      if (i % 3 === 0) sample();
    }
  }
  model.dispose();
  box.min.y = Math.min(box.min.y, 0);
  return box;
}
