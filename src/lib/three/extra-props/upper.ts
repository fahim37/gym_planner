import * as THREE from "three";
import { toWorld, type BodyRig } from "../rig";
import type { ExtraProp, ExtraPropBuilder, ExtraPropParams } from "./types";

/*
 * Plug-in props for the upper-body exercise library (kinds prefixed "upper:").
 * Positions in params are authoring centimetres (x forward, y down, floor at
 * y = 250, z signed: positive is the near side / side 0).
 */

const iron = new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.55, metalness: 0.35 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.25, metalness: 0.9 });
const pad = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
const frame = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.4, metalness: 0.6 });
const cableMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

const num = (p: ExtraPropParams, key: string, fallback: number) => (typeof p[key] === "number" ? (p[key] as number) : fallback);
const str = (p: ExtraPropParams, key: string, fallback: string) => (p[key] === undefined ? fallback : String(p[key]));

/** Authoring cm → world metres. */
const W = (x: number, y: number, z = 0) => toWorld([x, y, z]);

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A cylinder whose axis runs from `a` to `b` (world metres). */
function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material, segments = 16) {
  const m = mesh(new THREE.CylinderGeometry(radius, radius, Math.max(a.distanceTo(b), 1e-4), segments), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(Y_AXIS, new THREE.Vector3().subVectors(b, a).normalize());
  return m;
}

/** Axis-aligned box from a world-metre centre and size. */
function block(center: THREE.Vector3, size: [number, number, number], mat: THREE.Material) {
  const m = mesh(new THREE.BoxGeometry(...size), mat);
  m.position.copy(center);
  return m;
}

/** A unit-length rod along +y from its origin, re-aimed and stretched every frame. */
function stretchRod(radius: number, mat: THREE.Material) {
  const geo = new THREE.CylinderGeometry(radius, radius, 1, 12);
  geo.translate(0, 0.5, 0);
  return mesh(geo, mat);
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _d = new THREE.Vector3();
const _e = new THREE.Vector3();

function aim(m: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  _e.subVectors(to, from);
  const length = Math.max(_e.length(), 1e-4);
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(Y_AXIS, _e.normalize());
  m.scale.set(1, length, 1);
}

/** Wraps a static or animated object so every geometry it owns is freed on dispose. */
function owned(object: THREE.Object3D, update?: (rig: BodyRig) => void, grip?: ExtraProp["grip"]): ExtraProp {
  return {
    object,
    grip,
    update: update && ((rig) => rig.joints && update(rig)),
    dispose: () =>
      object.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      }),
  };
}

/** Bench legs: a vertical post plus a floor foot at each x. */
function benchLegs(g: THREE.Group, xs: number[], top: number, depth: number, z = 0) {
  for (const x of xs) {
    g.add(block(W(x, (top + 250) / 2, z), [0.05, (250 - top) / 100, 0.06], frame));
    g.add(block(W(x, 248, z), [0.06, 0.03, depth], frame));
  }
}

/** Midpoint of both hands' grip centres (inside the closed fists), world metres. */
function gripMid(rig: BodyRig, out: THREE.Vector3) {
  const j = rig.joints!;
  return out.copy(j.sides[0].grip).add(j.sides[1].grip).multiplyScalar(0.5);
}

function grip(rig: BodyRig, side: number, out: THREE.Vector3) {
  return out.copy(rig.joints!.sides[side].grip);
}

type GripStyle = NonNullable<ExtraProp["grip"]>["style"];
const style = (p: ExtraPropParams, fallback: NonNullable<GripStyle>): GripStyle => {
  const v = str(p, "style", fallback);
  return v === "overhand" || v === "underhand" || v === "neutral" ? v : fallback;
};

/** Dumbbell with its handle along local z. */
function dumbbell() {
  const g = new THREE.Group();
  g.add(rod(new THREE.Vector3(0, 0, -0.1), new THREE.Vector3(0, 0, 0.1), 0.014, chrome));
  for (const s of [1, -1]) g.add(rod(new THREE.Vector3(0, 0, s * 0.065), new THREE.Vector3(0, 0, s * 0.11), 0.055, iron));
  return g;
}

