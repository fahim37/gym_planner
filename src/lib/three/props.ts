import * as THREE from "three";
import type { Prop } from "@/lib/anatomy/types";
import { isEquipmentSlug } from "@/lib/equipment-catalog";
import { buildEquipmentModel, type EquipmentModel } from "./equipment";
import { buildExtraProp } from "./extra-props";
import { toWorld, type BodyRig, type GripSpec, type Support } from "./rig";

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

const BAR_AXIS = new THREE.Vector3(0, 0, 1);
const barGrip = (radius: number): GripSpec => ({ radius, axis: BAR_AXIS, style: "overhand" });
const handle = (radius: number, style: GripSpec["style"] = "neutral"): GripSpec => ({ radius, style });

/** Plug-in props held in the hands (see extra-props): how each hand grips them. */
const EXTRA_GRIPS: Record<string, [GripSpec | null, GripSpec | null]> = {
  "upper:ez-bar": [barGrip(0.014), barGrip(0.014)],
  "upper:neutral-dumbbells": [handle(0.014), handle(0.014)],
  "upper:landmine": [handle(0.025), handle(0.025)],
  "upper:cable": [handle(0.014), handle(0.014)],
  "upper:row-station": [handle(0.015), handle(0.015)],
  "upper:dip-bars": [handle(0.02), handle(0.02)],
  "upper:pec-deck": [handle(0.016), handle(0.016)],
  "lower:held-dumbbell": [handle(0.014), handle(0.014)],
  "lower:trap-bar": [handle(0.015), handle(0.015)],
  "lower:hip-bar": [barGrip(0.014), barGrip(0.014)],
  "lower:low-cable": [handle(0.014), handle(0.014)],
  "lower:smith": [barGrip(0.014), barGrip(0.014)],
  "lower:front-rack": [barGrip(0.014), barGrip(0.014)],
  "core:ab-wheel": [handle(0.014), handle(0.014)],
  "core:side-cable": [handle(0.014), handle(0.014)],
  "core:medicine-ball": [handle(0.06), handle(0.06)],
};

/** Equipment for one exercise: static pieces plus pieces that follow the hands. */
export class PropSet {
  readonly group = new THREE.Group();
  private readonly followers: Follower[] = [];
  private readonly disposers: (() => void)[] = [];
  /** How each hand ([side 0, side 1]) holds the equipment; null = free hand. */
  private readonly grips: [GripSpec | null, GripSpec | null] = [null, null];
  /** Surfaces a free hand can rest on (benches, boxes). */
  private readonly supports: Support[] = [];
  private supportsSent: BodyRig | null = null;

  constructor(props: Prop[]) {
    for (const p of props) this.add(p);
  }

  private grip(a: GripSpec | null, b: GripSpec | null = a) {
    this.grips[0] ??= a;
    this.grips[1] ??= b;
  }

  private support(x1: number, x2: number, top: number, z = 0, width = 0.3) {
    const a = toWorld([Math.min(x1, x2), top, 0]);
    const b = toWorld([Math.max(x1, x2), top, 0]);
    this.supports.push({ y: a.y, minX: a.x, maxX: b.x, minZ: z - width / 2 - 0.1, maxZ: z + width / 2 + 0.1 });
  }

