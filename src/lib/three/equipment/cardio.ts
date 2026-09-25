import * as THREE from "three";
import {
  Cable,
  Kit,
  TAU,
  Ticker,
  at,
  beam,
  bentTube,
  block,
  circlePath,
  cyl,
  damp,
  decal,
  extrude,
  lathe,
  mesh,
  node,
  roundedPolygon,
  roundedRect,
  settleAngle,
  smooth,
  v3,
} from "./helpers";
import type { EquipmentModel } from "./index";
import { BRAND, beltTexture, screenTexture, textLabel, type ScreenKind } from "./materials";
import { knob, rubberFoot, wheel } from "./parts";

const Z = v3(0, 0, 1);

/** Per-model emissive display (its brightness is animated). */
export function screen(kit: Kit, kind: ScreenKind, lcd = false) {
  const map = screenTexture(kind);
  return kit.own(
    new THREE.MeshStandardMaterial({
      color: lcd ? 0xffffff : 0x000000,
      map: lcd ? map : null,
      emissive: 0xffffff,
      emissiveMap: map,
      emissiveIntensity: lcd ? 0.25 : 1,
      roughness: 0.25,
      metalness: 0,
    }),
  );
}

// ---------------------------------------------------------------- treadmill

export function treadmill(): EquipmentModel {
  const kit = new Kit("treadmill");
  const { m, root } = kit;
  const deckY = 0.222;
  const beltW = 0.56;
  const x0 = -0.72;
  const x1 = 0.96;

  // Belt: a scrolling textured strip over a dark deck.
  const tex = kit.own(beltTexture().clone());
  tex.needsUpdate = true;
  const loop = 3.3;
  tex.repeat.set(1, 1);
  const beltMat = kit.own(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, bumpMap: tex, bumpScale: 0.6 }));
  const beltGeo = new THREE.PlaneGeometry(beltW, x1 - x0);
  const uv = beltGeo.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, (uv.getY(i) * (x1 - x0)) / loop);
  beltGeo.rotateX(-Math.PI / 2).rotateY(Math.PI / 2);
  const belt = mesh(beltGeo, beltMat, root);
  belt.position.set((x0 + x1) / 2, deckY, 0);
  belt.userData.keep = true;
  block(root, (x0 + x1) / 2, 0.19, 0, x1 - x0 + 0.04, 0.06, beltW + 0.04, m.board, 0.01);
  for (const x of [x0, x1]) {
    const roller = mesh(cyl(0.03, beltW, 24), m.board, root);
    at(roller, x, deckY - 0.03, 0, Math.PI / 2);
  }
  // Frame under the deck and aluminium side rails with grip strips.
  block(root, 0.1, 0.1, 0, 1.8, 0.1, 0.62, m.frameDark, 0.01);
  for (const s of [1, -1]) {
    const z = s * 0.35;
    beam(root, v3(x0 - 0.02, 0.19, z), v3(x1 + 0.01, 0.19, z), 0.12, 0.09, m.aluminium, undefined, 0.02);
    beam(root, v3(x0 + 0.02, 0.236, z), v3(x1 - 0.03, 0.236, z), 0.09, 0.006, m.rubber, undefined, 0.002);
    for (const x of [-0.85, 0.98]) rubberFoot(root, x, s * 0.3, 0.03, 0.02);
  }
  // Rear end cap and motor hood.
  const cap = mesh(extrude(roundedRect(0.1, 0.12, 0.04), 0.84, 0.01, 6, 2), m.plastic, root);
  cap.position.set(x1 + 0.05, 0.16, 0);
  const hood = mesh(
    extrude(roundedPolygon([[-1.0, 0.04], [-0.69, 0.04], [-0.69, 0.25], [-0.78, 0.33], [-0.95, 0.33], [-1.0, 0.26]], [0.02, 0.02, 0.03, 0.06, 0.06, 0.03]), 0.82, 0.02, 8, 3),
    m.plastic,
    root,
  );
  hood.position.z = 0;
  const stripe = block(root, -0.8, 0.351, 0, 0.018, 0.004, 0.7, m.accent, 0.001);
  stripe.castShadow = false;
  const logo = decal(root, textLabel(BRAND, "#e4e4e7", 512, 96, "bold italic 70px sans-serif"), 0.28, 0.052);
  logo.position.set(-0.721, 0.306, 0);
  logo.rotation.set(0, Math.PI / 2, 0.84, "ZYX");

  // Uprights up to the console.
  for (const s of [1, -1]) {
    beam(root, v3(-0.87, 0.25, s * 0.4), v3(-0.76, 1.2, s * 0.4), 0.06, 0.1, m.frame, v3(1, 0, 0), 0.02);
    const fairing = mesh(extrude(roundedRect(0.16, 0.12, 0.05), 0.08, 0.01, 6, 2), m.plastic, root);
    fairing.position.set(-0.86, 0.32, s * 0.4);
  }

  // Console, tilted towards the runner.
  const console_ = node(root, -0.74, 1.3, 0);
  console_.rotation.z = 0.42;
  block(console_, -0.02, 0, 0, 0.12, 0.32, 0.9, m.plastic, 0.04);
  block(console_, 0.035, 0.005, 0, 0.012, 0.25, 0.44, m.glass, 0.01);
  const screenMat = screen(kit, "treadmill");
  const scr = mesh(new THREE.PlaneGeometry(0.4, 0.225), screenMat, console_);
  at(scr, 0.0425, 0.005, 0, 0, Math.PI / 2, 0);
  scr.castShadow = false;
  for (const s of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      block(console_, 0.04, 0.08 - i * 0.07, s * 0.29, 0.012, 0.045, 0.07, i === 1 ? m.plasticLight : m.accent, 0.008);
    }
    block(console_, 0.02, -0.08, s * 0.4, 0.1, 0.1, 0.09, m.plasticLight, 0.02);
  }
  for (let i = 0; i < 6; i++) block(console_, 0.04, -0.13, -0.15 + i * 0.06, 0.01, 0.025, 0.045, m.plasticLight, 0.006);
  // Safety key with its coiled lanyard and clip.
  const key = node(console_, 0.04, -0.11, 0.2);
  mesh(cyl(0.028, 0.01, 24), m.accent, key).rotation.z = Math.PI / 2;
  const puck = mesh(cyl(0.022, 0.022, 24), m.red, key);
  at(puck, 0.015, 0, 0, 0, 0, Math.PI / 2);
  const coil: THREE.Vector3[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const a = t * TAU * 11;
    coil.push(v3(0.03 + Math.cos(a) * 0.012 + t * 0.04, -0.02 - t * 0.2, Math.sin(a) * 0.012));
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 240, 0.0025, 6), m.red, key);
  block(key, 0.07, -0.24, 0, 0.02, 0.04, 0.012, m.plastic, 0.004);
  const led = kit.own(new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x22c55e, emissiveIntensity: 0 }));
  const ledMesh = mesh(new THREE.SphereGeometry(0.006, 10, 8), led, console_);
  ledMesh.position.set(0.04, 0.14, -0.2);

  // Side handrails with pulse grips, and a front bar under the console.
  for (const s of [1, -1]) {
    const z = s * 0.45;
    mesh(bentTube([v3(-0.8, 1.16, s * 0.42), v3(-0.66, 1.03, z), v3(-0.26, 1.03, z), v3(-0.22, 0.97, z)], 0.019, 0.07), m.frame, root);
    const grip = mesh(cyl(0.023, 0.16, 20), m.chrome, root);
    at(grip, -0.5, 1.03, z, 0, 0, Math.PI / 2);
  }
  mesh(bentTube([v3(-0.8, 1.08, 0.42), v3(-0.66, 1.08, 0.3), v3(-0.66, 1.08, -0.3), v3(-0.8, 1.08, -0.42)], 0.016, 0.06), m.grip, root);

  kit.spot("belt", v3(0.25, deckY + 0.001, 0));
  kit.spot("console", v3(0.045, 0.06, -0.05), console_);
  kit.spot("safety-key", v3(0.03, 0.025, 0), key);
  kit.spot("handrails", v3(-0.4, 1.052, 0.45));

  const tick = new Ticker();
  let speed = 0;
  let on = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    speed = damp(speed, active ? 2.4 : 0, 1.5, dt);
    on = damp(on, active ? 1 : 0, 3, dt);
    tex.offset.y = (tex.offset.y + (speed * dt) / loop) % 1;
    screenMat.emissiveIntensity = 0.3 + 0.75 * on;
    led.emissiveIntensity = active ? (Math.sin(time * TAU) > 0 ? 2.5 : 0.2) : 0;
  });
}

