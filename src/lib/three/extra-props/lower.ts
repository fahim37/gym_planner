import * as THREE from "three";
import { toWorld, type BodyRig } from "../rig";
import type { ExtraPropBuilder, ExtraPropParams } from "./types";

/*
 * Props for the lower-body library. Static pieces are laid out in authoring
 * centimetres (x forward, y down, floor at y = 250) and converted with toWorld;
 * moving pieces follow the solved joints (three.js metres, y up) every frame.
 */

// Shared materials: never disposed, reused by every prop instance.
const iron = new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.55, metalness: 0.35 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.25, metalness: 0.9 });
const steel = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.4, metalness: 0.6 });
const upholstery = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
const accent = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5, metalness: 0.2 });
const foam = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9 });
const plywood = new THREE.MeshStandardMaterial({ color: 0xc8a172, roughness: 0.85 });
const wallPaint = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.95 });
const plywoodEdge = new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: 0.85 });

const Y = new THREE.Vector3(0, 1, 0);
const _down = new THREE.Vector3(0, -1, 0);
const _m = new THREE.Vector3();

/** Authoring point (cm) → world (m). */
const W = (x: number, y: number, z = 0) => toWorld([x, y, z]);
const num = (p: ExtraPropParams, key: string, fallback: number) => (typeof p[key] === "number" ? (p[key] as number) : fallback);

/** Tracks the geometries a prop creates so it can free them. */
class Kit {
  readonly root = new THREE.Group();
  private readonly geos: THREE.BufferGeometry[] = [];

  mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D = this.root) {
    this.geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /** Cylinder from a to b (world metres). */
  rod(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, parent?: THREE.Object3D) {
    const m = this.mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 18), mat, parent);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(Y, new THREE.Vector3().subVectors(b, a).normalize());
    return m;
  }

  /** Box of size (w, h, d) metres centred at `at`. */
  box(w: number, h: number, d: number, mat: THREE.Material, at: THREE.Vector3, parent?: THREE.Object3D) {
    const m = this.mesh(new THREE.BoxGeometry(w, h, d), mat, parent);
    m.position.copy(at);
    return m;
  }

  /** Upholstered pad: `len` along x, `thick` along y, `width` along z (metres), centred on the group. */
  cushion(len: number, thick: number, width: number, parent?: THREE.Object3D) {
    const g = new THREE.Group();
    (parent ?? this.root).add(g);
    this.box(len * 0.96, thick * 0.3, width * 0.97, steel, new THREE.Vector3(0, -thick * 0.35, 0), g);
    const r = Math.min(0.025, thick / 2);
    const shape = new THREE.Shape();
    const hx = len / 2;
    const hy = thick / 2;
    shape.moveTo(-hx + r, -hy);
    shape.lineTo(hx - r, -hy);
    shape.quadraticCurveTo(hx, -hy, hx, -hy + r);
    shape.lineTo(hx, hy - r);
    shape.quadraticCurveTo(hx, hy, hx - r, hy);
    shape.lineTo(-hx + r, hy);
    shape.quadraticCurveTo(-hx, hy, -hx, hy - r);
    shape.lineTo(-hx, -hy + r);
    shape.quadraticCurveTo(-hx, -hy, -hx + r, -hy);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: width - 0.02, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 4 });
    geo.translate(0, 0, -(width - 0.02) / 2);
    this.mesh(geo, upholstery, g);
    return g;
  }

  dispose = () => this.geos.forEach((g) => g.dispose());
}

/** Olympic bar with plates along the group's z axis. */
function barbell(kit: Kit, plateRadius = 0.225, parent?: THREE.Object3D) {
  const g = new THREE.Group();
  (parent ?? kit.root).add(g);
  kit.rod(new THREE.Vector3(0, 0, -1.05), new THREE.Vector3(0, 0, 1.05), 0.014, chrome, g);
  for (const s of [1, -1]) {
    for (let k = 0; k < 2; k++) {
      const z = s * (0.62 + k * 0.05);
      kit.rod(new THREE.Vector3(0, 0, z - 0.02), new THREE.Vector3(0, 0, z + 0.02), plateRadius - k * 0.03, iron, g);
    }
    kit.rod(new THREE.Vector3(0, 0, s * 0.56), new THREE.Vector3(0, 0, s * 0.59), 0.03, chrome, g);
  }
  return g;
}

// ───────────────────────────── free weights ─────────────────────────────

/** Barbell resting on the front delts (front squat): follows the chest. */
const frontRack: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const bar = barbell(kit);
  const fwd = num(p, "forward", 11) / 100;
  const up = num(p, "up", 1) / 100;
  return {
    object: kit.root,
    update: (rig: BodyRig) => {
      const j = rig.joints!;
      bar.position.copy(j.chest).addScaledVector(j.chestForward, fwd).addScaledVector(j.up, up);
      bar.position.z = 0;
    },
    dispose: kit.dispose,
  };
};

