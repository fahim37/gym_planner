import * as THREE from "three";
import { toWorld } from "../rig";
import type { ExtraPropBuilder, ExtraPropParams } from "./types";

/*
 * Props for the core, cardio and mobility library. Builders return an object
 * plus an optional `update(rig)` that runs every frame after the pose is
 * solved; `rig.joints` holds world-space joints (metres, y up, floor at 0).
 * Positions passed in `params` are authoring centimetres (x forward, y down,
 * floor at 250, z outward) unless noted.
 */

const num = (p: ExtraPropParams, key: string, fallback: number) => (typeof p[key] === "number" ? (p[key] as number) : fallback);
const str = (p: ExtraPropParams, key: string, fallback: string) => (typeof p[key] === "string" ? (p[key] as string) : fallback);

/** Shared materials (never disposed, like the ones in ../props). */
let shared: ReturnType<typeof createMaterials> | null = null;
function createMaterials() {
  return {
    rubber: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.25, metalness: 0.9 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.4, metalness: 0.6 }),
    frameDark: new THREE.MeshStandardMaterial({ color: 0x2e2e33, roughness: 0.45, metalness: 0.5 }),
    pad: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 }),
    grip: new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.75 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xa47148, roughness: 0.7 }),
  };
}
const mats = () => (shared ??= createMaterials());

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Collects geometries so a prop can free them on dispose. */
class Geos {
  private readonly list: THREE.BufferGeometry[] = [];
  add<T extends THREE.BufferGeometry>(g: T): T {
    this.list.push(g);
    return g;
  }
  dispose = () => this.list.forEach((g) => g.dispose());
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent?: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  parent?.add(m);
  return m;
}

/** A cylinder from `a` to `b` (world metres). */
function rod(geos: Geos, parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 16) {
  const m = mesh(geos.add(new THREE.CylinderGeometry(r, r, a.distanceTo(b), seg)), mat, parent);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(Y_AXIS, new THREE.Vector3().subVectors(b, a).normalize());
  return m;
}

/** An axis-aligned box centred at `c` (world metres). */
function block(geos: Geos, parent: THREE.Object3D, c: THREE.Vector3, w: number, h: number, d: number, mat: THREE.Material) {
  const m = mesh(geos.add(new THREE.BoxGeometry(w, h, d)), mat, parent);
  m.position.copy(c);
  return m;
}

/** Authoring cm → world metres. */
const W = (x: number, y: number, z = 0) => toWorld([x, y, z]);

/** Midpoint of the two palms (a little back from the fingertips toward the wrists). */
function palms(rig: Parameters<NonNullable<ReturnType<ExtraPropBuilder>["update"]>>[0], out: THREE.Vector3, tmp: THREE.Vector3) {
  const [a, b] = rig.joints!.sides;
  out.copy(a.hand).lerp(a.wrist, 0.35);
  tmp.copy(b.hand).lerp(b.wrist, 0.35);
  return out.add(tmp).multiplyScalar(0.5);
}

// ───────────────────────── medicine ball ─────────────────────────

/** Rubber medicine ball held between both palms. Params: radius (m, default 0.115). */
const medicineBall: ExtraPropBuilder = (params) => {
  const radius = num(params, "radius", 0.115);
  const geos = new Geos();
  const m = mats();
  const group = new THREE.Group();
  mesh(geos.add(new THREE.SphereGeometry(radius, 32, 20)), m.rubber, group);
  const seamGeo = geos.add(new THREE.TorusGeometry(radius * 1.002, radius * 0.035, 6, 48));
  for (const r of [0, Math.PI / 2]) {
    const seam = new THREE.Mesh(seamGeo, m.red);
    seam.rotation.y = r;
    group.add(seam);
  }
  const tmp = new THREE.Vector3();
  return {
    object: group,
    update(rig) {
      if (!rig.joints) return;
      palms(rig, group.position, tmp);
      // Never sink into the floor (e.g. a slam at the bottom).
      group.position.y = Math.max(group.position.y, radius);
    },
    dispose: geos.dispose,
  };
};

// ─────────────────────────── ab wheel ───────────────────────────