// ───────────────────────────── Free weights ─────────────────────────────

/**
 * EZ curl bar that follows both hands. Params: plate ("small" | "large").
 * The cambered grip section bends in the plane of the forearms.
 */
const ezBar: ExtraPropBuilder = (p) => {
  const bar = new THREE.Group();
  // Camber polyline for z ≥ 0 as (z, offset) pairs, mirrored for z < 0.
  const camber: [number, number][] = [
    [0, 0.024],
    [0.05, 0.024],
    [0.1, 0],
    [0.16, 0.028],
    [0.22, 0],
    [0.4, 0],
  ];
  const plateR = str(p, "plate", "small") === "large" ? 0.2 : 0.12;
  for (const s of [1, -1]) {
    for (let i = 0; i < camber.length - 1; i++) {
      const [z1, o1] = camber[i];
      const [z2, o2] = camber[i + 1];
      bar.add(rod(new THREE.Vector3(o1, 0, s * z1), new THREE.Vector3(o2, 0, s * z2), 0.013, chrome, 10));
    }
    bar.add(rod(new THREE.Vector3(0, 0, s * 0.4), new THREE.Vector3(0, 0, s * 0.62), 0.024, chrome));
    bar.add(rod(new THREE.Vector3(0, 0, s * 0.4), new THREE.Vector3(0, 0, s * 0.425), 0.035, chrome));
    for (let k = 0; k < 2; k++) {
      const z = s * (0.46 + k * 0.045);
      bar.add(rod(new THREE.Vector3(0, 0, z - 0.018), new THREE.Vector3(0, 0, z + 0.018), plateR - k * 0.025, iron));
    }
  }
  return owned(bar, (rig) => {
    const j = rig.joints!;
    gripMid(rig, bar.position);
    bar.position.z = 0;
    // Camber offsets run along the forearms (projected onto the side view).
    _d.subVectors(j.sides[0].hand, j.sides[0].elbow).add(_a.subVectors(j.sides[1].hand, j.sides[1].elbow));
    _d.z = 0;
    if (_d.lengthSq() < 1e-6) _d.set(0, -1, 0);
    bar.rotation.set(0, 0, Math.atan2(_d.y, _d.x));
  }, { hands: "both", radius: 0.014, style: style(p, "underhand") });
};

/**
 * Straight barbell held in both hands with a chosen grip (curls, reverse curls).
 * Params: style ("underhand" | "overhand"), plate ("small" | "large").
 */
const straightBar: ExtraPropBuilder = (p) => {
  const bar = new THREE.Group();
  const plateR = str(p, "plate", "small") === "large" ? 0.225 : 0.13;
  bar.add(rod(new THREE.Vector3(0, 0, -0.9), new THREE.Vector3(0, 0, 0.9), 0.014, chrome));
  for (const s of [1, -1]) {
    for (let k = 0; k < 2; k++) {
      const z = s * (0.6 + k * 0.045);
      bar.add(rod(new THREE.Vector3(0, 0, z - 0.02), new THREE.Vector3(0, 0, z + 0.02), plateR - k * 0.03, iron));
    }
    bar.add(rod(new THREE.Vector3(0, 0, s * 0.54), new THREE.Vector3(0, 0, s * 0.57), 0.03, chrome));
  }
  return owned(
    bar,
    (rig) => {
      gripMid(rig, bar.position);
      bar.position.z = 0;
    },
    { hands: "both", radius: 0.014, style: style(p, "underhand") },
  );
};

/**
 * Dumbbells that sit in the closed fists, handle along the knuckle axis.
 * Params: hands ("both" | "near"), style ("neutral" | "underhand" | "overhand").
 */
