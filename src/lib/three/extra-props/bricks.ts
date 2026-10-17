import * as THREE from "three";
import type { ExtraPropBuilder } from "./types";

/** Terracotta blocks following one hand each, or a single block held between both hands. */
export const bricks: ExtraPropBuilder = (params) => {
  const shared = params.shared === true;
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(0.1, 0.065, shared ? 0.28 : 0.21);
  const material = new THREE.MeshStandardMaterial({ color: 0xb65d3a, roughness: 0.95 });
  const blocks = Array.from({ length: shared ? 1 : 2 }, () => {
    const block = new THREE.Mesh(geometry, material);
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block);
    return block;
  });
  const across = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 0, 1);
  return {
    object: group,
    grip: { hands: "both", radius: 0.035, style: params.grip === "underhand" ? "underhand" : "neutral" },
    update(rig) {
      if (!rig.joints) return;
      const [near, far] = rig.joints.sides;
      if (shared) {
        blocks[0].position.copy(near.grip).add(far.grip).multiplyScalar(0.5);
        across.subVectors(near.grip, far.grip);
        if (across.lengthSq() > 1e-8) blocks[0].quaternion.setFromUnitVectors(axis, across.normalize());
      } else {
        rig.joints.sides.forEach((side, i) => {
          blocks[i].position.copy(side.grip);
          blocks[i].quaternion.setFromUnitVectors(axis, across.copy(side.gripAxis).normalize());
        });
      }
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
};
