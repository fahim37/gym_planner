import * as THREE from "three";
import type { EquipmentModel } from "@/lib/three/equipment";
import type { Stage } from "@/lib/three/stage";
import { VIEWS, type View } from "./views";

/** Bounds of the model at rest, including its hotspots, plus `extra` (e.g. animated bounds). */
export function modelBox(model: EquipmentModel, extra?: THREE.Box3) {
  model.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model.group);
  for (const p of Object.values(model.hotspots)) box.expandByPoint(p);
  if (extra) box.union(extra);
  box.min.y = Math.min(box.min.y, 0);
  return box;
}

/** Places the camera along `view` at the smallest distance that shows every corner of `box`. */
export function frameCamera(camera: THREE.PerspectiveCamera, box: THREE.Box3, view: View, margin = 1.06) {
  const target = box.getCenter(new THREE.Vector3());
  const dir = new THREE.Vector3(...VIEWS[view]).normalize();
  const forward = dir.clone().negate();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward);
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanH = tanV * camera.aspect;
  const corner = new THREE.Vector3();
  let dist = 0.1;
  for (let i = 0; i < 8; i++) {
    corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(target);
    const depth = corner.dot(forward);
    dist = Math.max(dist, Math.abs(corner.dot(right)) / tanH - depth, Math.abs(corner.dot(up)) / tanV - depth);
  }
  dist *= margin;
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.near = Math.max(0.01, dist / 100);
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  return { target, dist };
}

/** Widens the key light's shadow frustum to cover big machines. */
export function fitShadows(stage: Stage, box: THREE.Box3) {
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius + box.getCenter(new THREE.Vector3()).length();
  stage.scene.traverse((o) => {
    const light = o as THREE.DirectionalLight;
    if (!light.isDirectionalLight || !light.castShadow) return;
    const cam = light.shadow.camera;
    const r = Math.max(2, radius * 1.1);
    cam.left = cam.bottom = -r;
    cam.right = cam.top = r;
    cam.updateProjectionMatrix();
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.map?.dispose();
    light.shadow.map = null;
  });
}

/** Runs the model's animation from 0 to `t` at 60 Hz, for deterministic stills. */
export function simulate(model: EquipmentModel, t: number, active: boolean) {
  if (!model.update) return;
  for (let s = 0; s < t; s += 1 / 60) model.update(s, active);
  model.update(t, active);
}

export interface Dot {
  id: string;
  x: number;
  y: number;
  /** Something sits between the camera and the hotspot. */
  hidden: boolean;
  /** What hides it (debug): material colour and distance in front of the hotspot. */
  by?: string;
}

const raycaster = new THREE.Raycaster();

/** Hotspots projected to 0–1 viewport coordinates, with a visibility check. */
export function projectDots(model: EquipmentModel, camera: THREE.Camera, occlusion = true): Dot[] {
  const dots: Dot[] = [];
  const p = new THREE.Vector3();
  model.group.updateMatrixWorld(true);
  for (const [id, local] of Object.entries(model.hotspots)) {
    p.copy(local).applyMatrix4(model.group.matrixWorld);
    let by: string | undefined;
    if (occlusion) {
      const dir = p.clone().sub(camera.position);
      const dist = dir.length();
      raycaster.set(camera.position, dir.normalize());
      raycaster.far = dist - 0.012;
      const hit = raycaster.intersectObject(model.group, true)[0];
      if (hit) {
        const mat = (hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
        by = `#${mat.color?.getHexString()} ${((dist - hit.distance) * 100).toFixed(1)}cm`;
      }
    }
    p.project(camera);
    dots.push({ id, x: (p.x + 1) / 2, y: (1 - p.y) / 2, hidden: !!by, by });
  }
  return dots;
}

/**
 * Runs `model` active for 6 s and then idle for 8 s, and returns the largest
 * distance (mm) between its parts / hotspots and those of the untouched `rest`
 * copy: moving parts must ease back to where they started. Disposes both.
 */
export function restDrift(model: EquipmentModel, rest: EquipmentModel): [number, number] {
  let t = 0;
  for (; t < 6; t += 1 / 60) model.update?.(t, true);
  for (; t < 14; t += 1 / 60) model.update?.(t, false);
  const a: THREE.Vector3[] = [];
  const b: THREE.Vector3[] = [];
  model.group.updateMatrixWorld(true);
  rest.group.updateMatrixWorld(true);
  model.group.traverse((o) => a.push(new THREE.Vector3().setFromMatrixPosition(o.matrixWorld)));
  rest.group.traverse((o) => b.push(new THREE.Vector3().setFromMatrixPosition(o.matrixWorld)));
  let parts = a.length === b.length ? 0 : Infinity;
  for (let i = 0; i < Math.min(a.length, b.length); i++) parts = Math.max(parts, a[i].distanceTo(b[i]));
  let spots = 0;
  for (const [id, p] of Object.entries(model.hotspots)) spots = Math.max(spots, p.distanceTo(rest.hotspots[id]));
  model.dispose();
  rest.dispose();
  return [parts * 1000, spots * 1000];
}