const dumbbells =
  (fallback: NonNullable<GripStyle>): ExtraPropBuilder =>
  (p) => {
    const g = new THREE.Group();
    const near = str(p, "hands", "both") === "near";
    const bells = Array.from({ length: near ? 1 : 2 }, () => dumbbell());
    bells.forEach((b) => g.add(b));
    return owned(
      g,
      (rig) => {
        bells.forEach((b, i) => {
          const s = rig.joints!.sides[i];
          b.position.copy(s.grip);
          b.quaternion.setFromUnitVectors(Z_AXIS, s.gripAxis);
        });
      },
      { hands: near ? "near" : "both", radius: 0.014, style: style(p, fallback) },
    );
  };

/**
 * A fixed horizontal bar across the view (pull-up / chin-up bar, low bar for
 * inverted rows) on two uprights, gripped with the given style.
 * Params: x, y (bar, authoring cm), style.
 */
const fixedBar: ExtraPropBuilder = (p) => {
  const g = new THREE.Group();
  const c = W(num(p, "x", 165), num(p, "y", 40));
  g.add(rod(new THREE.Vector3(c.x, c.y, -0.6), new THREE.Vector3(c.x, c.y, 0.6), 0.016, chrome));
  for (const sd of [1, -1]) {
    g.add(rod(new THREE.Vector3(c.x, c.y + 0.08, sd * 0.6), new THREE.Vector3(c.x, 0, sd * 0.6), 0.03, frame));
    g.add(block(new THREE.Vector3(c.x, 0.015, sd * 0.6), [0.4, 0.03, 0.08], frame));
  }
  return owned(g, undefined, { hands: "both", radius: 0.016, style: style(p, "overhand") });
};

/**
 * Landmine / T-bar: a bar pivoting in a floor sleeve at `x`, running up to a
 * V-handle held in both hands, loaded with plates just past the grip.
 * Params: x (pivot, authoring cm).
 */
const landmine: ExtraPropBuilder = (p) => {
  const g = new THREE.Group();
  const px = num(p, "x", 40);
  const pivot = W(px, 245);
  g.add(block(W(px, 249), [0.34, 0.02, 0.34], frame));
  g.add(rod(W(px, 250), pivot, 0.035, frame));
  const bar = stretchRod(0.014, chrome);
  g.add(bar);
  const sleeve = new THREE.Group();
  sleeve.add(rod(new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(0, 0.4, 0), 0.025, chrome));
  sleeve.add(rod(new THREE.Vector3(0, 0.03, 0), new THREE.Vector3(0, 0.05, 0), 0.035, chrome));
  for (let k = 0; k < 2; k++) {
    const y = 0.08 + k * 0.05;
    sleeve.add(rod(new THREE.Vector3(0, y - 0.02, 0), new THREE.Vector3(0, y + 0.02, 0), 0.17 - k * 0.04, iron));
  }
  g.add(sleeve);
  // V-handle: a crossbar in the hands with two struts up to the bar.
  const vHandle = new THREE.Group();
  vHandle.add(rod(new THREE.Vector3(0, 0, -0.07), new THREE.Vector3(0, 0, 0.07), 0.013, chrome));
  for (const s of [1, -1]) vHandle.add(rod(new THREE.Vector3(0, 0, s * 0.07), new THREE.Vector3(0, 0.07, 0), 0.01, chrome));
  g.add(vHandle);
  return owned(g, (rig) => {
    gripMid(rig, vHandle.position);
    vHandle.position.z = 0;
    // The bar runs just above the grip.
    _b.copy(vHandle.position).add(_a.set(0, 0.07, 0));
    _d.subVectors(_b, pivot).normalize();
    aim(bar, pivot, _b.clone().addScaledVector(_d, 0.05));
    sleeve.position.copy(_b).addScaledVector(_d, 0.03);
    sleeve.quaternion.setFromUnitVectors(Y_AXIS, _d);
  });
};

// ───────────────────────────── Cables ─────────────────────────────

/**
 * A cable column: pulley at (x, y, z) with a cable running to a handle that
 * follows one hand (side "0" / "1") or the midpoint of both ("both").
 * Params: x, y, z (authoring cm, z signed), side, handle ("single" | "bar" |
 * "rope"), style (grip, default overhand for bars, neutral otherwise),
 * tower (boolean, default true).
 */