/** One dumbbell held by one end in both hands: vertical against the chest ("goblet") or hanging from the hands ("hang"). */
const heldDumbbell: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const g = new THREE.Group();
  kit.root.add(g);
  kit.rod(new THREE.Vector3(0, -0.11, 0), new THREE.Vector3(0, 0.11, 0), 0.016, chrome, g);
  for (const s of [1, -1]) kit.mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.06, 6), iron, g).position.y = s * 0.1;
  const goblet = p.mode !== "hang";
  const d = new THREE.Vector3();
  return {
    object: kit.root,
    update: (rig: BodyRig) => {
      const j = rig.joints!;
      const [a, b] = j.sides;
      g.position.copy(a.hand).add(b.hand).multiplyScalar(0.5).lerp(_m.copy(a.wrist).add(b.wrist).multiplyScalar(0.5), 0.3);
      if (goblet) d.copy(j.up);
      else d.subVectors(a.hand, a.elbow).add(_m.subVectors(b.hand, b.elbow)).normalize().negate();
      // Top plate sits in the palms; the rest hangs below along -d.
      g.position.addScaledVector(d, -0.075);
      g.quaternion.setFromUnitVectors(Y, d);
    },
    dispose: kit.dispose,
  };
};

/** Barbell across the hip crease with a foam pad (hip thrust): follows the pelvis. */
const hipBar: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const g = new THREE.Group();
  kit.root.add(g);
  barbell(kit, 0.225, g);
  kit.rod(new THREE.Vector3(0, 0, -0.2), new THREE.Vector3(0, 0, 0.2), 0.042, foam, g);
  const fwd = num(p, "forward", 13) / 100;
  const down = num(p, "down", 3) / 100;
  return {
    object: kit.root,
    update: (rig: BodyRig) => {
      const j = rig.joints!;
      g.position.copy(j.pelvis).addScaledVector(j.forward, fwd).addScaledVector(j.up, -down);
      g.position.z = 0;
    },
    dispose: kit.dispose,
  };
};

/** Hexagonal trap bar with neutral handles at the athlete's sides: follows the hands. Param: handZ (cm, default 28). */
const trapBar: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const g = new THREE.Group();
  kit.root.add(g);
  const hz = num(p, "handZ", 28) / 100;
  const R = 0.44;
  const r = 0.016;
  const hex = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i * Math.PI) / 3;
    return new THREE.Vector3(R * Math.sin(a) * 0.86, 0, R * Math.cos(a));
  });
  for (let i = 0; i < 6; i++) kit.rod(hex[i], hex[(i + 1) % 6], r, steel, g);
  for (const s of [1, -1]) {
    // Handle bar spanning the frame, with a knurled grip in the middle.
    const t = (hz - R * 0.5) / (R * 0.5);
    const x = R * 0.86 * Math.sin(Math.PI / 3) * (1 - t);
    kit.rod(new THREE.Vector3(-x, 0, s * hz), new THREE.Vector3(x, 0, s * hz), r, steel, g);
    kit.rod(new THREE.Vector3(-0.08, 0, s * hz), new THREE.Vector3(0.08, 0, s * hz), 0.019, chrome, g);
    // Sleeve and plates.
    kit.rod(new THREE.Vector3(0, 0, s * R), new THREE.Vector3(0, 0, s * (R + 0.34)), 0.025, chrome, g);
    for (let k = 0; k < 2; k++) {
      const z = s * (R + 0.1 + k * 0.05);
      kit.rod(new THREE.Vector3(0, 0, z - 0.02), new THREE.Vector3(0, 0, z + 0.02), 0.225 - k * 0.03, iron, g);
    }
  }
  return {
    object: kit.root,
    update: (rig: BodyRig) => {
      const [a, b] = rig.joints!.sides;
      g.position.copy(a.hand).add(b.hand).multiplyScalar(0.5).lerp(_m.copy(a.wrist).add(b.wrist).multiplyScalar(0.5), 0.35);
      g.position.z = 0;
    },
    dispose: kit.dispose,
  };
};

// ───────────────────────────── boxes, benches, walls ─────────────────────────────

