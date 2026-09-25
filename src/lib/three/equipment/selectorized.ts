import * as THREE from "three";
import { Cable, Kit, Ticker, at, beam, bentTube, block, cyl, damp, mesh, node, v3, wave } from "./helpers";
import type { EquipmentModel } from "./index";
import { stackTower, type Tower } from "./machines";
import { knob, rectPad, roller, rubberFoot } from "./parts";

const Z = v3(0, 0, 1);

/** Floor spine from x0 to x1 with a cross foot at the front. */
function spine(kit: Kit, x0: number, x1: number, z = 0) {
  const { m, root } = kit;
  beam(root, v3(x0, 0.035, z), v3(x1, 0.035, z), 0.1, 0.06, m.frame);
  beam(root, v3(x1 - 0.04, 0.035, z - 0.3), v3(x1 - 0.04, 0.035, z + 0.3), 0.08, 0.06, m.frame);
  for (const s of [1, -1]) rubberFoot(root, x1 - 0.04, z + s * 0.26, 0.03, 0.005);
}

/** Cable from the head plate up into the tower top; returns a setter for the lift. */
function towerCable(kit: Kit, tower: Tower, height: number) {
  const c = new Cable(kit.root);
  const top = tower.head(0).setY(height - 0.1);
  return (lift: number) => {
    tower.lift(lift);
    c.set(tower.head(lift), top);
  };
}

/** Seat pad on an adjustable post with a pop-pin; returns the pin position. */
function seat(kit: Kit, x: number, top: number, len = 0.38, width = 0.36) {
  const { m, root } = kit;
  beam(root, v3(x, 0.06, 0), v3(x, top - 0.11, 0), 0.06, 0.06, m.frame, Z);
  beam(root, v3(x, top - 0.22, 0), v3(x, top - 0.08, 0), 0.075, 0.075, m.frameDark, Z);
  const pin = v3(x + 0.04, top - 0.18, 0);
  at(knob(root), pin.x, pin.y, 0, 0, 0, -Math.PI / 2);
  rectPad(node(root, x, top - 0.082, 0), len, width, 0.066, 0.07);
  return pin.add(v3(0.052, 0, 0));
}

/** Backrest pad whose face points +x, tilted back by `recline`; returns the face centre. */
function backrest(kit: Kit, x: number, y: number, len: number, recline: number, width = 0.34) {
  const g = node(kit.root, x, y, 0);
  g.rotation.z = -(Math.PI / 2 - recline);
  rectPad(g, len, width, 0.07, 0.07);
  const n = v3(Math.cos(recline), Math.sin(recline), 0);
  beam(kit.root, v3(x, y, 0).addScaledVector(n, -0.01), v3(x, y, 0).addScaledVector(n, -0.1), 0.2, 0.3, kit.m.frameDark, Z);
  return v3(x, y, 0).addScaledVector(n, 0.087);
}

// --------------------------------------------------------------- pec deck