const cable: ExtraPropBuilder = (p) => {
  const g = new THREE.Group();
  const pulley = W(num(p, "x", 240), num(p, "y", 40), num(p, "z", 0));
  const side = str(p, "side", "0");
  const handleType = str(p, "handle", "single");
  if (p.tower !== false) {
    // Column just behind the pulley, away from the athlete.
    const away = new THREE.Vector3(pulley.x, 0, pulley.z);
    if (away.lengthSq() < 1e-4) away.set(1, 0, 0);
    away.normalize().multiplyScalar(0.09);
    const top = Math.max(pulley.y + 0.2, 2.1);
    g.add(block(new THREE.Vector3(pulley.x + away.x, top / 2, pulley.z + away.z), [0.09, top, 0.09], frame));
    g.add(block(new THREE.Vector3(pulley.x + away.x, 0.015, pulley.z + away.z), [0.36, 0.03, 0.36], frame));
    g.add(rod(pulley, new THREE.Vector3(pulley.x + away.x, pulley.y, pulley.z + away.z), 0.012, frame));
  }
  const wheel = mesh(new THREE.SphereGeometry(0.035, 16, 12), chrome);
  wheel.position.copy(pulley);
  g.add(wheel);
  const line = stretchRod(0.005, cableMat);
  g.add(line);
  const handle = new THREE.Group();
  const ropes = handleType === "rope" ? [stretchRod(0.014, cableMat), stretchRod(0.014, cableMat)] : [];
  if (handleType === "bar") {
    handle.add(rod(new THREE.Vector3(0, 0, -0.28), new THREE.Vector3(0, 0, 0.28), 0.013, chrome));
  } else if (handleType === "single") {
    handle.add(rod(new THREE.Vector3(0, 0, -0.055), new THREE.Vector3(0, 0, 0.055), 0.015, iron));
  }
  g.add(handle, ...ropes);
  return owned(g, (rig) => {
    const j = rig.joints!;
    if (side === "both") {
      gripMid(rig, handle.position);
      if (handleType === "rope") {
        // Rope ends in each fist, joined a hand's width toward the pulley.
        _d.subVectors(pulley, handle.position).normalize();
        handle.position.addScaledVector(_d, 0.1);
        ropes.forEach((r, i) => aim(r, handle.position, j.sides[i].grip));
      } else handle.position.z = 0;
    } else {
      const s = j.sides[side === "1" ? 1 : 0];
      handle.position.copy(s.grip);
      handle.quaternion.setFromUnitVectors(Z_AXIS, s.gripAxis);
    }
    aim(line, handle.position, pulley);
  }, {
    hands: side === "both" ? "both" : side === "1" ? "far" : "near",
    radius: handleType === "rope" ? 0.018 : 0.014,
    style: style(p, handleType === "bar" ? "overhand" : "neutral"),
  });
};

/**
 * Seated cable row station: low seat, angled footplate and a low pulley in
 * front, with a V-handle that follows the hands.
 * Params: seatFrom, seatTo, seatTop, plateX, plateY, pulleyX, pulleyY.
 */
