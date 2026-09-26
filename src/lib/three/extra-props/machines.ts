import * as THREE from "three";
import { toWorld, type BodyRig } from "../rig";
import type { ExtraProp, ExtraPropBuilder, ExtraPropParams } from "./types";

/*
 * Selectorized machines for the machine exercises (kinds prefixed "machine:").
 * Static parts are laid out in authoring centimetres (x forward, y down, floor at
 * y = 250, z signed: positive is the near side / side 0); moving parts (handles,
 * pads, rollers, levers) follow the solved joints every frame (world metres, y up).
 */

const iron = new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.55, metalness: 0.35 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.25, metalness: 0.9 });
const steel = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.4, metalness: 0.6 });
const upholstery = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
const accent = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5, metalness: 0.2 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });

const Y = new THREE.Vector3(0, 1, 0);
const W = (x: number, y: number, z = 0) => toWorld([x, y, z]);
const num = (p: ExtraPropParams, key: string, fallback: number) => (typeof p[key] === "number" ? (p[key] as number) : fallback);
const str = (p: ExtraPropParams, key: string, fallback: string) => (p[key] === undefined ? fallback : String(p[key]));

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

/** Tracks the geometries a prop creates so it can free them. */
class Kit {
  readonly root = new THREE.Group();
  private readonly geos: THREE.BufferGeometry[] = [];

  mesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
    this.geos.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    this.root.add(m);
    return m;
  }

  /** Box of size (w, h, d) metres centred at `at`. */
  box(w: number, h: number, d: number, mat: THREE.Material, at: THREE.Vector3) {
    const m = this.mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.copy(at);
    return m;
  }

  /** Static cylinder from a to b (world metres). */
  rod(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
    const m = this.mesh(new THREE.CylinderGeometry(r, r, Math.max(a.distanceTo(b), 1e-4), 16), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(Y, _c.subVectors(b, a).normalize());
    return m;
  }

  /** A rod re-aimed every frame: call the returned function with its two ends. */
  link(r: number, mat: THREE.Material) {
    const geo = new THREE.CylinderGeometry(r, r, 1, 14);
    geo.translate(0, 0.5, 0);
    const m = this.mesh(geo, mat);
    return (a: THREE.Vector3, b: THREE.Vector3) => {
      const len = Math.max(a.distanceTo(b), 1e-4);
      m.position.copy(a);
      m.quaternion.setFromUnitVectors(Y, _c.subVectors(b, a).divideScalar(len));
      m.scale.set(1, len, 1);
    };
  }

  dispose = () => this.geos.forEach((g) => g.dispose());
}

/** Seat on a post with a base rail, and a pad (back rest or chest pad) on its own post. */
function seatAndPad(kit: Kit, p: ExtraPropParams, defaults: { seatFrom: number; seatTo: number; seatTop: number; padX: number; padTop: number; padBottom: number }) {
  const seatFrom = num(p, "seatFrom", defaults.seatFrom);
  const seatTo = num(p, "seatTo", defaults.seatTo);
  const seatTop = num(p, "seatTop", defaults.seatTop);
  const padX = num(p, "padX", defaults.padX);
  const padTop = num(p, "padTop", defaults.padTop);
  const padBottom = num(p, "padBottom", defaults.padBottom);
  const chest = str(p, "pad", "back") === "chest";
  const seatMid = (seatFrom + seatTo) / 2;
  kit.box((seatTo - seatFrom) / 100, 0.08, 0.4, upholstery, W(seatMid, seatTop + 4));
  kit.box(0.07, (250 - seatTop - 8) / 100, 0.07, steel, W(seatMid, (seatTop + 8 + 250) / 2));
  const padCx = chest ? padX + 4 : padX - 4;
  if (padBottom > padTop) {
    kit.box(0.08, (padBottom - padTop) / 100, 0.36, upholstery, W(padCx, (padTop + padBottom) / 2));
    const postX = chest ? padCx + 10 : padCx - 10;
    kit.box(0.06, (250 - (padTop + padBottom) / 2) / 100, 0.06, steel, W(postX, (250 + (padTop + padBottom) / 2) / 2));
    kit.box(Math.abs(postX - padCx) / 100 + 0.04, 0.05, 0.06, steel, W((postX + padCx) / 2, (padTop + padBottom) / 2));
  }
  kit.box(Math.abs(seatMid - padCx) / 100 + 0.6, 0.05, 0.12, steel, W((seatMid + padCx) / 2, 247));
  return { seatMid, seatTop, padCx };
}