/** Wooden plyo box. Params (cm): from, to (x), top (y), width (z, default 60). */
const plyoBox: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const from = num(p, "from", 190);
  const to = num(p, "to", 240);
  const top = num(p, "top", 190);
  const width = num(p, "width", 60) / 100;
  const a = W(from, top);
  const b = W(to, 250);
  const w = b.x - a.x;
  const h = a.y - b.y;
  const c = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
  kit.box(w, h, width, plywood, c);
  // Darker edge banding and a hand-hold slot on the visible side.
  for (const s of [1, -1]) kit.box(w + 0.004, 0.02, width + 0.004, plywoodEdge, new THREE.Vector3(c.x, c.y + (s * h) / 2 - s * 0.01, 0));
  kit.box(Math.min(0.16, w * 0.4), 0.04, width + 0.006, plywoodEdge, new THREE.Vector3(c.x, a.y - 0.09, 0));
  return { object: kit.root, dispose: kit.dispose };
};

/**
 * Flat bench turned 90° so its length runs across the athlete (hip thrusts).
 * Params (cm): x (centre), top (pad height as y), length (along z, default 120).
 */
const benchAcross: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const x = num(p, "x", 110);
  const top = num(p, "top", 205);
  const len = num(p, "length", 120) / 100;
  const padTop = W(x, top);
  const pad = kit.cushion(0.3, 0.07, len);
  pad.position.set(padTop.x, padTop.y - 0.035, 0);
  const legH = padTop.y - 0.07;
  for (const s of [1, -1]) {
    const z = s * (len / 2 - 0.12);
    kit.box(0.05, legH, 0.05, steel, new THREE.Vector3(padTop.x, legH / 2, z));
    kit.box(0.42, 0.04, 0.07, steel, new THREE.Vector3(padTop.x, 0.02, z));
  }
  kit.box(0.05, 0.05, len - 0.24, steel, new THREE.Vector3(padTop.x, legH - 0.03, 0));
  return { object: kit.root, dispose: kit.dispose };
};

// ───────────────────────────── machines ─────────────────────────────

/**
 * Full-height cable column with a low pulley behind the athlete and a rope
 * that follows the hands. Params (cm): x (column position), pulleyY.
 */
const lowCable: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const x = num(p, "x", 45);
  const pulleyY = num(p, "pulleyY", 236);
  const base = W(x - 12, 250);
  kit.box(0.5, 0.05, 0.7, steel, new THREE.Vector3(base.x, 0.025, 0));
  for (const s of [1, -1]) kit.box(0.07, 2.1, 0.07, steel, new THREE.Vector3(base.x, 1.05, s * 0.22));
  kit.box(0.12, 0.07, 0.52, steel, new THREE.Vector3(base.x, 2.1, 0));
  // Weight stack between the uprights.
  for (let i = 0; i < 12; i++) kit.box(0.2, 0.04, 0.3, i === 11 ? accent : iron, new THREE.Vector3(base.x, 0.08 + i * 0.045, 0));
  kit.rod(new THREE.Vector3(base.x, 0.6, 0), new THREE.Vector3(base.x, 2.05, 0), 0.008, chrome);
  const pulley = W(x, pulleyY);
  const wheel = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 20), chrome);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.copy(pulley);
  kit.box(0.14, 0.12, 0.06, steel, new THREE.Vector3((pulley.x + base.x) / 2, pulley.y, 0));
  const cableGeo = new THREE.CylinderGeometry(0.006, 0.006, 1, 8);
  cableGeo.translate(0, -0.5, 0);
  const cable = kit.mesh(cableGeo, rubber);
  cable.position.copy(pulley);
  // Rope: two short strands ending in knobs, one per hand.
  const strands = [0, 1].map(() => {
    const m = kit.mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 10).translate(0, 0.5, 0), rubber);
    const knob = kit.mesh(new THREE.SphereGeometry(0.024, 12, 8), rubber);
    return { m, knob };
  });
  const d = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const crotch = new THREE.Vector3();
  return {
    object: kit.root,
    update: (rig: BodyRig) => {
      const j = rig.joints!;
      mid.copy(j.sides[0].hand).add(j.sides[1].hand).multiplyScalar(0.5).setZ(0);
      // The rope's clip sits ~30 cm behind the hands toward the pulley, but never
      // above the crotch: when standing tall the cable runs between the legs.
      d.subVectors(pulley, mid).normalize();
      const anchor = _m.copy(mid).addScaledVector(d, 0.3);
      crotch.copy(j.sides[0].hip).add(j.sides[1].hip).multiplyScalar(0.5).addScaledVector(j.up, -0.1).setZ(0);
      if (anchor.y > crotch.y - 0.03) anchor.set(crotch.x - 0.02, crotch.y - 0.06, 0);
      const len = pulley.distanceTo(anchor);
      cable.quaternion.setFromUnitVectors(_down, d.subVectors(anchor, pulley).normalize());
      cable.scale.set(1, len, 1);
      strands.forEach(({ m, knob }, i) => {
        const h = j.sides[i].hand;
        m.position.copy(anchor);
        d.subVectors(h, anchor);
        m.scale.set(1, Math.max(0.01, d.length()), 1);
        m.quaternion.setFromUnitVectors(Y, d.normalize());
        knob.position.copy(h);
      });
    },
    dispose: kit.dispose,
  };
};

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _basis = new THREE.Matrix4();

