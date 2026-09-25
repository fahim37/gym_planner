import * as THREE from "three";
import type { EquipmentSlug } from "@/lib/equipment-catalog";
import { buildEquipmentModel } from "./equipment";
import { Stage } from "./stage";

/**
 * Still images of equipment models from one shared offscreen WebGL context,
 * so a gallery doesn't need a live canvas (and GPU context) per card.
 */
const WIDTH = 640;
const HEIGHT = 480;
/** Three-quarter view from the front-right, a little above. */
export const EQUIPMENT_VIEW = new THREE.Vector3(0.9, 0.55, 0.85);

let stage: Stage | null = null;
const cache = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

function getStage() {
  if (!stage) {
    stage = new Stage(document.createElement("canvas"), { preserveDrawingBuffer: true, figure: false });
    stage.renderer.setPixelRatio(1);
    stage.resize(WIDTH, HEIGHT);
  }
  return stage;
}

function render(slug: EquipmentSlug): string {
  const s = getStage();
  const model = buildEquipmentModel(slug);
  s.scene.add(model.group);
  try {
    model.group.updateMatrixWorld(true);
    s.frame(model.group, { direction: EQUIPMENT_VIEW });
    model.update?.(0, false);
    s.render(0);
    return s.renderer.domElement.toDataURL("image/webp", 0.85);
  } finally {
    s.scene.remove(model.group);
    model.dispose();
  }
}

export function equipmentThumbnail(slug: EquipmentSlug): Promise<string> {
  let p = cache.get(slug);
  if (!p) {
    // One at a time, yielding a frame between jobs so scrolling stays smooth.
    p = queue.then(
      () =>
        new Promise<string>((resolve, reject) => {
          requestAnimationFrame(() => {
            try {
              resolve(render(slug));
            } catch (e) {
              reject(e);
            }
          });
        }),
    );
    queue = p.catch(() => undefined);
    cache.set(slug, p);
  }
  return p;
}