const rowStation: ExtraPropBuilder = (p) => {
  const g = new THREE.Group();
  const seatFrom = num(p, "seatFrom", 110);
  const seatTo = num(p, "seatTo", 170);
  const seatTop = num(p, "seatTop", 205);
  const plateX = num(p, "plateX", 228);
  const plateY = num(p, "plateY", 228);
  const pulleyX = num(p, "pulleyX", 250);
  const pulleyY = num(p, "pulleyY", 175);
  // Floor rail joining seat, footplate and column.
  g.add(block(W((seatFrom + pulleyX + 10) / 2, 247), [(pulleyX + 10 - seatFrom) / 100, 0.06, 0.12], frame));
  g.add(block(W((seatFrom + seatTo) / 2, seatTop + 4), [(seatTo - seatFrom) / 100, 0.08, 0.3], pad));
  benchLegs(g, [seatFrom + 8, seatTo - 8], seatTop + 8, 0.3);
  // Footplate: tilted slab rising from the rail.
  const plate = block(new THREE.Vector3(), [0.03, 0.34, 0.46], frame);
  plate.position.copy(W(plateX + 5, plateY));
  plate.rotation.z = (-18 * Math.PI) / 180;
  g.add(plate);
  g.add(rod(W(plateX + 14, 246), W(plateX + 8, plateY + 4), 0.018, frame));
  // Pulley column.
  const pulley = W(pulleyX, pulleyY);
  const top = 2.1;
  g.add(block(new THREE.Vector3(pulley.x + 0.12, top / 2, 0), [0.12, top, 0.36], frame));
  const wheel = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 20), chrome);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.copy(pulley);
  g.add(wheel);
  const line = stretchRod(0.006, cableMat);
  g.add(line);
  const handle = new THREE.Group();
  handle.add(rod(new THREE.Vector3(0, 0, -0.06), new THREE.Vector3(0, 0, 0.06), 0.014, iron));
  for (const s of [1, -1]) handle.add(rod(new THREE.Vector3(0, 0, s * 0.06), new THREE.Vector3(0.1, 0, 0), 0.01, chrome));
  g.add(handle);
  return owned(g, (rig) => {
    gripMid(rig, handle.position);
    handle.position.z = 0;
    _d.subVectors(pulley, handle.position);
    handle.rotation.set(0, 0, Math.atan2(_d.y, _d.x));
    _a.copy(handle.position).addScaledVector(_d.normalize(), 0.1);
    aim(line, _a, pulley);
  });
};

// ───────────────────────────── Benches & stations ─────────────────────────────

/** Parallel dip bars. Params: from, to (bar ends, x), y (bar height), z (half gap). */
const dipBars: ExtraPropBuilder = (p) => {
  const g = new THREE.Group();
  const from = num(p, "from", 130);
  const to = num(p, "to", 215);
  const y = num(p, "y", 125);
  const z = num(p, "z", 27);
  for (const s of [1, -1]) {
    g.add(rod(W(from, y, s * z), W(to, y, s * z), 0.019, chrome));
    g.add(rod(W(from, y, s * z), W(from, 250, s * z), 0.026, frame));
    g.add(rod(W(to - 12, y, s * z), W(to - 12, 250, s * z), 0.026, frame));
    g.add(block(W((from + to - 12) / 2, 248, s * z), [(to - 12 - from) / 100 + 0.1, 0.03, 0.08], frame));
  }
  g.add(rod(W(from, 243, z), W(from, 243, -z), 0.02, frame));
  return owned(g);
};

/**
 * Flat bench running across the view (along z), e.g. for bench dips.
 * Params: x (centre), top, depth (x extent, cm), length (z extent, cm).
 */
const benchAcross: ExtraPropBuilder = (p) => {
  const g = new THREE.Group();
  const x = num(p, "x", 135);
  const top = num(p, "top", 200);
  const depth = num(p, "depth", 28);
  const length = num(p, "length", 120);
  g.add(block(W(x, top + 4), [depth / 100, 0.08, length / 100], pad));
  for (const s of [1, -1]) {
    const z = s * (length / 2 - 10);
    g.add(block(W(x, (top + 8 + 250) / 2, z), [0.05, (250 - top - 8) / 100, 0.05], frame));
    g.add(block(W(x, 248, z), [depth / 100 + 0.06, 0.03, 0.06], frame));
  }
  g.add(block(W(x, 243), [0.05, 0.05, (length - 20) / 100], frame));
  // Free hands on the pad lie flat on it (bench dips, wrist curls).
  return { ...owned(g), supports: [{ from: x - depth / 2, to: x + depth / 2, top, z: 0, width: length }] };
};

/**
 * Bench whose pad inclines toward +x (the way the athlete faces), for
 * chest-supported work. Params: from, to (seat), top, at (hinge x),
 * length (pad length, cm), angle (degrees above horizontal).
 */