/** Weight stack: two guide rods, plates and a top plate, with a frame behind. */
function weightStack(kit: Kit, x: number, top = 60) {
  const base = W(x, 250);
  kit.box(0.5, 0.05, 0.6, steel, new THREE.Vector3(base.x, 0.025, 0));
  const h = (250 - top) / 100;
  for (const s of [1, -1]) kit.box(0.07, h, 0.07, steel, new THREE.Vector3(base.x - 0.12, h / 2, s * 0.2));
  kit.box(0.08, 0.07, 0.5, steel, new THREE.Vector3(base.x - 0.12, h, 0));
  for (let i = 0; i < 12; i++) kit.box(0.2, 0.04, 0.28, i === 11 ? accent : iron, new THREE.Vector3(base.x, 0.08 + i * 0.045, 0));
  for (const s of [1, -1]) kit.rod(new THREE.Vector3(base.x, 0.05, s * 0.08), new THREE.Vector3(base.x, h - 0.05, s * 0.08), 0.008, chrome);
  return h;
}

/**
 * Lever machine (chest press, shoulder press, seated row): a seat, a back rest or chest
 * pad, a weight stack and one lever per side from a fixed pivot to a handle in each hand.
 * Params: seatFrom, seatTo, seatTop, pad ("back" | "chest"), padX, padTop, padBottom,
 * pivotX, pivotY, pivotZ (lateral, cm), stackX, style (grip).
 */
const leverMachine: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  seatAndPad(kit, p, { seatFrom: 105, seatTo: 160, seatTop: 200, padX: 118, padTop: 105, padBottom: 196 });
  const pivotX = num(p, "pivotX", 120);
  const pivotY = num(p, "pivotY", 60);
  const pivotZ = num(p, "pivotZ", 30);
  const stackX = num(p, "stackX", 70);
  const stackH = weightStack(kit, stackX, Math.min(pivotY - 8, 70));
  const stackTop = new THREE.Vector3(W(stackX, 250).x - 0.12, stackH, 0);
  // Beam from the stack to the lever pivots, and the pivot axle.
  const pivots = [0, 1].map((i) => W(pivotX, pivotY, i === 0 ? pivotZ : -pivotZ));
  kit.rod(stackTop, new THREE.Vector3(pivots[0].x, stackTop.y, 0), 0.03, steel);
  kit.rod(new THREE.Vector3(pivots[0].x, stackTop.y, 0), new THREE.Vector3(pivots[0].x, pivots[0].y, 0), 0.03, steel);
  kit.rod(pivots[0], pivots[1], 0.025, chrome);
  const levers = [kit.link(0.02, steel), kit.link(0.02, steel)];
  const handles = [kit.link(0.016, rubber), kit.link(0.016, rubber)];
  const style = str(p, "style", "neutral");
  const out: ExtraProp = {
    object: kit.root,
    grip: { hands: "both", style: style === "overhand" || style === "underhand" ? style : "neutral" },
    update: (rig: BodyRig) => {
      const j = rig.joints;
      if (!j) return;
      for (let i = 0; i < 2; i++) {
        const s = j.sides[i];
        const g = s.grip;
        levers[i](pivots[i], g);
        handles[i](_a.copy(g).addScaledVector(s.gripAxis, -0.065), _b.copy(g).addScaledVector(s.gripAxis, 0.065));
      }
    },
    dispose: kit.dispose,
  };
  return out;
};

/**
 * Seated leg curl: seat and back rest, a thigh pad clamped above the knees, and a
 * roller behind the ankles on a lever pivoting at the knee axis. Hands hold the side
 * grips. Params: seatFrom, seatTo, seatTop, padX, padTop, padBottom.
 */
const seatedLegCurl: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  seatAndPad(kit, p, { seatFrom: 110, seatTo: 172, seatTop: 200, padX: 122, padTop: 110, padBottom: 196 });
  const thighPad = kit.mesh(new THREE.CapsuleGeometry(0.045, 0.34, 6, 14).rotateX(Math.PI / 2), upholstery);
  const roller = kit.mesh(new THREE.CapsuleGeometry(0.045, 0.32, 6, 14).rotateX(Math.PI / 2), upholstery);
  const axle = kit.mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 18).rotateX(Math.PI / 2), steel);
  const lever = kit.link(0.022, steel);
  const clamp = kit.link(0.02, steel);
  const clampFoot = kit.link(0.03, steel);
  const handles = [kit.link(0.015, rubber), kit.link(0.015, rubber)];
  const sideZ = -0.26;
  return {
    object: kit.root,
    grip: { hands: "both", style: "neutral" },
    update: (rig: BodyRig) => {
      const j = rig.joints;
      if (!j) return;
      const s = j.sides[0];
      thighPad.position.copy(s.hip).lerp(s.knee, 0.82).addScaledVector(s.legFront, 0.1).setZ(0);
      _a.subVectors(s.ankle, s.knee).normalize();
      roller.position.copy(s.ankle).addScaledVector(_a, -0.06).addScaledVector(s.legFront, -0.075).setZ(0);
      axle.position.copy(s.knee).setZ(sideZ);
      lever(axle.position, _b.copy(roller.position).setZ(sideZ));
      clamp(_a.copy(thighPad.position).setZ(sideZ), _b.copy(axle.position));
      clampFoot(_a.copy(axle.position), _b.copy(axle.position).setY(0.03));
      for (let i = 0; i < 2; i++) {
        const g = j.sides[i].grip;
        handles[i](_a.copy(g).setY(g.y + 0.06), _b.copy(g).setY(g.y - 0.06));
      }
    },
    dispose: kit.dispose,
  };
};