// ----------------------------------------------------------- rowing machine

export function rowingMachine(): EquipmentModel {
  const kit = new Kit("rowing-machine");
  const { m, root } = kit;
  const F = v3(-0.98, 0.5, 0);
  const R = 0.27;
  const railTop = 0.34;

  // Flywheel cage: open rim, vented side covers, spinning fan inside.
  const rim = mesh(cyl(R, 0.2, 48, R, true), m.plastic, root);
  at(rim, F.x, F.y, 0, Math.PI / 2);
  const inner = mesh(cyl(R - 0.004, 0.2, 48, R - 0.004, true), m.board, root);
  at(inner, F.x, F.y, 0, Math.PI / 2);
  inner.material = kit.own(new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.8, side: THREE.BackSide }));
  for (const s of [1, -1]) {
    const cover = mesh(new THREE.CircleGeometry(R, 48), m.fanCage, root);
    at(cover, F.x, F.y, s * 0.1, 0, s > 0 ? 0 : Math.PI, 0);
    const ring = mesh(new THREE.TorusGeometry(R, 0.012, 10, 48), m.plastic, root);
    ring.position.set(F.x, F.y, s * 0.1);
    const hubCap = mesh(cyl(0.05, 0.02, 24), m.plasticLight, root);
    at(hubCap, F.x, F.y, s * 0.105, Math.PI / 2);
  }
  const fan = kit.part(root, F.x, F.y, 0);
  mesh(cyl(0.045, 0.17, 20), m.steel, fan).rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    const blade = block(fan, 0, 0.15, 0, 0.012, 0.2, 0.16, m.plasticLight, 0.004);
    const a = (i / 10) * TAU;
    blade.position.set(Math.sin(a) * 0.15, Math.cos(a) * 0.15, 0);
    blade.rotation.z = -a;
  }
  const damper = mesh(extrude(roundedRect(0.1, 0.022, 0.011), 0.01, 0.002, 4, 1), m.accent, root);
  at(damper, F.x - 0.14, F.y + 0.18, 0.11, 0, 0, 0.9);

  // Front stand, transport wheels, and the frame joining the monorail.
  beam(root, v3(-1.12, 0.035, -0.26), v3(-1.12, 0.035, 0.26), 0.07, 0.05, m.frameDark);
  for (const s of [1, -1]) at(wheel(root, 0.035, 0.03), -1.17, 0.036, s * 0.22);
  beam(root, v3(-1.1, 0.06, 0), v3(-1.02, F.y - R + 0.02, 0), 0.06, 0.08, m.frameDark);
  beam(root, v3(F.x + 0.12, F.y - R + 0.05, 0), v3(-0.7, railTop - 0.04, 0), 0.07, 0.07, m.frameDark);

  // Monorail: aluminium I-beam with a steel track on top.
  const iShape = roundedPolygon(
    [
      [-0.0375, 0],
      [0.0375, 0],
      [0.0375, 0.01],
      [0.006, 0.01],
      [0.006, 0.05],
      [0.0375, 0.05],
      [0.0375, 0.06],
      [-0.0375, 0.06],
      [-0.0375, 0.05],
      [-0.006, 0.05],
      [-0.006, 0.01],
      [-0.0375, 0.01],
    ],
    0.002,
  );
  const railLen = 1.86;
  const rail = mesh(extrude(iShape, railLen, 0, 2), m.aluminium, root);
  at(rail, -0.72 + railLen / 2, railTop - 0.06, 0, 0, Math.PI / 2, 0);
  block(root, -0.72 + railLen / 2, railTop + 0.002, 0, railLen - 0.04, 0.004, 0.03, m.steel, 0.001);
  block(root, -0.72, railTop - 0.035, 0, 0.1, 0.1, 0.1, m.frameDark, 0.01);
  block(root, 1.13, railTop - 0.03, 0, 0.06, 0.07, 0.09, m.frameDark, 0.01);
  beam(root, v3(1.13, railTop - 0.06, 0), v3(1.13, 0.06, 0), 0.05, 0.05, m.frameDark, Z);
  beam(root, v3(1.13, 0.035, -0.22), v3(1.13, 0.035, 0.22), 0.07, 0.05, m.frameDark);
  for (const s of [1, -1]) rubberFoot(root, 1.13, s * 0.19, 0.028, 0.01);

  // Footplates with heel cups and straps.
  const foot = node(root, -0.6, 0.3, 0);
  foot.rotation.z = 0.8;
  block(root, -0.62, 0.2, 0, 0.12, 0.08, 0.36, m.frameDark, 0.01);
  for (const s of [1, -1]) {
    const z = s * 0.1;
    block(foot, 0, 0, z, 0.02, 0.3, 0.13, m.plastic, 0.01);
    block(foot, 0.012, 0, z, 0.006, 0.26, 0.11, m.grip, 0.003);
    block(foot, 0.035, -0.12, z, 0.06, 0.035, 0.13, m.plastic, 0.012);
    block(foot, 0.05, 0.03, z, 0.012, 0.05, 0.13, m.welt, 0.004);
  }

  // Monitor on its arm.
  mesh(bentTube([v3(F.x + 0.05, F.y + R - 0.02, 0), v3(F.x + 0.12, F.y + R + 0.2, 0), v3(-0.72, 1.02, 0)], 0.016, 0.1), m.plastic, root);
  const monitor = node(root, -0.7, 1.05, 0);
  monitor.rotation.z = 0.3;
  block(monitor, 0, 0, 0, 0.05, 0.22, 0.2, m.plastic, 0.015);
  const lcdMat = screen(kit, "rower", true);
  const lcd = mesh(new THREE.PlaneGeometry(0.15, 0.1), lcdMat, monitor);
  at(lcd, 0.0255, 0.03, 0, 0, Math.PI / 2, 0);
  lcd.castShadow = false;
  for (let i = 0; i < 5; i++) block(monitor, 0.026, -0.06, -0.064 + i * 0.032, 0.006, 0.014, 0.022, m.plasticLight, 0.004);

  // Sliding seat on rollers.
  const seat = kit.part(root, 0.1, railTop, 0);
  for (const dx of [-0.07, 0.07]) {
    const r = mesh(cyl(0.018, 0.1, 16), m.plasticLight, seat);
    at(r, dx, 0.02, 0, Math.PI / 2);
  }
  block(seat, 0, 0.045, 0, 0.2, 0.02, 0.14, m.frameDark, 0.006);
  const seatShape = roundedPolygon([[-0.14, -0.1], [0.12, -0.15], [0.14, 0], [0.12, 0.15], [-0.14, 0.1]], [0.05, 0.06, 0.08, 0.06, 0.05]);
  const cushion = mesh(extrude(seatShape, 0.02, 0.016, 8, 3), m.pad, seat);
  at(cushion, 0, 0.078, 0, -Math.PI / 2);

  // Handle on its chain.
  const handle = kit.part(root);
  mesh(bentTube([v3(0, 0, -0.28), v3(0, 0, -0.07), v3(-0.025, 0, 0), v3(0, 0, 0.07), v3(0, 0, 0.28)], 0.011, 0.04), m.chrome, handle);
  for (const s of [1, -1]) {
    const g = mesh(cyl(0.018, 0.14, 16), m.grip, handle);
    at(g, 0, 0, s * 0.2, Math.PI / 2);
  }
  const chain = new Cable(root, 0.005, m.steel);
  const exit = v3(F.x + 0.2, F.y - 0.04, 0);
  block(root, exit.x - 0.02, exit.y, 0, 0.05, 0.05, 0.06, m.plastic, 0.01);

  const catchSeat = -0.18;
  const finishSeat = 0.44;
  const catchHandle = v3(-0.64, 0.56, 0);
  const finishHandle = v3(0.2, 0.74, 0);
  const restHandle = v3(-0.7, 0.62, 0);
  const restSeat = 0.1;
  const target = { seat: restSeat, handle: restHandle.clone(), drive: 0 };
  const cur = { seat: restSeat, handle: restHandle.clone() };
  const pose = () => {
    seat.position.x = cur.seat;
    handle.position.copy(cur.handle);
    chain.set(exit, cur.handle.clone().add(v3(-0.028, 0, 0)));
  };
  pose();

  kit.spot("handle", v3(0, 0.019, 0.2), handle);
  kit.spot("seat", v3(0, 0.113, 0), seat);
  kit.spot("footplates", v3(-0.6 + 0.02, 0.33, 0.1));
  kit.spot("flywheel", v3(F.x + 0.12, F.y + 0.08, 0.104));
  kit.spot("rail", v3(0.75, railTop + 0.005, 0.02));

  const tick = new Ticker();
  let angle = 0;
  let omega = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    if (active) {
      // Drive (legs, then arms) over 40% of the stroke, recovery (arms first) over 60%.
      const p = (time / 2.6) % 1;
      if (p < 0.4) {
        const d = p / 0.4;
        target.seat = catchSeat + (finishSeat - catchSeat) * smooth(d / 0.75);
        target.handle.lerpVectors(catchHandle, finishHandle, smooth(d));
        target.drive = 1;
      } else {
        const r = (p - 0.4) / 0.6;
        target.handle.lerpVectors(finishHandle, catchHandle, smooth(r / 0.55));
        target.seat = finishSeat + (catchSeat - finishSeat) * smooth((r - 0.25) / 0.75);
        target.drive = 0;
      }
    } else {
      target.seat = restSeat;
      target.handle.copy(restHandle);
      target.drive = 0;
    }
    const k = active ? 14 : 3;
    cur.seat = damp(cur.seat, target.seat, k, dt);
    cur.handle.x = damp(cur.handle.x, target.handle.x, k, dt);
    cur.handle.y = damp(cur.handle.y, target.handle.y, k, dt);
    omega = damp(omega, active ? 9 + 9 * target.drive : 0, target.drive ? 4 : 1.2, dt);
    angle += omega * dt;
    if (!active && omega < 0.3) angle = settleAngle(angle, 1, dt);
    fan.rotation.z = -angle;
    pose();
  });
}