export function pecDeck(): EquipmentModel {
  const kit = new Kit("pec-deck");
  const { m, root } = kit;
  const H = 2.0;
  const tower = stackTower(kit, -0.62, 0, H, 15, 6);
  const lift = towerCable(kit, tower, H);
  spine(kit, -0.35, 0.45);
  beam(root, v3(-0.32, 0.06, 0), v3(-0.32, 1.9, 0), 0.1, 0.1, m.frame, Z);
  beam(root, v3(-0.62, 1.93, 0), v3(-0.1, 1.93, 0), 0.12, 0.12, m.frame, undefined, 0.01);
  block(root, -0.13, 1.86, 0, 0.1, 0.06, 0.24, m.frameDark, 0.01);
  seat(kit, 0.05, 0.48);
  backrest(kit, -0.23, 0.98, 0.66, 0.05, 0.3);
  // Swing arms pivot on vertical axes above the shoulders.
  const arms = [1, -1].map((s) => {
    const a = kit.part(root, -0.13, 1.84, s * 0.07);
    mesh(cyl(0.07, 0.03, 24), m.aluminium, a);
    beam(a, v3(0, 0, 0), v3(0.52, 0, 0), 0.05, 0.05, m.frame);
    beam(a, v3(0.5, 0.02, 0), v3(0.5, -0.56, 0), 0.05, 0.05, m.frame, v3(1, 0, 0));
    at(mesh(cyl(0.021, 0.2, 16), m.grip, a), 0.5, -0.66, 0);
    at(mesh(cyl(0.025, 0.012, 16), m.plastic, a), 0.5, -0.765, 0);
    a.userData.side = s;
    return a;
  });
  const pose = (k: number) => {
    for (const a of arms) a.rotation.y = -(a.userData.side as number) * (1.72 + (0.14 - 1.72) * k);
    lift(0.36 * k);
  };
  pose(0);
  kit.spot("arms", v3(0.3, 0.026, 0), arms[0]);
  kit.spot("handles", v3(0.522, -0.62, 0), arms[0]);
  kit.spot("seat", v3(0.08, 0.482, 0.05));
  kit.spot("weight-stack", tower.stack.face.clone().add(tower.base));
  const tick = new Ticker();
  let k = 0;
  return kit.finish((time, active) => {
    k = damp(k, active ? wave(time, 3.2) : 0, 6, tick.dt(time));
    pose(k);
  });
}

// ---------------------------------------------------------- seated cable row

export function seatedCableRow(): EquipmentModel {
  const kit = new Kit("seated-cable-row");
  const { m, root } = kit;
  const H = 1.9;
  const tower = stackTower(kit, -0.95, 0, H, 15, 7);
  const lift = towerCable(kit, tower, H);
  spine(kit, -0.66, 0.78);
  // Low pulley on a bracket at the tower front.
  const r = 0.045;
  const py = 0.5;
  beam(root, v3(-0.9, py + 0.08, 0), v3(-0.76, py + 0.08, 0), 0.05, 0.05, m.frame);
  lowPulley(kit, v3(-0.76, py, 0), r);
  // Angled footplate with heel lip.
  const fp = node(root, -0.5, 0.3, 0);
  fp.rotation.z = 0.35;
  block(fp, 0, 0, 0, 0.022, 0.4, 0.5, m.frameDark, 0.006);
  block(fp, 0.014, 0.02, 0, 0.006, 0.34, 0.46, m.grip, 0.003);
  block(fp, 0.035, -0.19, 0, 0.06, 0.03, 0.5, m.frameDark, 0.006);
  beam(root, v3(-0.45, 0.06, 0), v3(-0.5, 0.25, 0), 0.08, 0.06, m.frame, Z);
  // Long seat on two posts.
  for (const x of [0.05, 0.5]) beam(root, v3(x, 0.06, 0), v3(x, 0.36, 0), 0.07, 0.07, m.frame, Z);
  block(root, 0.27, 0.37, 0, 0.62, 0.02, 0.2, m.frameDark, 0.004);
  rectPad(node(root, 0.27, 0.38, 0), 0.64, 0.34, 0.07, 0.07);
  // Double-D row handle on the cable.
  const handle = kit.part(root);
  mesh(new THREE.TorusGeometry(0.014, 0.004, 8, 16), m.steel, handle).rotation.y = Math.PI / 2;
  for (const s of [1, -1]) {
    mesh(bentTube([v3(0.015, 0, s * 0.008), v3(0.12, 0.055, s * 0.055), v3(0.12, -0.075, s * 0.055), v3(0.015, 0, s * 0.008)], 0.006, 0.02, 8), m.chrome, handle);
    at(mesh(cyl(0.018, 0.1, 16), m.grip, handle), 0.12, -0.01, s * 0.055);
  }
  const cable = new Cable(root);
  const restX = -0.6;
  const pose = (x: number, y: number) => {
    handle.position.set(x, y, 0);
    cable.set(v3(-0.76 + r * 0.2, py, 0), v3(x, y, 0));
    lift(Math.max(0, (x - restX) * 0.5));
  };
  pose(restX, py);
  kit.spot("handle", v3(0.12, 0.058, 0.055), handle);
  kit.spot("footplate", v3(-0.5 + 0.02, 0.36, 0.12));
  kit.spot("seat", v3(0.3, 0.467, 0));
  kit.spot("weight-stack", tower.stack.face.clone().add(tower.base));
  const tick = new Ticker();
  let x = restX;
  let y = py;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    const k = wave(time, 3);
    x = damp(x, active ? -0.45 + 0.67 * k : restX, 6, dt);
    y = damp(y, active ? py + 0.06 * k : py, 6, dt);
    pose(x, y);
  });
}