  private add(p: Prop) {
    switch (p.type) {
      case "barbell": {
        this.grip(p.grip ? { ...barGrip(0.014), style: p.grip } : barGrip(0.014));
        const bar = barbell(p.plate ?? "large");
        this.group.add(bar);
        this.followers.push((rig) => {
          const j = rig.joints!;
          if (p.at === "back") {
            bar.position.copy(j.chest).addScaledVector(j.up, 0.035).addScaledVector(j.chestForward, -0.09);
            bar.position.z = 0;
          } else {
            // In the closed fists: the grip centres of both hands.
            bar.position.copy(j.sides[0].grip).add(j.sides[1].grip).multiplyScalar(0.5);
            bar.position.z = 0;
          }
        });
        break;
      }
      case "dumbbell": {
        const count = p.hands === "near" || p.hands === "shared" ? 1 : 2;
        if (p.hands === "shared") this.grip(handle(0.045));
        else if (p.hands === "near") this.grip(handle(0.014, p.grip ?? "neutral"), null);
        else this.grip(handle(0.014, p.grip ?? "neutral"));
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
            // The handle sits in the closed fist, along the knuckles.
            const s = j.sides[i];
            b.position.copy(s.grip);
            b.quaternion.setFromUnitVectors(Z_AXIS, s.gripAxis);
          });
        });
        break;
      }
      case "kettlebell": {
        this.grip(barGrip(0.012));
        const kb = kettlebell();
        this.group.add(kb);
        this.followers.push((rig) => {
          const j = rig.joints!;
          _d.subVectors(j.sides[0].hand, j.sides[0].elbow).normalize();
          kb.quaternion.setFromUnitVectors(_b.set(0, -1, 0), _d);
          // The top of the handle arc (0.02 above the group origin) sits in the fists.
          kb.position.copy(j.sides[0].grip).add(j.sides[1].grip).multiplyScalar(0.5).addScaledVector(_d, 0.02);
          kb.position.z = 0;
        });
        break;
      }
      case "bench": {
        this.support(p.from, p.to, p.top, (p.z ?? 0) / 100);
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
        this.support(p.from, p.to, p.top, (p.z ?? 0) / 100, (p.width ?? 40) / 100);
        const b = box(p.from, p.to, p.top, p.bottom ?? 250, (p.width ?? 40) / 100, pad);
        b.position.z = (p.z ?? 0) / 100;
        this.group.add(b);
        break;
      }
      case "pullupBar": {
        this.grip(barGrip(0.016));
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
        if (p.handle === "bar") this.grip({ ...barGrip(0.013), style: p.grip ?? "overhand" });
        else if (p.handle === "rope") this.grip(handle(0.018, p.grip ?? "neutral"));
        else this.grip(handle(0.013, p.grip ?? "neutral"), null);
        const handleMesh = rod(new THREE.Vector3(0, 0, -half), new THREE.Vector3(0, 0, half), p.handle === "rope" ? 0.018 : 0.013, p.handle === "rope" ? cableMat : chrome);
        this.group.add(handleMesh);
        this.followers.push((rig) => {
          const j = rig.joints!;
          if (p.handle === "single") handleMesh.position.copy(j.sides[0].grip);
          else handleMesh.position.copy(j.sides[0].grip).add(j.sides[1].grip).multiplyScalar(0.5).setZ(0);
          _d.subVectors(handleMesh.position, pulley);
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
        let g = EXTRA_GRIPS[p.kind];
        // `params.grip` ("overhand" | "underhand" | "neutral") restyles the default grip.
        const ps = p.params?.grip;
        if (g && (ps === "overhand" || ps === "underhand" || ps === "neutral")) g = [g[0] && { ...g[0], style: ps }, g[1] && { ...g[1], style: ps }];
        if (g) this.grip(g[0], g[1]);
        const built = buildExtraProp(p.kind, p.params ?? {});
        if (!built) break;
        if (built.grip) {
          const spec: GripSpec = { radius: built.grip.radius ?? 0.014, style: built.grip.style };
          // The plug-in's own grip wins over the defaults table.
          if (g) {
            this.grips[0] = null;
            this.grips[1] = null;
          }
          if (built.grip.hands !== "far") this.grips[0] = spec;
          if (built.grip.hands !== "near") this.grips[1] = spec;
        }
        for (const sp of built.supports ?? []) this.support(sp.from, sp.to, sp.top, (sp.z ?? 0) / 100, (sp.width ?? 30) / 100);
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
    if (this.supportsSent !== rig) {
      rig.setSupports(this.supports);
      this.supportsSent = rig;
    }
    // Close the hands first so followers read the grip centres of this pose.
    rig.setGrips(this.grips);
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