/**
 * Hip abduction / adduction machine: a reclined seat, and a pad on the outside ("out")
 * or inside ("in") of each knee on a lever swinging from under the seat.
 */
const hipMachine: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  seatAndPad(kit, p, { seatFrom: 112, seatTo: 170, seatTop: 200, padX: 122, padTop: 112, padBottom: 196 });
  const inside = str(p, "side", "out") === "in";
  const pads = [0, 1].map(() => kit.mesh(new THREE.CapsuleGeometry(0.05, 0.22, 6, 14).rotateZ(Math.PI / 2), upholstery));
  const levers = [kit.link(0.022, steel), kit.link(0.022, steel)];
  const handles = [kit.link(0.015, rubber), kit.link(0.015, rubber)];
  const pivot = W(num(p, "pivotX", 150), 212);
  return {
    object: kit.root,
    grip: { hands: "both", style: "neutral" },
    update: (rig: BodyRig) => {
      const j = rig.joints;
      if (!j) return;
      for (let i = 0; i < 2; i++) {
        const s = j.sides[i];
        const sign = i === 0 ? 1 : -1;
        const off = (inside ? -1 : 1) * sign * 0.075;
        _a.copy(s.hip).lerp(s.knee, 0.78);
        pads[i].position.set(_a.x, _a.y, _a.z + off);
        pads[i].rotation.y = Math.atan2(s.knee.z - s.hip.z, s.knee.x - s.hip.x) * -1;
        levers[i](_b.set(pivot.x, pivot.y, sign * 0.04), _c.set(_a.x, _a.y - 0.07, _a.z + off));
        const g = s.grip;
        handles[i](_b.copy(g).setX(g.x + 0.06), _c.copy(g).setX(g.x - 0.06));
      }
    },
    dispose: kit.dispose,
  };
};

/**
 * Assisted pull-up / dip machine: tall frame with the pull-up handles at (barX, barY),
 * and a knee pad under the knees on a lever to the weight stack behind.
 */
const assistedPullUp: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const barX = num(p, "barX", 165);
  const barY = num(p, "barY", 25);
  const bar = W(barX, barY);
  for (const s of [1, -1]) {
    kit.box(0.08, bar.y + 0.12, 0.08, steel, new THREE.Vector3(bar.x - 0.35, (bar.y + 0.12) / 2, s * 0.45));
    kit.rod(new THREE.Vector3(bar.x - 0.35, bar.y, s * 0.45), new THREE.Vector3(bar.x, bar.y, s * 0.45), 0.02, steel);
    // Wide handles, angled slightly.
    kit.rod(new THREE.Vector3(bar.x, bar.y, s * 0.3), new THREE.Vector3(bar.x, bar.y, s * 0.45), 0.017, rubber);
  }
  kit.box(0.08, 0.08, 1.0, steel, new THREE.Vector3(bar.x - 0.35, bar.y + 0.12, 0));
  kit.box(0.7, 0.05, 1.0, steel, new THREE.Vector3(bar.x - 0.35, 0.025, 0));
  weightStack(kit, barX - 60, 90);
  const pad = kit.mesh(new THREE.BoxGeometry(0.3, 0.06, 0.4), upholstery);
  const arm = kit.link(0.025, steel);
  const pivot = W(barX - 40, 190);
  return {
    object: kit.root,
    grip: { hands: "both", style: "overhand" },
    update: (rig: BodyRig) => {
      const j = rig.joints;
      if (!j) return;
      const s = j.sides[0];
      _a.copy(s.knee).lerp(s.ankle, 0.35);
      pad.position.set(_a.x, Math.min(s.knee.y, s.ankle.y) - 0.07, 0);
      arm(pivot, _b.set(pad.position.x, pad.position.y - 0.03, 0));
    },
    dispose: kit.dispose,
  };
};