/** Low pulley between two cheek plates, axle along z. */
function lowPulley(kit: Kit, p: THREE.Vector3, r: number) {
  const { m, root } = kit;
  const g = node(root, p.x, p.y, p.z);
  for (const s of [1, -1]) block(g, 0, 0.03, s * 0.02, 0.1, 0.12, 0.006, m.frameDark, 0.003);
  at(mesh(cyl(r, 0.024, 24), m.aluminium, g), 0, 0, 0, Math.PI / 2);
  at(mesh(cyl(0.01, 0.06, 10), m.steel, g), 0, 0, 0, Math.PI / 2);
  return g;
}

// ------------------------------------------------------ seated press machines

interface PressOptions {
  name: string;
  pivot: THREE.Vector2;
  handle: THREE.Vector2;
  sweep: number;
  seatTop: number;
  back: { x: number; y: number; len: number; recline: number };
  stackSide: boolean;
}

/** Chest / shoulder press: converging lever arms on an overhead axle. */
function seatedPress(o: PressOptions): EquipmentModel {
  const kit = new Kit(o.name);
  const { m, root } = kit;
  const H = 1.85;
  const tower = o.stackSide ? stackTower(kit, -0.3, -0.72, H, 15, 6) : stackTower(kit, -0.85, 0, H, 15, 6);
  const lift = towerCable(kit, tower, H);
  spine(kit, o.stackSide ? -0.55 : -0.6, 0.55);
  const colX = Math.max(o.pivot.x - 0.02, -0.5);
  beam(root, v3(colX, 0.06, 0), v3(colX, o.pivot.y + 0.08, 0), 0.1, 0.1, m.frame, Z);
  beam(root, v3(o.pivot.x, o.pivot.y + 0.06, -0.12), v3(o.pivot.x, o.pivot.y + 0.06, 0.12), 0.1, 0.1, m.frameDark, undefined, 0.01);
  const seatPin = seat(kit, 0.02, o.seatTop);
  const backFace = backrest(kit, o.back.x, o.back.y, o.back.len, o.back.recline);
  const arms = kit.part(root, o.pivot.x, o.pivot.y, 0);
  at(mesh(cyl(0.03, 0.8, 20), m.steel, arms), 0, 0, 0, Math.PI / 2);
  const d = o.handle.clone().sub(o.pivot);
  for (const s of [1, -1]) {
    at(mesh(cyl(0.07, 0.04, 24), m.frameDark, arms), 0, 0, s * 0.36, Math.PI / 2);
    beam(arms, v3(0, 0, s * 0.36), v3(d.x, d.y, s * 0.36), 0.05, 0.045, m.frame, Z);
    at(mesh(cyl(0.021, 0.15, 16), m.grip, arms), d.x, d.y, s * 0.27, Math.PI / 2);
    at(mesh(cyl(0.024, 0.012, 16), m.plastic, arms), d.x, d.y, s * 0.19, Math.PI / 2);
    at(mesh(cyl(0.021, 0.13, 16), m.grip, arms), d.x + 0.05, d.y - 0.07, s * 0.39, 0, 0, 0.35);
  }
  const pose = (k: number) => {
    arms.rotation.z = o.sweep * k;
    lift(0.4 * k);
  };
  pose(0);
  kit.spot("handles", v3(d.x, d.y + 0.022, 0.27), arms);
  kit.spot("backrest", backFace.clone().add(v3(0, 0.06, 0)));
  kit.spot("seat", seatPin);
  kit.spot("weight-stack", tower.stack.face.clone().add(tower.base));
  const tick = new Ticker();
  let k = 0;
  return kit.finish((time, active) => {
    k = damp(k, active ? wave(time, 3) : 0, 6, tick.dt(time));
    pose(k);
  });
}