// ------------------------------------------------------------ exercise bike

/** Convex hull of two circles as a shape (chain guard outline). */
export function capsuleHull(a: THREE.Vector2, ra: number, b: THREE.Vector2, rb: number) {
  const pts: THREE.Vector2[] = [];
  for (const [c, r] of [[a, ra], [b, rb]] as const) {
    for (let i = 0; i < 48; i++) pts.push(new THREE.Vector2(c.x + Math.cos((i / 48) * TAU) * r, c.y + Math.sin((i / 48) * TAU) * r));
  }
  pts.sort((p, q) => p.x - q.x || p.y - q.y);
  const cross = (o: THREE.Vector2, p: THREE.Vector2, q: THREE.Vector2) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const lower: THREE.Vector2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: THREE.Vector2[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return new THREE.Shape([...lower.slice(0, -1), ...upper.slice(0, -1)]);
}

export function exerciseBike(): EquipmentModel {
  const kit = new Kit("exercise-bike");
  const { m, root } = kit;
  const BB = v3(0.1, 0.32, 0);
  const FW = v3(-0.42, 0.34, 0);
  const R = 0.23;

  // Base: stabiliser feet on a floor beam.
  beam(root, v3(-0.54, 0.05, 0), v3(0.5, 0.05, 0), 0.08, 0.05, m.frameDark);
  for (const [x, half] of [[-0.54, 0.27], [0.5, 0.25]]) {
    beam(root, v3(x, 0.045, -half), v3(x, 0.045, half), 0.08, 0.06, m.frameDark, undefined, 0.012);
    for (const s of [1, -1]) rubberFoot(root, x, s * (half - 0.03), 0.025, 0.016);
  }
  for (const s of [1, -1]) at(wheel(root, 0.035, 0.028), -0.6, 0.04, s * 0.2);

  // Main frame: one swept tube from the rear foot to the handlebar post.
  const spine = new THREE.CatmullRomCurve3([v3(0.4, 0.06, 0), v3(0.2, 0.2, 0), v3(0.04, 0.44, 0), v3(-0.1, 0.7, 0), v3(-0.18, 0.86, 0)]);
  mesh(new THREE.TubeGeometry(spine, 48, 0.042, 18), m.frame, root);
  mesh(new THREE.SphereGeometry(0.042, 18, 12), m.frame, root).position.set(-0.18, 0.86, 0);
  const seatTube = [v3(0.06, 0.38, 0), v3(0.24, 0.8, 0)];
  mesh(bentTube(seatTube, 0.033, 0), m.frame, root);
  const seatDir = seatTube[1].clone().sub(seatTube[0]).normalize();
  beam(root, v3(0.23, 0.76, 0), v3(0.23, 0.76, 0).addScaledVector(seatDir, 0.2), 0.042, 0.042, m.steel, Z);
  at(knob(root, 0.016), 0.21, 0.77, 0, 0, 0, Math.PI / 2 + 0.36);
  const post = v3(0.23, 0.76, 0).addScaledVector(seatDir, 0.2);
  beam(root, v3(post.x - 0.1, post.y + 0.02, 0), v3(post.x + 0.1, post.y + 0.02, 0), 0.04, 0.03, m.steel);
  const saddle = node(root, post.x, post.y + 0.04, 0);
  const saddleShape = roundedPolygon(
    [[-0.15, 0], [-0.12, -0.03], [0.0, -0.05], [0.09, -0.085], [0.13, -0.07], [0.14, 0], [0.13, 0.07], [0.09, 0.085], [0.0, 0.05], [-0.12, 0.03]],
    [0.02, 0.03, 0.08, 0.03, 0.03, 0.03, 0.03, 0.03, 0.08, 0.03],
  );
  const cushion = mesh(extrude(saddleShape, 0.025, 0.018, 10, 4), m.pad, saddle);
  at(cushion, 0, 0.03, 0, -Math.PI / 2);
  block(saddle, 0, 0.0, 0, 0.18, 0.012, 0.06, m.plastic, 0.004);

  // Handlebar post and bullhorn bars with foam grips and a small console.
  const hb = v3(-0.26, 1.08, 0);
  beam(root, v3(-0.17, 0.8, 0), v3(-0.2, 0.9, 0), 0.06, 0.06, m.frame, Z);
  beam(root, v3(-0.2, 0.86, 0), hb, 0.045, 0.045, m.steel, Z);
  at(knob(root, 0.016), -0.16, 0.9, 0, 0, 0, -Math.PI / 2 + 0.3);
  mesh(bentTube([v3(-0.42, 1.12, -0.12), v3(-0.3, 1.1, -0.22), v3(hb.x, hb.y, -0.22), v3(hb.x, hb.y, 0.22), v3(-0.3, 1.1, 0.22), v3(-0.42, 1.12, 0.12)], 0.013, 0.05), m.chrome, root);
  for (const s of [1, -1]) {
    mesh(bentTube([v3(-0.26, 1.08, s * 0.16), v3(-0.26, 1.08, s * 0.22), v3(-0.3, 1.1, s * 0.22), v3(-0.41, 1.118, s * 0.125)], 0.019, 0.05), m.grip, root);
  }
  const consoleG = node(root, hb.x - 0.03, hb.y + 0.05, 0);
  consoleG.rotation.z = 0.5;
  block(consoleG, 0, 0, 0, 0.03, 0.08, 0.12, m.plastic, 0.01);
  const lcdMat = screen(kit, "bike");
  const lcd = mesh(new THREE.PlaneGeometry(0.1, 0.056), lcdMat, consoleG);
  at(lcd, 0.0155, 0.004, 0, 0, Math.PI / 2, 0);
  lcd.castShadow = false;

  // Flywheel with lightening holes (so the spin reads), rim and hub.
  const flywheel = kit.part(root, FW.x, FW.y, 0);
  const disc = new THREE.Shape();
  disc.absarc(0, 0, R - 0.02, 0, TAU, false);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    disc.holes.push(circlePath(0.04, Math.cos(a) * 0.12, Math.sin(a) * 0.12));
  }
  mesh(extrude(disc, 0.01, 0.002, 40, 1), m.steel, flywheel);
  const rimMesh = mesh(lathe([[R - 0.025, -0.0175], [R - 0.004, -0.0175], [R, -0.0135, true], [R, 0.0135, true], [R - 0.004, 0.0175], [R - 0.025, 0.0175], [R - 0.025, -0.0175]], 64), m.chrome, flywheel);
  rimMesh.rotation.x = Math.PI / 2;
  mesh(cyl(0.035, 0.05, 20), m.frameDark, flywheel).rotation.x = Math.PI / 2;
  // Fork and strut holding the axle.
  for (const s of [1, -1]) {
    beam(root, v3(-0.07, 0.64, s * 0.045), v3(FW.x, FW.y, s * 0.045), 0.05, 0.012, m.frame, Z);
    beam(root, v3(FW.x, FW.y, s * 0.045), v3(-0.54, 0.07, s * 0.045), 0.045, 0.012, m.frame, Z);
  }
  at(mesh(cyl(0.012, 0.11, 12), m.steel, root), FW.x, FW.y, 0, Math.PI / 2);
  // Resistance knob and brake pad over the flywheel.
  const rk = node(root, -0.04, 0.6, 0);
  rk.rotation.z = -0.9;
  mesh(cyl(0.03, 0.06, 20), m.frameDark, rk).position.y = 0.04;
  const resist = kit.part(rk, 0, 0.085, 0);
  mesh(lathe([[0, 0], [0.034, 0], [0.036, 0.006, true], [0.036, 0.028, true], [0.03, 0.036, true], [0, 0.038]], 24), m.red, resist);
  for (let i = 0; i < 8; i++) {
    const rib = block(resist, Math.cos((i / 8) * TAU) * 0.036, 0.017, Math.sin((i / 8) * TAU) * 0.036, 0.008, 0.026, 0.008, m.red, 0.003);
    rib.castShadow = false;
  }
  beam(root, v3(-0.06, 0.6, 0), v3(FW.x + 0.06, FW.y + R + 0.02, 0), 0.02, 0.02, m.steel);
  block(root, FW.x + 0.04, FW.y + R + 0.012, 0, 0.07, 0.02, 0.03, m.frameDark, 0.005);

  // Chain guard, cranks and pedals.
  const guard = mesh(extrude(capsuleHull(new THREE.Vector2(BB.x, BB.y), 0.13, new THREE.Vector2(FW.x, FW.y), 0.07), 0.018, 0.008, 8, 2), m.plastic, root);
  guard.position.z = 0.075;
  // Accent swoosh and logo on the guard.
  const along = new THREE.Vector2(FW.x - BB.x, FW.y - BB.y);
  const swoosh = block(root, (BB.x + FW.x) / 2, (BB.y + FW.y) / 2 + 0.05, 0.0935, along.length() * 0.8, 0.014, 0.003, m.accent, 0.005);
  swoosh.rotation.z = Math.atan2(along.y, along.x) + Math.PI + 0.03;
  swoosh.castShadow = false;
  const logo = decal(root, textLabel(BRAND, "#e4e4e7", 512, 96, "bold italic 70px sans-serif"), 0.2, 0.038);
  at(logo, (BB.x + FW.x) / 2 + 0.03, (BB.y + FW.y) / 2, 0.0935, 0, 0, Math.atan2(along.y, along.x) + Math.PI);
  const crank = kit.part(root, BB.x, BB.y, 0);
  mesh(cyl(0.02, 0.26, 16), m.steel, crank).rotation.x = Math.PI / 2;
  const pedals = [1, -1].map((s) => {
    const arm = node(crank, 0, 0, s * 0.125);
    arm.rotation.z = s > 0 ? 0 : Math.PI;
    block(arm, 0, -0.085, 0, 0.035, 0.2, 0.014, m.steel, 0.006);
    const pedal = kit.part(arm, 0, -0.17, s * 0.05);
    mesh(cyl(0.008, 0.1, 10), m.steel, pedal).rotation.x = Math.PI / 2;
    block(pedal, 0, 0, s * 0.02, 0.1, 0.022, 0.09, m.plastic, 0.006);
    block(pedal, 0.045, 0, s * 0.02, 0.008, 0.012, 0.06, m.accent, 0.003);
    mesh(bentTube([v3(-0.05, 0.01, s * -0.02), v3(-0.07, 0.05, s * -0.02), v3(-0.07, 0.05, s * 0.06), v3(-0.05, 0.01, s * 0.06)], 0.005, 0.02), m.grip, pedal);
    return pedal;
  });

  kit.spot("saddle", v3(0.02, 0.071, 0), saddle);
  kit.spot("handlebars", v3(-0.34, 1.13, 0.2));
  kit.spot("pedals", v3(0, 0.014, 0.02), pedals[0]);
  kit.spot("resistance", v3(0, 0.04, 0), resist);
  kit.spot("flywheel", v3(FW.x - 0.1, FW.y + 0.15, 0.02));

  const tick = new Ticker();
  let angle = 0;
  let omega = 0;
  let turn = 0;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    omega = damp(omega, active ? 5.5 : 0, active ? 2 : 1.4, dt);
    angle += omega * dt;
    if (!active && omega < 0.2) angle = settleAngle(angle, 1.5, dt);
    crank.rotation.z = -angle;
    for (const p of pedals) p.rotation.z = angle - p.parent!.rotation.z;
    flywheel.rotation.z = -angle * 3.2;
    turn = damp(turn, active ? 0.6 * Math.sin(time * 0.7) : 0, 3, dt);
    resist.rotation.y = turn;
  });
}