/** Rotates `obj` so its local x/y axes point along the given world directions (z = x × y). */
function aim(obj: THREE.Object3D, x: THREE.Vector3, y: THREE.Vector3) {
  _c.crossVectors(x, y);
  obj.quaternion.setFromRotationMatrix(_basis.makeBasis(x, y, _c));
}

/** A unit-length rod along +y from its origin, stretched between two points every frame. */
function stretchRod(kit: Kit, r: number, mat: THREE.Material, parent?: THREE.Object3D) {
  const m = kit.mesh(new THREE.CylinderGeometry(r, r, 1, 16).translate(0, 0.5, 0), mat, parent);
  return (a: THREE.Vector3, b: THREE.Vector3) => {
    m.position.copy(a);
    _d.subVectors(b, a);
    m.scale.set(1, Math.max(0.001, _d.length()), 1);
    m.quaternion.setFromUnitVectors(Y, _d.normalize());
  };
}

/** Short grip handle along x with a post down to the floor-side frame. */
function grip(kit: Kit) {
  const g = new THREE.Group();
  kit.root.add(g);
  kit.rod(new THREE.Vector3(-0.07, 0, 0), new THREE.Vector3(0.07, 0, 0), 0.016, rubber, g);
  const post = stretchRod(kit, 0.014, steel);
  return (at: THREE.Vector3, to: THREE.Vector3) => {
    g.position.copy(at);
    post(to, _a.copy(at).setX(at.x - 0.06));
  };
}

/** Plate horn along local z with two plates, added to `parent` at `at`. */
function plateHorn(kit: Kit, parent: THREE.Object3D, at: THREE.Vector3, side: number, r = 0.2) {
  kit.rod(at, _a.copy(at).setZ(at.z + side * 0.22), 0.025, chrome, parent);
  for (let k = 0; k < 2; k++) {
    const z = at.z + side * (0.08 + k * 0.05);
    kit.rod(_a.copy(at).setZ(z - 0.02), _b.copy(at).setZ(z + 0.02), r - k * 0.04, iron, parent);
  }
}

/**
 * 45° leg press. The seat is placed from the (fixed) pelvis; the sled and its
 * foot platform follow the feet along rails that run parallel to the push.
 */