export function chestPressMachine(): EquipmentModel {
  return seatedPress({
    name: "chest-press-machine",
    pivot: new THREE.Vector2(-0.28, 1.72),
    handle: new THREE.Vector2(0.24, 1.08),
    sweep: 0.42,
    seatTop: 0.5,
    back: { x: -0.2, y: 0.95, len: 0.66, recline: 0.14 },
    stackSide: false,
  });
}

export function shoulderPressMachine(): EquipmentModel {
  return seatedPress({
    name: "shoulder-press-machine",
    pivot: new THREE.Vector2(-0.62, 1.32),
    handle: new THREE.Vector2(0.06, 1.42),
    sweep: 0.62,
    seatTop: 0.48,
    back: { x: -0.2, y: 0.98, len: 0.72, recline: 0.1 },
    stackSide: true,
  });
}

// ------------------------------------------------------------ seated leg curl

export function seatedLegCurl(): EquipmentModel {
  const kit = new Kit("seated-leg-curl");
  const { m, root } = kit;
  const H = 1.6;
  const tower = stackTower(kit, -0.75, 0, H, 14, 6);
  const lift = towerCable(kit, tower, H);
  spine(kit, -0.5, 0.95);
  seat(kit, 0.03, 0.5, 0.44, 0.38);
  backrest(kit, -0.28, 0.88, 0.58, 0.26);
  // Pivot housing on the user's right with the knee-alignment dot.
  const P = v3(0.32, 0.53, 0);
  const hz = 0.3;
  beam(root, v3(P.x, 0.06, hz), v3(P.x, P.y - 0.04, hz), 0.08, 0.08, m.frame, Z);
  beam(root, v3(P.x, 0.035, 0), v3(P.x, 0.035, hz + 0.04), 0.08, 0.06, m.frame);
  at(mesh(cyl(0.075, 0.08, 32), m.frameDark, root), P.x, P.y, hz, Math.PI / 2);
  at(mesh(cyl(0.065, 0.012, 32), m.steel, root), P.x, P.y, hz + 0.046, Math.PI / 2);
  const dot = at(mesh(cyl(0.016, 0.006, 20), m.accent, root), P.x, P.y, hz + 0.054, Math.PI / 2);
  // Thigh hold-down pad on an arm over the knees.
  beam(root, v3(P.x - 0.05, P.y, hz), v3(0.2, 0.8, hz), 0.05, 0.05, m.frame);
  beam(root, v3(0.2, 0.8, hz), v3(0.2, 0.8, -0.05), 0.04, 0.04, m.steel);
  const thigh = node(root, 0.2, 0.79, 0.04);
  thigh.rotation.x = Math.PI;
  rectPad(thigh, 0.2, 0.38, 0.07, 0.06);
  at(knob(root), 0.2, 0.84, hz, 0, 0, 0);
  // Lever with the ankle roller.
  const lever = kit.part(root, P.x, P.y, 0);
  const armZ = 0.235;
  at(mesh(cyl(0.05, 0.03, 24), m.frameDark, lever), 0, 0, armZ, Math.PI / 2);
  beam(lever, v3(-0.03, 0, armZ), v3(0.47, 0, armZ), 0.05, 0.035, m.frame, Z);
  at(mesh(cyl(0.014, 0.44, 14), m.steel, lever), 0.44, -0.03, 0.02, Math.PI / 2);
  roller(node(lever, 0.44, -0.03, 0.01), 0.055, 0.38);
  const rest = -0.1;
  const pose = (a: number) => {
    lever.rotation.z = a;
    lift((rest - a) * 0.22);
  };
  pose(rest);
  kit.spot("thigh-pad", v3(0.3, 0.8, 0.12));
  kit.spot("ankle-pad", v3(0.44, 0.027, 0.1), lever);
  kit.spot("pivot", dot.position.clone().add(v3(0, 0, 0.004)));
  kit.spot("weight-stack", tower.stack.face.clone().add(tower.base));
  const tick = new Ticker();
  let a = rest;
  return kit.finish((time, active) => {
    a = damp(a, active ? rest - 1.35 * wave(time, 3) : rest, 6, tick.dt(time));
    pose(a);
  });
}