/** Low cable column with an ankle cuff on side 0's ankle (glute kickbacks). Params: x, pulleyY. */
const ankleCable: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const x = num(p, "x", 215);
  const pulley = W(x, num(p, "pulleyY", 238));
  const base = W(x + 12, 250);
  kit.box(0.5, 0.05, 0.7, steel, new THREE.Vector3(base.x, 0.025, 0));
  for (const s of [1, -1]) kit.box(0.07, 2.1, 0.07, steel, new THREE.Vector3(base.x, 1.05, s * 0.22));
  kit.box(0.12, 0.07, 0.52, steel, new THREE.Vector3(base.x, 2.1, 0));
  for (let i = 0; i < 12; i++) kit.box(0.2, 0.04, 0.3, i === 11 ? accent : iron, new THREE.Vector3(base.x, 0.08 + i * 0.045, 0));
  // Hand grips on the frame.
  kit.rod(new THREE.Vector3(base.x - 0.06, 1.15, 0.28), new THREE.Vector3(base.x - 0.06, 1.15, -0.28), 0.016, rubber);
  const wheel = kit.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 20).rotateX(Math.PI / 2), chrome);
  wheel.position.copy(pulley);
  const cable = kit.link(0.006, rubber);
  const cuff = kit.mesh(new THREE.TorusGeometry(0.05, 0.018, 8, 18).rotateX(Math.PI / 2), rubber);
  return {
    object: kit.root,
    grip: { hands: "both", style: "overhand" },
    update: (rig: BodyRig) => {
      const j = rig.joints;
      if (!j) return;
      const s = j.sides[0];
      cuff.position.copy(s.ankle).lerp(s.knee, 0.08);
      cable(pulley, cuff.position);
    },
    dispose: kit.dispose,
  };
};

/**
 * Smith machine with the bar in the hands (bench press): rails at `x`, the bar slides
 * on them at the height of the grips. Params: x (cm).
 */
const smithHands: ExtraPropBuilder = (p) => {
  const kit = new Kit();
  const x = W(num(p, "x", 105), 250).x;
  const railZ = 0.55;
  for (const s of [1, -1]) {
    kit.rod(new THREE.Vector3(x, 0.05, s * railZ), new THREE.Vector3(x, 2.25, s * railZ), 0.022, chrome);
    for (const dx of [-0.35, 0.35]) kit.box(0.07, 2.3, 0.07, steel, new THREE.Vector3(x + dx, 1.15, s * (railZ + 0.06)));
    kit.box(0.8, 0.06, 0.08, steel, new THREE.Vector3(x, 2.3, s * (railZ + 0.06)));
    kit.box(1.2, 0.05, 0.1, steel, new THREE.Vector3(x, 0.025, s * (railZ + 0.06)));
    kit.box(0.3, 0.04, 0.05, accent, new THREE.Vector3(x + 0.05, 0.35, s * (railZ - 0.06)));
  }
  kit.box(0.08, 0.06, 2 * railZ + 0.2, steel, new THREE.Vector3(x - 0.35, 2.3, 0));
  const bar = new THREE.Group();
  kit.root.add(bar);
  const barGeo = new THREE.CylinderGeometry(0.014, 0.014, 2.1, 16).rotateX(Math.PI / 2);
  bar.add(new THREE.Mesh(barGeo, chrome));
  const plateGeo = new THREE.CylinderGeometry(0.225, 0.225, 0.04, 32).rotateX(Math.PI / 2);
  const blockGeo = new THREE.BoxGeometry(0.07, 0.1, 0.06);
  for (const s of [1, -1]) {
    const plate = new THREE.Mesh(plateGeo, iron);
    plate.position.z = s * 0.64;
    plate.castShadow = true;
    bar.add(plate);
    const b = new THREE.Mesh(blockGeo, steel);
    b.position.z = s * railZ;
    bar.add(b);
  }
  return {
    object: kit.root,
    grip: { hands: "both", style: "overhand" },
    update: (rig: BodyRig) => {
      const j = rig.joints;
      if (!j) return;
      bar.position.set(x, (j.sides[0].grip.y + j.sides[1].grip.y) / 2, 0);
    },
    dispose: () => {
      kit.dispose();
      barGeo.dispose();
      plateGeo.dispose();
      blockGeo.dispose();
    },
  };
};

/** Machine props, keyed by `kind` (use a "machine:" prefix). */
export const MACHINE_PROPS: Record<string, ExtraPropBuilder> = {
  "machine:lever": leverMachine,
  "machine:seated-leg-curl": seatedLegCurl,
  "machine:hip": hipMachine,
  "machine:assisted-pull-up": assistedPullUp,
  "machine:ankle-cable": ankleCable,
  "machine:smith-bench": smithHands,
};