const legPress: ExtraPropBuilder = () => {
  const kit = new Kit();
  const d = new THREE.Vector3(Math.SQRT1_2, Math.SQRT1_2, 0);
  const n = new THREE.Vector3(-Math.SQRT1_2, Math.SQRT1_2, 0);
  const back = kit.cushion(0.8, 0.07, 0.48);
  const seat = kit.cushion(0.42, 0.07, 0.48);
  const seatPost = stretchRod(kit, 0.035, steel);
  const backBrace = stretchRod(kit, 0.03, steel);
  const rails = [stretchRod(kit, 0.028, chrome), stretchRod(kit, 0.028, chrome)];
  const posts = [stretchRod(kit, 0.035, steel), stretchRod(kit, 0.035, steel)];
  const base = [stretchRod(kit, 0.03, steel), stretchRod(kit, 0.03, steel)];
  const feet = [stretchRod(kit, 0.03, steel), stretchRod(kit, 0.03, steel)];
  const cross = stretchRod(kit, 0.03, steel);
  const grips = [grip(kit), grip(kit)];

  const sled = new THREE.Group();
  kit.root.add(sled);
  kit.box(0.035, 0.62, 0.78, steel, new THREE.Vector3(0.018, 0.08, 0), sled);
  kit.box(0.012, 0.56, 0.72, rubber, new THREE.Vector3(-0.004, 0.08, 0), sled);
  for (const s of [1, -1]) {
    kit.box(0.06, 0.62, 0.05, steel, new THREE.Vector3(0.06, 0.0, s * 0.3), sled);
    kit.box(0.14, 0.09, 0.09, iron, new THREE.Vector3(0.04, -0.3, s * 0.22), sled);
    plateHorn(kit, sled, new THREE.Vector3(0.2, -0.08, s * 0.33), s);
  }
  kit.box(0.2, 0.06, 0.66, steel, new THREE.Vector3(0.12, -0.2, 0), sled);

  const q = new THREE.Vector3();
  return {
    object: kit.root,
    update: (rig: BodyRig) => {
      const j = rig.joints!;
      const up = j.up;
      const fw = j.forward;
      back.position.copy(j.pelvis).addScaledVector(up, 0.3).addScaledVector(fw, -0.155);
      aim(back, _a.copy(up).negate(), fw);
      // Seat bottom: inclined 20°, just under the glutes.
      seat.position.copy(j.pelvis).addScaledVector(up, -0.03).addScaledVector(fw, -0.066);
      seat.position.x += 0.05;
      seat.position.y -= 0.125;
      aim(seat, _a.set(Math.cos(0.35), Math.sin(0.35), 0), _b.set(-Math.sin(0.35), Math.cos(0.35), 0));
      _b.copy(seat.position).setY(seat.position.y - 0.05);
      seatPost(_c.copy(_b).setY(0), _b);
      backBrace(_c.copy(back.position).addScaledVector(fw, -0.06).setY(0).setX(back.position.x - 0.1), _b.copy(back.position).addScaledVector(fw, -0.06));

      // Feet centre → sled; rails sit 30 cm below the line of the push.
      q.set(0, 0, 0);
      for (const s of j.sides) q.add(s.heel).add(s.toe);
      q.multiplyScalar(0.25).setZ(0);
      sled.position.copy(q).addScaledVector(d, 0.035);
      aim(sled, d, n);
      const rail = _c.copy(q).addScaledVector(n, -0.3);
      const start = (0.1 - rail.y) / d.y;
      rails.forEach((r, i) => {
        const z = i ? -0.22 : 0.22;
        const a = _a.copy(rail).addScaledVector(d, start).setZ(z);
        const b = _b.copy(rail).addScaledVector(d, start + 1.95).setZ(z);
        r(a, b);
        feet[i](_d.copy(a).setY(0), a);
        const top = _b.addScaledVector(d, -0.25);
        posts[i](_d.copy(top).setY(0), top);
        base[i](_d.set(seat.position.x, 0.03, z), _a.set(top.x, 0.03, z));
      });
      cross(_a.set(seat.position.x, 0.03, -0.26), _b.set(seat.position.x, 0.03, 0.26));
      grips.forEach((g, i) => g(_a.copy(j.sides[i].hand).lerp(j.sides[i].wrist, 0.3), _b.copy(seat.position).setZ(j.sides[i].hand.z)));
    },
    dispose: kit.dispose,
  };
};

/**
 * Plate-loaded hack squat. Rails run along the (fixed-angle) back; the back pad
 * and shoulder pads ride on a carriage that follows the chest.
 */
const hackSquat: ExtraPropBuilder = () => {
  const kit = new Kit();
  const carriage = new THREE.Group();
  kit.root.add(carriage);
  kit.cushion(0.82, 0.07, 0.42, carriage).position.set(0.3, -0.155, 0);
  kit.box(0.9, 0.06, 0.34, steel, new THREE.Vector3(0.3, -0.225, 0), carriage);
  for (const s of [1, -1]) {
    const shoulder = kit.mesh(new THREE.CapsuleGeometry(0.05, 0.16, 6, 14), upholstery, carriage);
    shoulder.position.set(-0.125, 0.02, s * 0.12);
    kit.box(0.05, 0.3, 0.05, steel, new THREE.Vector3(-0.125, -0.13, s * 0.12), carriage);
    kit.rod(new THREE.Vector3(-0.12, 0.12, s * 0.3), new THREE.Vector3(0.04, 0.12, s * 0.3), 0.017, rubber, carriage);
    kit.rod(new THREE.Vector3(-0.04, 0.12, s * 0.3), new THREE.Vector3(-0.04, -0.2, s * 0.24), 0.014, steel, carriage);
    kit.box(0.16, 0.08, 0.1, iron, new THREE.Vector3(0.05, -0.27, s * 0.25), carriage);
    kit.box(0.16, 0.08, 0.1, iron, new THREE.Vector3(0.6, -0.27, s * 0.25), carriage);
    plateHorn(kit, carriage, new THREE.Vector3(0.3, -0.26, s * 0.28), s, 0.2);
  }
  const rails = [stretchRod(kit, 0.03, chrome), stretchRod(kit, 0.03, chrome)];
  const uprights = [stretchRod(kit, 0.04, steel), stretchRod(kit, 0.04, steel)];
  const beams = [stretchRod(kit, 0.035, steel), stretchRod(kit, 0.035, steel)];
  const plate = new THREE.Group();
  kit.root.add(plate);
  kit.box(0.5, 0.035, 0.8, steel, new THREE.Vector3(0, -0.018, 0), plate);
  kit.box(0.46, 0.01, 0.74, rubber, new THREE.Vector3(0, 0.004, 0), plate);
  const plateLegs = [stretchRod(kit, 0.03, steel), stretchRod(kit, 0.03, steel)];

  return {
    object: kit.root,
    update: (rig: BodyRig) => {
      const j = rig.joints!;
      const up = j.up;
      const fw = j.forward;
      carriage.position.copy(j.chest);
      aim(carriage, _a.copy(up).negate(), fw);
      // Rails: along the back, through the carriage's sliders.
      const line = _c.copy(j.chest).addScaledVector(fw, -0.27);
      const start = (0.12 - line.y) / up.y;
      rails.forEach((r, i) => {
        const z = i ? -0.25 : 0.25;
        const a = _a.copy(line).addScaledVector(up, start).setZ(z);
        const b = _b.copy(line).addScaledVector(up, start + 2.1).setZ(z);
        r(a, b);
        uprights[i](_d.copy(b).setY(0), b);
        beams[i](_d.copy(a).setY(0.03).setX(a.x - 0.1), _b.set(j.sides[0].toe.x + 0.2, 0.03, z));
      });
      // Foot platform under both soles.
      const s0 = j.sides[0];
      _a.copy(s0.heel).add(s0.toe).multiplyScalar(0.5).setZ(0);
      _b.subVectors(s0.toe, s0.heel).setZ(0).normalize();
      _d.set(-_b.y, _b.x, 0);
      plate.position.copy(_a).addScaledVector(_d, -0.028).addScaledVector(_b, 0.03);
      aim(plate, _b, _d);
      plateLegs.forEach((l, i) => {
        const x = plate.position.x + (i ? -0.18 : 0.18) * _b.x;
        const y = plate.position.y + (i ? -0.18 : 0.18) * _b.y - 0.03;
        l(_a.set(x, 0, 0), _c.set(x, y, 0));
      });
    },
    dispose: kit.dispose,
  };
};

