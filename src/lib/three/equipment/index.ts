import * as THREE from "three";
import type { EquipmentSlug } from "@/lib/equipment-catalog";

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

/** TEMPORARY STUB — replaced by the real model builders. */
export function buildEquipmentModel(slug: EquipmentSlug): EquipmentModel {
  const group = new THREE.Group();
  group.name = slug;
  const geo = new THREE.BoxGeometry(1, 1, 0.6);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x52525b }));
  mesh.position.y = 0.5;
  group.add(mesh);
  return {
    group,
    hotspots: {},
    dispose: () => geo.dispose(),
  };
}