const proneBench: ExtraPropBuilder = (p) => {
  const g = new THREE.Group();
  const from = num(p, "from", 110);
  const to = num(p, "to", 150);
  const top = num(p, "top", 200);
  const at = num(p, "at", 145);
  const length = num(p, "length", 85);
  const angle = num(p, "angle", 40);
  const rad = (angle * Math.PI) / 180;
  g.add(block(W((from + to) / 2, top + 4), [(to - from) / 100, 0.08, 0.3], pad));
  const pivot = new THREE.Group();
  pivot.position.copy(W(at, top));
  const back = mesh(new THREE.BoxGeometry(length / 100, 0.08, 0.3), pad);
  back.position.set(length / 200, 0.04, 0);
  pivot.add(back);
  pivot.rotation.z = rad;
  g.add(pivot);
  const strutX = at + length * 0.55 * Math.cos(rad);
  g.add(rod(W(strutX, top - length * 0.55 * Math.sin(rad) + 4), W(strutX + 6, 248), 0.02, frame));
  benchLegs(g, [from + 6], top + 8, 0.34);
  g.add(block(W((from + strutX + 6) / 2, 247), [(strutX + 6 - from) / 100 + 0.06, 0.05, 0.08], frame));
  g.add(block(W(strutX + 6, 248), [0.06, 0.03, 0.34], frame));
  return owned(g);
};

/**
 * Preacher curl bench: seat plus an arm pad sloping down and forward.
 * Params: seatFrom, seatTo, seatTop, padX, padY (top-back edge of the pad),
 * angle (pad slope below horizontal, degrees), length (cm).
 */
const preacher: ExtraPropBuilder = (p) => {
  const g = new THREE.Group();
  const seatFrom = num(p, "seatFrom", 120);
  const seatTo = num(p, "seatTo", 160);
  const seatTop = num(p, "seatTop", 196);
  const padX = num(p, "padX", 180);
  const padY = num(p, "padY", 132);
  const angle = num(p, "angle", 45);
  const length = num(p, "length", 36);
  const rad = (angle * Math.PI) / 180;
  g.add(block(W((seatFrom + seatTo) / 2, seatTop + 4), [(seatTo - seatFrom) / 100, 0.08, 0.32], pad));
  g.add(block(W((seatFrom + seatTo) / 2, (seatTop + 258) / 2), [0.06, (250 - seatTop - 8) / 100, 0.06], frame));
  // Arm pad: a thick slab hanging below the line from its top edge.
  const pivot = new THREE.Group();
  pivot.position.copy(W(padX, padY));
  pivot.rotation.z = -rad;
  const slab = mesh(new THREE.BoxGeometry(length / 100, 0.07, 0.42), pad);
  slab.position.set(length / 200, -0.035, 0);
  pivot.add(slab);
  g.add(pivot);
  // Post from under the pad to the floor, a base, and a rail back to the seat.
  const under = W(padX + (length / 2) * Math.cos(rad) - 6 * Math.sin(rad), padY + (length / 2) * Math.sin(rad) + 6 * Math.cos(rad));
  const foot = new THREE.Vector3(under.x + 0.05, 0.02, 0);
  g.add(rod(under, foot, 0.028, frame));
  g.add(block(new THREE.Vector3(foot.x, 0.015, 0), [0.12, 0.03, 0.5], frame));
  const seatX = W((seatFrom + seatTo) / 2, 0).x;
  g.add(block(new THREE.Vector3((seatX + foot.x) / 2, 0.02, 0), [foot.x - seatX + 0.1, 0.04, 0.08], frame));
  return owned(g);
};

/**
 * Pec deck / rear-delt fly machine: seat, a back (or chest) pad and two
 * swinging arms whose vertical handles follow the hands.
 * Params: seatFrom, seatTo, seatTop, padX (pad surface x), padTop, padBottom,
 * pad ("back" | "chest"), pivotX, pivotY (height of the arm pivots), pivotZ,
 * columnX (upright holding the pad and pivots).
 */