/** Seated leg extension: seat and backrest from the pelvis, lever pivoting at the knee with a pad on the shins. */
const legExtension: ExtraPropBuilder = () => {
  const kit = new Kit();
  const seat = kit.cushion(0.5, 0.08, 0.46);
  const back = kit.cushion(0.62, 0.07, 0.44);
  const post = stretchRod(kit, 0.045, steel);
  const baseBeam = stretchRod(kit, 0.04, steel);
  const tower = new THREE.Group();
  kit.root.add(tower);
  kit.box(0.08, 1.7, 0.08, steel, new THREE.Vector3(0, 0.85, 0.12), tower);
  kit.box(0.08, 1.7, 0.08, steel, new THREE.Vector3(0, 0.85, -0.12), tower);
  for (let i = 0; i < 10; i++) kit.box(0.14, 0.04, 0.2, i === 9 ? accent : iron, new THREE.Vector3(0, 0.08 + i * 0.045, 0), tower);
  kit.box(0.2, 0.06, 0.34, steel, new THREE.Vector3(0, 1.72, 0), tower);
  const backBrace = stretchRod(kit, 0.035, steel);
  const pivot = kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 20).rotateX(Math.PI / 2), steel);
  const arm = stretchRod(kit, 0.024, steel);
  const roller = kit.mesh(new THREE.CapsuleGeometry(0.05, 0.3, 6, 14).rotateX(Math.PI / 2), upholstery);
  const armZ = -0.27;
  const grips = [grip(kit), grip(kit)];
  return {
    object: kit.root,
    update: (rig: BodyRig) => {
      const j = rig.joints!;
      const s0 = j.sides[0];
      const up = j.up;
      const fw = j.forward;
      // Seat: under the thighs, its front edge just behind the knees.
      const top = s0.hip.y - 0.075;
      const x1 = j.pelvis.x - 0.2;
      const x2 = s0.knee.x - 0.07;
      seat.position.set((x1 + x2) / 2, top - 0.04, 0);
      seat.scale.set((x2 - x1) / 0.5, 1, 1);
      back.position.copy(j.pelvis).addScaledVector(up, 0.34).addScaledVector(fw, -0.155);
      aim(back, _a.copy(up).negate(), fw);
      post(_a.set(seat.position.x, 0, 0), _b.set(seat.position.x, top - 0.08, 0));
      tower.position.set(back.position.x - 0.28, 0, 0);
      backBrace(_a.copy(back.position).addScaledVector(fw, -0.05), _b.set(tower.position.x, back.position.y, 0));
      baseBeam(_a.set(tower.position.x, 0.03, 0), _b.set(s0.knee.x + 0.1, 0.03, 0));
      // Lever: pivots at the knee axis (far side), pad in front of the lower shin.
      pivot.position.copy(s0.knee).setZ(armZ);
      _d.subVectors(s0.ankle, s0.knee).normalize();
      roller.position.copy(s0.knee).addScaledVector(_d, 0.36).addScaledVector(s0.legFront, 0.095).setZ(0);
      arm(pivot.position, _c.copy(roller.position).setZ(armZ));
      grips.forEach((g, i) => g(_a.copy(j.sides[i].hand).lerp(j.sides[i].wrist, 0.3), _b.set(seat.position.x, top - 0.06, j.sides[i].hand.z)));
    },
    dispose: kit.dispose,
  };
};