// ------------------------------------------------------------- hip abduction

export function hipAbduction(): EquipmentModel {
  const kit = new Kit("hip-abduction");
  const { m, root } = kit;
  const H = 1.6;
  const tower = stackTower(kit, -0.78, 0, H, 14, 6);
  const lift = towerCable(kit, tower, H);
  spine(kit, -0.52, 0.85);
  seat(kit, -0.05, 0.5, 0.4, 0.4);
  backrest(kit, -0.3, 0.86, 0.6, 0.4);
  // Range lever beside the seat.
  const lever = v3(0.08, 0.5, 0.3);
  beam(root, v3(0.0, 0.3, 0.22), lever, 0.03, 0.03, m.frame);
  at(knob(root, 0.02), lever.x, lever.y, lever.z, 0, 0, -0.4);
  // Leg arms pivot on vertical axes in front of the seat.
  const arms = [1, -1].map((s) => {
    const a = kit.part(root, 0.14, 0.42, s * 0.1);
    mesh(cyl(0.04, 0.06, 20), m.frameDark, a);
    beam(a, v3(0, 0, 0), v3(0.6, 0, 0), 0.05, 0.05, m.frame);
    beam(a, v3(0.3, 0, 0), v3(0.3, 0.12, s * 0.02), 0.04, 0.04, m.frame, Z);
    const pad = node(a, 0.3, 0.12, s * 0.07);
    pad.rotation.x = -s * (Math.PI / 2);
    rectPad(pad, 0.28, 0.2, 0.06, 0.05);
    const calf = node(a, 0.52, 0.02, -s * 0.02);
    rectPad(calf, 0.22, 0.14, 0.05, 0.04);
    beam(a, v3(0.62, 0.02, -s * 0.06), v3(0.62, 0.14, -s * 0.06), 0.03, 0.03, m.steel, Z);
    a.userData.side = s;
    return a;
  });
  const pose = (open: number) => {
    for (const a of arms) a.rotation.y = -(a.userData.side as number) * open;
    lift(open * 0.55);
  };
  pose(0);
  kit.spot("thigh-pads", v3(0.3, 0.225, 0.045), arms[0]);
  kit.spot("range-lever", lever.clone().add(v3(0.02, 0.05, 0)));
  kit.spot("seat", v3(0.0, 0.502, -0.08));
  kit.spot("weight-stack", tower.stack.face.clone().add(tower.base));
  const tick = new Ticker();
  let open = 0;
  return kit.finish((time, active) => {
    open = damp(open, active ? 0.55 * wave(time, 2.8) : 0, 6, tick.dt(time));
    pose(open);
  });
}

// ---------------------------------------------------------- assisted pull-up