const pecDeck: ExtraPropBuilder = (p) => {
  const g = new THREE.Group();
  const seatFrom = num(p, "seatFrom", 138);
  const seatTo = num(p, "seatTo", 182);
  const seatTop = num(p, "seatTop", 200);
  const chestPad = str(p, "pad", "back") === "chest";
  const padX = num(p, "padX", 137);
  const padTop = num(p, "padTop", 88);
  const padBottom = num(p, "padBottom", 185);
  const pivotX = num(p, "pivotX", 160);
  const pivotY = num(p, "pivotY", 58);
  const pivotZ = num(p, "pivotZ", 24);
  g.add(block(W((seatFrom + seatTo) / 2, seatTop + 4), [(seatTo - seatFrom) / 100, 0.08, 0.36], pad));
  g.add(block(W((seatFrom + seatTo) / 2, (seatTop + 258) / 2), [0.07, (250 - seatTop - 8) / 100, 0.07], frame));
  // Pad on the athlete's back (fly) or chest (rear-delt fly), mounted on the column.
  const padDepth = 8;
  const padCx = chestPad ? padX + padDepth / 2 : padX - padDepth / 2;
  g.add(block(W(padCx, (padTop + padBottom) / 2), [padDepth / 100, (padBottom - padTop) / 100, 0.3], pad));
  const columnX = num(p, "columnX", chestPad ? padX + 60 : padX - 24);
  g.add(block(W(columnX, (pivotY - 12 + 250) / 2), [0.12, (250 - pivotY + 12) / 100, 0.24], frame));
  g.add(block(W(columnX, 248), [0.5, 0.03, 0.6], frame));
  g.add(block(W((columnX + padCx) / 2, (padTop + padBottom) / 2), [Math.abs(columnX - padCx) / 100, 0.06, 0.08], frame));
  const seatMid = (seatFrom + seatTo) / 2;
  g.add(block(W((columnX + seatMid) / 2, 246), [Math.abs(columnX - seatMid) / 100 + 0.08, 0.05, 0.1], frame));
  // Top beam carrying both pivots.
  g.add(block(W((columnX + pivotX) / 2, pivotY - 8), [Math.abs(columnX - pivotX) / 100 + 0.1, 0.07, 0.1], frame));
  g.add(block(W(pivotX, pivotY - 8), [0.1, 0.07, (pivotZ * 2) / 100 + 0.1], frame));
  const arms = [0, 1].map((i) => {
    const pivot = W(pivotX, pivotY, i === 0 ? pivotZ : -pivotZ);
    g.add(rod(pivot, pivot.clone().setY(pivot.y + 0.06), 0.028, chrome));
    const lever = stretchRod(0.018, frame);
    const drop = stretchRod(0.016, frame);
    const handle = rod(new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(0, 0.1, 0), 0.017, iron);
    g.add(lever, drop, handle);
    return { pivot, lever, drop, handle };
  });
  return owned(g, (rig) => {
    arms.forEach((a, i) => {
      grip(rig, i, a.handle.position);
      _b.set(a.handle.position.x, a.pivot.y, a.handle.position.z);
      aim(a.lever, a.pivot, _b);
      _d.copy(a.handle.position).setY(a.handle.position.y + 0.1);
      aim(a.drop, _d, _b);
    });
  });
};

/** Props for the upper-body exercise library, keyed by `kind` (use a "upper:" prefix). */
export const UPPER_PROPS: Record<string, ExtraPropBuilder> = {
  "upper:ez-bar": ezBar,
  "upper:neutral-dumbbells": dumbbells("neutral"),
  "upper:dumbbells": dumbbells("overhand"),
  "upper:bar": straightBar,
  "upper:fixed-bar": fixedBar,
  "upper:landmine": landmine,
  "upper:cable": cable,
  "upper:row-station": rowStation,
  "upper:dip-bars": dipBars,
  "upper:bench-across": benchAcross,
  "upper:prone-bench": proneBench,
  "upper:preacher-bench": preacher,
  "upper:pec-deck": pecDeck,
};