/** Lying leg curl: flat pad under the torso and thighs, lever pivoting at the knee with a pad behind the ankles. */
const lyingLegCurl: ExtraPropBuilder = () => {
  const kit = new Kit();
  const pad = kit.cushion(1, 0.08, 0.44);
  const legs = [stretchRod(kit, 0.04, steel), stretchRod(kit, 0.04, steel)];
  const feet = [stretchRod(kit, 0.03, steel), stretchRod(kit, 0.03, steel)];
  const pivot = kit.mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 20).rotateX(Math.PI / 2), steel);
  const arm = stretchRod(kit, 0.024, steel);
  const roller = kit.mesh(new THREE.CapsuleGeometry(0.05, 0.3, 6, 14).rotateX(Math.PI / 2), upholstery);
  const armZ = -0.26;
  const grips = [grip(kit), grip(kit)];
  return {
    object: kit.root,
    update: (rig: BodyRig) => {
      const j = rig.joints!;
      const s0 = j.sides[0];
      const top = j.pelvis.y - 0.11;
      const x1 = s0.knee.x + 0.06;
      const x2 = j.chest.x + 0.1;
      pad.position.set((x1 + x2) / 2, top - 0.04, 0);
      pad.scale.set((x2 - x1) / 1, 1, 1);
      [x1 + 0.12, x2 - 0.12].forEach((x, i) => {
        legs[i](_a.set(x, 0.03, 0), _b.set(x, top - 0.07, 0));
        feet[i](_a.set(x, 0.03, -0.25), _b.set(x, 0.03, 0.25));
      });
      pivot.position.copy(s0.knee).setZ(armZ);
      _d.subVectors(s0.ankle, s0.knee).normalize();
      roller.position.copy(s0.knee).addScaledVector(_d, 0.355).addScaledVector(s0.legFront, -0.095).setZ(0);
      arm(pivot.position, _c.copy(roller.position).setZ(armZ));
      grips.forEach((g, i) => g(_a.copy(j.sides[i].hand).lerp(j.sides[i].wrist, 0.3), _b.set(x2 - 0.12, top - 0.07, j.sides[i].hand.z)));
    },
    dispose: kit.dispose,
  };
};

/** Smith machine: fixed vertical rails at `x` (cm); the bar slides on them at the height of the upper back. */
const smith: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const x = W(num(p, "x", 150), 250).x;
  const railZ = 0.55;
  for (const s of [1, -1]) {
    kit.rod(new THREE.Vector3(x, 0.05, s * railZ), new THREE.Vector3(x, 2.25, s * railZ), 0.022, chrome);
    for (const dx of [-0.35, 0.35]) kit.box(0.07, 2.3, 0.07, steel, new THREE.Vector3(x + dx, 1.15, s * (railZ + 0.06)));
    kit.box(0.8, 0.06, 0.08, steel, new THREE.Vector3(x, 2.3, s * (railZ + 0.06)));
    kit.box(1.2, 0.05, 0.1, steel, new THREE.Vector3(x, 0.025, s * (railZ + 0.06)));
    // Safety stops.
    kit.box(0.3, 0.04, 0.05, accent, new THREE.Vector3(x + 0.05, 0.62, s * (railZ - 0.06)));
  }
  kit.box(0.08, 0.06, 2 * railZ + 0.2, steel, new THREE.Vector3(x - 0.35, 2.3, 0));
  const bar = new THREE.Group();
  kit.root.add(bar);
  barbell(kit, 0.225, bar);
  for (const s of [1, -1]) {
    kit.box(0.07, 0.1, 0.06, steel, new THREE.Vector3(0, 0, s * railZ), bar);
    kit.box(0.02, 0.06, 0.02, chrome, new THREE.Vector3(0.05, 0.02, s * (railZ - 0.06)), bar);
  }
  return {
    object: kit.root,
    update: (rig: BodyRig) => {
      const j = rig.joints!;
      _a.copy(j.chest).addScaledVector(j.up, 0.035).addScaledVector(j.chestForward, -0.09);
      bar.position.set(x, _a.y, 0);
    },
    dispose: kit.dispose,
  };
};