/** Ab wheel under the palms that rolls along the floor. Params: radius (m, default 0.09). */
const abWheel: ExtraPropBuilder = (params) => {
  const radius = num(params, "radius", 0.09);
  const geos = new Geos();
  const m = mats();
  const group = new THREE.Group();
  const wheel = new THREE.Group();
  group.add(wheel);
  // Tyre and hub, axis along z.
  const tyre = mesh(geos.add(new THREE.TorusGeometry(radius - 0.018, 0.02, 12, 40)), m.tyre, wheel);
  tyre.scale.z = 1.6;
  const hub = mesh(geos.add(new THREE.CylinderGeometry(radius - 0.02, radius - 0.02, 0.05, 32)), m.red, wheel);
  hub.rotation.x = Math.PI / 2;
  // Spokes so the rolling is visible.
  for (let k = 0; k < 3; k++) {
    const spoke = block(geos, wheel, new THREE.Vector3(), 0.012, (radius - 0.02) * 2, 0.056, m.frameDark);
    spoke.rotation.z = (k * Math.PI) / 3;
  }
  // Axle and grips.
  rod(geos, group, new THREE.Vector3(0, 0, -0.17), new THREE.Vector3(0, 0, 0.17), 0.008, m.chrome);
  for (const s of [1, -1]) {
    rod(geos, group, new THREE.Vector3(0, 0, s * 0.05), new THREE.Vector3(0, 0, s * 0.16), 0.017, m.grip);
  }
  const tmp = new THREE.Vector3();
  return {
    object: group,
    update(rig) {
      if (!rig.joints) return;
      palms(rig, tmp, group.position);
      group.position.set(tmp.x, radius, 0);
      wheel.rotation.z = -tmp.x / radius;
    },
    dispose: geos.dispose,
  };
};

// ───────────────────── 45° hyperextension bench ─────────────────────

/**
 * 45° back-extension bench. Params (authoring cm): ankleX, ankleY — the
 * athlete's ankle; the legs run up-forward at 45° to the hips, which sit just
 * above the top edge of the thigh pad.
 */
const hyperBench: ExtraPropBuilder = (params) => {
  const ax = num(params, "ankleX", 70);
  const ay = num(params, "ankleY", 228);
  const geos = new Geos();
  const m = mats();
  const group = new THREE.Group();
  const s = Math.SQRT1_2;
  // Unit vectors in authoring space: along the leg (hip → ankle) and toward the front of the legs.
  const leg = [-s, s];
  const front = [s, s];
  const along = (d: number, f: number): [number, number] => [ax + leg[0] * d + front[0] * f, ay + leg[1] * d + front[1] * f];
  const tilt = new THREE.Euler(0, 0, Math.PI / 4);

  // Foot plate under the soles (perpendicular to the legs).
  const [fx, fy] = along(4.5, 6);
  const plate = block(geos, group, W(fx, fy), 0.03, 0.3, 0.42, m.frameDark);
  plate.setRotationFromEuler(tilt);
  // Ankle rollers behind the heels, just above the ankle.
  const [rx, ry] = along(-7, -10.5);
  for (const z of [-11, 11]) {
    const roller = mesh(geos.add(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 24)), m.pad, group);
    roller.rotation.x = Math.PI / 2;
    roller.position.copy(W(rx, ry, z));
  }
  rod(geos, group, W(rx, ry, -20), W(rx, ry, 20), 0.012, m.chrome);
  // Thigh pad: from just below the hip crease down the front of the thighs.
  const [px, py] = along(-(88 - 20), 15);
  const pad = block(geos, group, W(px, py), 0.32, 0.1, 0.4, m.pad);
  pad.setRotationFromEuler(tilt);
  // Frame: a floor rail, a post to the pad and a post to the foot plate / rollers.
  const baseY = 247.5;
  const baseLen = (px - ax + 60) / 100;
  const baseX = (ax + px) / 2 - 8;
  for (const z of [-18, 18]) block(geos, group, W(baseX, baseY, z), baseLen, 0.05, 0.06, m.frame);
  for (const x of [baseX - baseLen * 45, baseX + baseLen * 45]) block(geos, group, W(x, baseY), 0.06, 0.05, 0.42, m.frame);
  const [ux, uy] = along(-(88 - 20), 3);
  rod(geos, group, W(ux, uy), W(px - 18, baseY - 3), 0.03, m.frame);
  rod(geos, group, W(fx - 3, fy + 3), W(fx - 12, baseY - 3), 0.03, m.frame);
  rod(geos, group, W(rx, ry), W(fx - 4, fy - 2), 0.02, m.frame);
  return { object: group, dispose: geos.dispose };
};

