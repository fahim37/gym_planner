import * as THREE from "three";
import type { Prop } from "@/lib/anatomy/types";
import { isEquipmentSlug } from "@/lib/equipment-catalog";
import { buildEquipmentModel, type EquipmentModel } from "./equipment";
import { buildExtraProp } from "./extra-props";
import { toWorld, type BodyRig } from "./rig";

const iron = new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.55, metalness: 0.35 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.25, metalness: 0.9 });
const pad = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
const frame = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.4, metalness: 0.6 });
const matMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.95 });
const cableMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A cylinder whose axis runs from `a` to `b`. */
function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material) {
  const len = a.distanceTo(b);
  const m = mesh(new THREE.CylinderGeometry(radius, radius, len, 16), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(Y_AXIS, new THREE.Vector3().subVectors(b, a).normalize());
  return m;
}

function box(x1: number, x2: number, yTop: number, yBottom: number, width: number, mat: THREE.Material) {
  const a = toWorld([x1, yTop, 0]);
  const b = toWorld([x2, yBottom, 0]);
  const m = mesh(new THREE.BoxGeometry(Math.abs(b.x - a.x), Math.abs(a.y - b.y), width), mat);
  m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
  return m;
}

/** Barbell along the z axis, centred at the origin of the returned group. */
function barbell(plate: "large" | "small") {
  const g = new THREE.Group();
  g.add(rod(new THREE.Vector3(0, 0, -1.05), new THREE.Vector3(0, 0, 1.05), 0.014, chrome));
  const r = plate === "large" ? 0.225 : 0.13;
  for (const s of [1, -1]) {
    for (let k = 0; k < 2; k++) {
      const z = s * (0.62 + k * 0.05);
      g.add(rod(new THREE.Vector3(0, 0, z - 0.02), new THREE.Vector3(0, 0, z + 0.02), r - k * 0.03, iron));
    }
    g.add(rod(new THREE.Vector3(0, 0, s * 0.56), new THREE.Vector3(0, 0, s * 0.59), 0.03, chrome));
  }
  return g;
}

function dumbbell() {
  const g = new THREE.Group();
  g.add(rod(new THREE.Vector3(0, 0, -0.1), new THREE.Vector3(0, 0, 0.1), 0.014, chrome));
  for (const s of [1, -1]) {
    g.add(rod(new THREE.Vector3(0, 0, s * 0.065), new THREE.Vector3(0, 0, s * 0.11), 0.055, iron));
  }
  return g;
}

function kettlebell() {
  const g = new THREE.Group();
  const bell = mesh(new THREE.SphereGeometry(0.1, 24, 16), iron);
  bell.position.y = -0.12;
  g.add(bell);
  const handle = mesh(new THREE.TorusGeometry(0.06, 0.012, 10, 24, Math.PI), iron);
  handle.rotation.y = Math.PI / 2;
  handle.position.y = -0.04;
  g.add(handle);
  return g;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _d = new THREE.Vector3();

type Follower = (rig: BodyRig) => void;

/** Equipment for one exercise: static pieces plus pieces that follow the hands. */
export class PropSet {
  readonly group = new THREE.Group();
  private readonly followers: Follower[] = [];
  private readonly disposers: (() => void)[] = [];

  constructor(props: Prop[]) {
    for (const p of props) this.add(p);
  }

  private add(p: Prop) {
    switch (p.type) {
      case "barbell": {
        const bar = barbell(p.plate ?? "large");
        this.group.add(bar);
        this.followers.push((rig) => {
          const j = rig.joints!;
          if (p.at === "back") {
            bar.position.copy(j.chest).addScaledVector(j.up, 0.035).addScaledVector(j.chestForward, -0.09);
            bar.position.z = 0;
          } else {
            bar.position.copy(j.sides[0].hand).add(j.sides[1].hand).multiplyScalar(0.5);
            _a.copy(j.sides[0].wrist).add(j.sides[1].wrist).multiplyScalar(0.5);
            bar.position.lerp(_a, 0.35);
            bar.position.z = 0;
          }
        });
        break;
      }
      case "dumbbell": {
        const count = p.hands === "near" || p.hands === "shared" ? 1 : 2;
        const bells = Array.from({ length: count }, () => dumbbell());
        bells.forEach((b) => this.group.add(b));
        this.followers.push((rig) => {
          const j = rig.joints!;
          bells.forEach((b, i) => {
            if (p.hands === "shared") {
              // One dumbbell held vertically by both hands (e.g. overhead extension).
              _a.copy(j.sides[0].hand).add(j.sides[1].hand).multiplyScalar(0.5);
              _d.subVectors(j.sides[0].hand, j.sides[0].elbow).normalize();
              b.position.copy(_a).addScaledVector(_d, 0.02);
              b.quaternion.setFromUnitVectors(Z_AXIS, _d);
              return;
            }
            const s = j.sides[i];
            b.position.copy(s.hand).lerp(s.wrist, 0.3);
            // Handle runs across the palm: perpendicular to the forearm, mostly sideways.
            _d.subVectors(s.hand, s.elbow).normalize();
            _a.set(0, 0, 1).addScaledVector(_d, -_d.z);
            if (_a.lengthSq() < 0.05) _a.copy(j.chestForward);
            b.quaternion.setFromUnitVectors(Z_AXIS, _a.normalize());
          });
        });
        break;
      }
      case "kettlebell": {
        const kb = kettlebell();
        this.group.add(kb);
        this.followers.push((rig) => {
          const j = rig.joints!;
          kb.position.copy(j.sides[0].hand).add(j.sides[1].hand).multiplyScalar(0.5);
          kb.position.z = 0;
          _d.subVectors(j.sides[0].hand, j.sides[0].elbow).normalize();
          kb.quaternion.setFromUnitVectors(_b.set(0, -1, 0), _d);
        });
        break;
      }
      case "bench": {
        const g = new THREE.Group();
        g.add(box(p.from, p.to, p.top, p.top + 8, 0.3, pad));
        const legW = 4;
        for (const x of [p.from + 8, p.to - 8]) g.add(box(x - legW / 2, x + legW / 2, p.top + 8, 250, 0.08, frame));
        g.add(box(p.from + 6, p.to - 6, 244, 250, 0.35, frame));
        if (p.incline) {
          // Back-rest hinged at `at`, rising up and back (towards -x) at `angle` degrees.
          const { at, length, angle } = p.incline;
          const pivot = new THREE.Group();
          pivot.position.copy(toWorld([at, p.top, 0]));
          const back = mesh(new THREE.BoxGeometry(length / 100, 0.08, 0.3), pad);
          back.position.set(-length / 200, 0.04, 0);
          pivot.add(back);
          pivot.rotation.z = (-angle * Math.PI) / 180;
          g.add(pivot);
          const rad = (angle * Math.PI) / 180;
          const mid = toWorld([at - length * 0.6 * Math.cos(rad), p.top - length * 0.6 * Math.sin(rad), 0]);
          g.add(rod(mid, toWorld([at - 10, 250, 0]), 0.018, frame));
        }
        g.position.z = (p.z ?? 0) / 100;
        this.group.add(g);
        break;
      }
      case "box": {
        const b = box(p.from, p.to, p.top, p.bottom ?? 250, (p.width ?? 40) / 100, pad);
        b.position.z = (p.z ?? 0) / 100;
        this.group.add(b);
        break;
      }
      case "pullupBar": {
        const y = toWorld([p.x, p.y, 0]);
        this.group.add(rod(new THREE.Vector3(y.x, y.y, -0.6), new THREE.Vector3(y.x, y.y, 0.6), 0.016, chrome));
        for (const s of [1, -1]) {
          this.group.add(rod(new THREE.Vector3(y.x, y.y + 0.08, s * 0.6), new THREE.Vector3(y.x, 0, s * 0.6), 0.03, frame));
        }
        break;
      }
      case "cable": {
        const pulley = toWorld([p.pulley[0], p.pulley[1], 0]);
        const towerHeight = Math.max(pulley.y + 0.15, 0.4);
        const tower = mesh(new THREE.BoxGeometry(0.1, towerHeight, 0.32), frame);
        tower.position.set(pulley.x + (p.pulley[0] > 160 ? 0.12 : -0.12), towerHeight / 2, 0);
        this.group.add(tower);
        const wheel = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 20), chrome);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.copy(pulley);
        this.group.add(wheel);
        // Unit-length cable hanging along -y from its origin; aimed and stretched every frame.
        const cableGeo = new THREE.CylinderGeometry(0.006, 0.006, 1, 8);
        cableGeo.translate(0, -0.5, 0);
        const cable = mesh(cableGeo, cableMat);
        cable.position.copy(pulley);
        this.group.add(cable);
        const half = p.handle === "bar" ? 0.3 : p.handle === "rope" ? 0.07 : 0.06;
        const handle = rod(new THREE.Vector3(0, 0, -half), new THREE.Vector3(0, 0, half), p.handle === "rope" ? 0.018 : 0.013, p.handle === "rope" ? cableMat : chrome);
        this.group.add(handle);
        this.followers.push((rig) => {
          const j = rig.joints!;
          if (p.handle === "single") handle.position.copy(j.sides[0].hand);
          else handle.position.copy(j.sides[0].hand).add(j.sides[1].hand).multiplyScalar(0.5).setZ(0);
          _d.subVectors(handle.position, pulley);
          const length = _d.length();
          cable.quaternion.setFromUnitVectors(_b.set(0, -1, 0), _d.normalize());
          cable.scale.set(1, length, 1);
        });
        break;
      }
      case "mat": {
        const m = mesh(new THREE.BoxGeometry(1.9, 0.012, 0.65), matMat);
        m.position.set(0, 0.006, 0);
        this.group.add(m);
        break;
      }
      case "extra": {
        const built = buildExtraProp(p.kind, p.params ?? {});
        if (!built) break;
        built.object.userData.external = true;
        this.group.add(built.object);
        if (built.update) this.followers.push(built.update);
        if (built.dispose) this.disposers.push(built.dispose);
        break;
      }
      case "equipment": {
        if (!isEquipmentSlug(p.slug)) break;
        const model: EquipmentModel = buildEquipmentModel(p.slug);
        model.group.position.copy(toWorld([p.x, p.y ?? 250, p.z ?? 0]));
        model.group.rotation.y = ((p.rotate ?? 0) * Math.PI) / 180;
        model.group.scale.setScalar(p.scale ?? 1);
        model.group.userData.external = true;
        this.group.add(model.group);
        this.disposers.push(() => model.dispose());
        break;
      }
    }
  }

  update(rig: BodyRig) {
    for (const f of this.followers) f(rig);
  }

  dispose() {
    this.disposers.forEach((d) => d());
    // Plug-in props and equipment models free their own (possibly shared) resources.
    const free = (o: THREE.Object3D) => {
      if (o.userData.external) return;
      if (o instanceof THREE.Mesh) o.geometry.dispose();
      o.children.forEach(free);
    };
    free(this.group);
  }

}