/** Seated calf raise: seat from the pelvis, foot block under the balls of the feet, knee pad on a lever. */
const seatedCalf: ExtraPropBuilder = () => {
  const kit = new Kit();
  const seat = kit.cushion(0.42, 0.08, 0.44);
  const post = stretchRod(kit, 0.045, steel);
  const base = stretchRod(kit, 0.045, steel);
  const block = kit.box(0.16, 1, 0.5, iron, new THREE.Vector3());
  const kneePad = kit.cushion(0.14, 0.07, 0.46);
  const lever = stretchRod(kit, 0.03, steel);
  const hornZ = -0.3;
  const hornGroup = new THREE.Group();
  kit.root.add(hornGroup);
  plateHorn(kit, hornGroup, new THREE.Vector3(0, 0, 0), -1, 0.2);
  const grips = [grip(kit), grip(kit)];
  const pivot = new THREE.Vector3();
  return {
    object: kit.root,
    update: (rig: BodyRig) => {
      const j = rig.joints!;
      const s0 = j.sides[0];
      const top = j.pelvis.y - 0.12;
      seat.position.set(j.pelvis.x + 0.02, top - 0.04, 0);
      post(_a.set(seat.position.x, 0, 0), _b.set(seat.position.x, top - 0.08, 0));
      // Balls of the feet rest on the back edge of the block.
      const blockTop = s0.toe.y - 0.03;
      block.scale.set(1, Math.max(0.02, blockTop), 1);
      block.position.set(s0.toe.x + 0.02, blockTop / 2, 0);
      base(_a.set(seat.position.x, 0.03, 0), _b.set(block.position.x + 0.3, 0.03, 0));
      // Pad rests on the thighs just behind the knees.
      _d.subVectors(s0.knee, s0.hip).normalize();
      kneePad.position.copy(s0.knee).addScaledVector(_d, -0.08).setZ(0);
      kneePad.position.y += 0.105;
      pivot.set(block.position.x + 0.3, 0.3, hornZ);
      lever(pivot, _c.copy(kneePad.position).setZ(hornZ));
      hornGroup.position.copy(pivot).lerp(_c, 0.45);
      grips.forEach((g, i) => g(_a.copy(j.sides[i].hand).lerp(j.sides[i].wrist, 0.3), _b.copy(kneePad.position).setZ(j.sides[i].hand.z).setY(kneePad.position.y + 0.02)));
    },
    dispose: kit.dispose,
  };
};

/** Plain wall panel for wall sits. Param: x (cm) of the wall's face; the wall extends behind it. */
const wall: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const face = W(num(p, "x", 115), 250).x;
  kit.box(0.12, 2.3, 1.8, wallPaint, new THREE.Vector3(face - 0.06, 1.15, 0));
  kit.box(0.02, 0.1, 1.8, steel, new THREE.Vector3(face + 0.005, 0.05, 0));
  return { object: kit.root, dispose: kit.dispose };
};

/** Nordic curl station: kneeling pad under the knees and a padded roller over the ankles. Params (cm): knee, ankle (x). */
const nordicAnchor: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const knee = W(num(p, "knee", 150), 250).x;
  const ankle = W(num(p, "ankle", 107), 250).x;
  const padG = kit.cushion(0.75, 0.04, 0.5);
  padG.position.set((knee + 0.12 + ankle - 0.3) / 2, 0.02, 0);
  padG.scale.set((knee + 0.12 - (ankle - 0.3)) / 0.75, 1, 1);
  const roller = kit.mesh(new THREE.CapsuleGeometry(0.05, 0.36, 6, 14).rotateX(Math.PI / 2), upholstery);
  roller.position.set(ankle + 0.01, 0.16, 0);
  for (const s of [1, -1]) {
    kit.box(0.05, 0.2, 0.04, steel, new THREE.Vector3(ankle + 0.01, 0.1, s * 0.25));
  }
  kit.box(0.3, 0.03, 0.56, steel, new THREE.Vector3(ankle - 0.05, 0.015, 0));
  return { object: kit.root, dispose: kit.dispose };
};

/** Props for the lower-body exercise library, keyed by `kind` (use a "lower:" prefix). */
export const LOWER_PROPS: Record<string, ExtraPropBuilder> = {
  "lower:front-rack": frontRack,
  "lower:held-dumbbell": heldDumbbell,
  "lower:hip-bar": hipBar,
  "lower:plyo-box": plyoBox,
  "lower:bench-across": benchAcross,
  "lower:trap-bar": trapBar,
  "lower:low-cable": lowCable,
  "lower:leg-press": legPress,
  "lower:hack-squat": hackSquat,
  "lower:leg-extension": legExtension,
  "lower:lying-leg-curl": lyingLegCurl,
  "lower:smith": smith,
  "lower:seated-calf": seatedCalf,
  "lower:wall": wall,
  "lower:nordic-anchor": nordicAnchor,
};