// ─────────────────────── side cable column ───────────────────────

/**
 * A cable column standing beside the athlete (z ≠ 0), for anti-rotation and
 * rotation work. Params (authoring cm): x, y — pulley height, z — lateral
 * position (positive = near side); handle: "d" (default) or "rope".
 */
const sideCable: ExtraPropBuilder = (params) => {
  const x = num(params, "x", 180);
  const y = num(params, "y", 100);
  const z = num(params, "z", 100);
  const rope = str(params, "handle", "d") === "rope";
  const geos = new Geos();
  const m = mats();
  const group = new THREE.Group();
  const pulley = W(x, y, z);
  const out = Math.sign(z) || 1;
  // Column behind the pulley: base, twin uprights, top bar, weight stack and the pulley rail.
  const colZ = pulley.z + out * 0.12;
  const cx = pulley.x;
  block(geos, group, new THREE.Vector3(cx, 0.02, colZ + out * 0.05), 0.55, 0.04, 0.5, m.frame);
  for (const dx of [-0.16, 0.16]) block(geos, group, new THREE.Vector3(cx + dx, 1.07, colZ + out * 0.05), 0.06, 2.1, 0.06, m.frame);
  block(geos, group, new THREE.Vector3(cx, 2.12, colZ + out * 0.05), 0.38, 0.06, 0.08, m.frame);
  block(geos, group, new THREE.Vector3(cx, 0.45, colZ + out * 0.08), 0.22, 0.8, 0.1, m.frameDark);
  rod(geos, group, new THREE.Vector3(cx - 0.04, 0.9, colZ + out * 0.08), new THREE.Vector3(cx - 0.04, 2.1, colZ + out * 0.08), 0.008, m.chrome);
  rod(geos, group, new THREE.Vector3(cx + 0.04, 0.9, colZ + out * 0.08), new THREE.Vector3(cx + 0.04, 2.1, colZ + out * 0.08), 0.008, m.chrome);
  block(geos, group, new THREE.Vector3(cx, 1.07, colZ - out * 0.02), 0.05, 2.1, 0.05, m.frameDark);
  // Carriage and pulley wheel.
  block(geos, group, new THREE.Vector3(cx, pulley.y, colZ - out * 0.06), 0.1, 0.16, 0.06, m.frame);
  const wheel = mesh(geos.add(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 20)), m.chrome, group);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.copy(pulley);
  // Unit-length cable along -y from the pulley, aimed and stretched every frame.
  const cableGeo = geos.add(new THREE.CylinderGeometry(0.005, 0.005, 1, 8));
  cableGeo.translate(0, -0.5, 0);
  const cable = mesh(cableGeo, m.cable, group);
  cable.position.copy(pulley);
  // Handle across the palms.
  const handle = new THREE.Group();
  group.add(handle);
  if (rope) {
    rod(geos, handle, new THREE.Vector3(0, 0, -0.08), new THREE.Vector3(0, 0, 0.08), 0.016, m.rope);
  } else {
    rod(geos, handle, new THREE.Vector3(0, 0, -0.06), new THREE.Vector3(0, 0, 0.06), 0.016, m.grip);
    const loop = mesh(geos.add(new THREE.TorusGeometry(0.07, 0.006, 8, 24, Math.PI)), m.chrome, handle);
    loop.rotation.y = Math.PI / 2;
  }
  const tmp = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  return {
    object: group,
    update(rig) {
      if (!rig.joints) return;
      const [a, b] = rig.joints.sides;
      palms(rig, handle.position, tmp);
      // Grip runs from one palm to the other.
      dir.subVectors(a.hand, b.hand);
      if (dir.lengthSq() > 1e-6) handle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
      dir.subVectors(handle.position, pulley);
      cable.scale.set(1, dir.length(), 1);
      cable.quaternion.setFromUnitVectors(down, dir.normalize());
    },
    dispose: geos.dispose,
  };
};

/** Props for the core & cardio exercise library, keyed by `kind` (use a "core:" prefix). */
export const CORE_PROPS: Record<string, ExtraPropBuilder> = {
  "core:medicine-ball": medicineBall,
  "core:ab-wheel": abWheel,
  "core:hyper-bench": hyperBench,
  "core:side-cable": sideCable,
};