export function assistedPullUp(): EquipmentModel {
  const kit = new Kit("assisted-pull-up");
  const { m, root } = kit;
  const H = 2.1;
  const tower = stackTower(kit, -0.75, 0, H, 14, 6);
  const lift = towerCable(kit, tower, H);
  const ux = 0.02;
  const uz = 0.38;
  for (const s of [1, -1]) {
    beam(root, v3(-0.9, 0.035, s * uz), v3(0.45, 0.035, s * uz), 0.08, 0.06, m.frame);
    for (const x of [-0.85, 0.4]) rubberFoot(root, x, s * uz, 0.03, 0.005);
    beam(root, v3(ux, 0.06, s * uz), v3(ux, 2.35, s * uz), 0.08, 0.08, m.frame, Z, 0.006);
    beam(root, v3(ux, 2.31, s * uz), v3(-0.75, 2.31, s * 0.22), 0.07, 0.07, m.frame);
    // Dip handles.
    beam(root, v3(ux, 1.25, s * uz), v3(0.12, 1.25, s * 0.28), 0.05, 0.05, m.frame);
    mesh(bentTube([v3(0.1, 1.25, s * 0.28), v3(0.45, 1.25, s * 0.28)], 0.017, 0), m.chrome, root);
    at(mesh(cyl(0.021, 0.2, 16), m.grip, root), 0.34, 1.25, s * 0.28, 0, 0, Math.PI / 2);
    // Pull-up grips: wide angled grip and a neutral grip.
    mesh(bentTube([v3(ux, 2.3, s * uz), v3(0.2, 2.28, s * 0.45), v3(0.38, 2.2, s * 0.55)], 0.016, 0.06), m.chrome, root);
    const a = v3(0.24, 2.26, s * 0.47);
    const b = v3(0.38, 2.2, s * 0.55);
    const g = mesh(cyl(0.021, a.distanceTo(b), 16), m.grip, root);
    g.position.copy(a).add(b).multiplyScalar(0.5);
    g.quaternion.setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize());
    mesh(bentTube([v3(ux, 2.26, s * 0.24), v3(0.3, 2.26, s * 0.24)], 0.016, 0), m.chrome, root);
    at(mesh(cyl(0.021, 0.14, 16), m.grip, root), 0.22, 2.26, s * 0.24, 0, 0, Math.PI / 2);
    // Steps to climb on.
    block(root, 0.22, 0.42, s * 0.28, 0.2, 0.03, 0.16, m.frameDark, 0.006);
    block(root, 0.22, 0.437, s * 0.28, 0.18, 0.006, 0.14, m.grip, 0.002);
    beam(root, v3(ux, 0.42, s * uz), v3(0.13, 0.42, s * 0.28), 0.04, 0.04, m.frame);
  }
  beam(root, v3(ux, 2.31, -uz), v3(ux, 2.31, uz), 0.08, 0.08, m.frame);
  beam(root, v3(ux, 0.3, -uz), v3(ux, 0.3, uz), 0.06, 0.06, m.frame);
  // Knee platform on a lever pushed up by the counterweight.
  const lever = kit.part(root, -0.38, 0.62, 0);
  at(mesh(cyl(0.04, 0.2, 20), m.frameDark, lever), 0, 0, 0, Math.PI / 2);
  beam(lever, v3(0, 0, 0), v3(0.6, 0.18, 0), 0.08, 0.05, m.frame);
  const knee = node(lever, 0.6, 0.2, 0);
  rectPad(knee, 0.34, 0.4, 0.07, 0.06);
  const pose = (a: number) => {
    lever.rotation.z = a;
    lift(-a * 0.7);
  };
  pose(0);
  kit.spot("knee-pad", v3(0.62, 0.288, 0.08), lever);
  kit.spot("grips", v3(0.31, 2.253, 0.51));
  kit.spot("dip-handles", v3(0.34, 1.272, 0.28));
  kit.spot("weight-stack", tower.stack.face.clone().add(tower.base));
  const tick = new Ticker();
  let a = 0;
  return kit.finish((time, active) => {
    a = damp(a, active ? -0.55 * wave(time, 3.4) : 0, 6, tick.dt(time));
    pose(a);
  });
}
