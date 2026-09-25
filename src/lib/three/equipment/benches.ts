import * as THREE from "three";
import {
  Kit,
  Ticker,
  at,
  beam,
  bentTube,
  block,
  cyl,
  damp,
  decal,
  extrude,
  mesh,
  node,
  roundedPolygon,
  smooth,
  v3,
} from "./helpers";
import type { EquipmentModel } from "./index";
import { holeStrip } from "./materials";
import { bolt, knob, olympicBar, pad, rectPad, rubberFoot, storageHorn, wheel, type PlateSpec } from "./parts";

/** Floor foot running along z, with rubber pads and end caps. */
function foot(kit: Kit, x: number, half: number, w = 0.076, h = 0.05) {
  const { m, root } = kit;
  const y = 0.014 + h / 2;
  beam(root, v3(x, y, -half), v3(x, y, half), w, h, m.frame);
  for (const s of [1, -1]) {
    rubberFoot(root, x, s * (half - 0.04), 0.028, 0.014);
    block(root, x, y, s * (half + 0.004), w + 0.004, h + 0.004, 0.01, m.uhmw, 0.003);
  }
  return y + h / 2;
}

// ------------------------------------------------------------ flat bench

export function flatBench(): EquipmentModel {
  const kit = new Kit("flat-bench");
  const { m, root } = kit;
  const top = 0.44;
  const padH = 0.065;
  const padBase = top - padH - 0.016;
  rectPad(node(root, 0, padBase, 0), 1.2, 0.29, padH, 0.045);

  const spineY = padBase - 0.012 - 0.038;
  beam(root, v3(-0.44, spineY, 0), v3(0.44, spineY, 0), 0.05, 0.076, m.frame);
  for (const x of [-0.3, 0.3]) block(root, x, padBase - 0.006, 0, 0.18, 0.012, 0.12, m.frame, 0.003);
  const footTop = [-0.5, 0.5].map((x) => foot(kit, x, 0.3));
  for (const s of [1, -1]) {
    const a = v3(s * 0.42, spineY - 0.01, 0);
    const b = v3(s * 0.5, footTop[0] - 0.01, 0);
    beam(root, a, b, 0.05, 0.076, m.frame);
    // Gussets and bolts where the legs meet the spine.
    for (const z of [0.029, -0.029]) {
      const g = mesh(extrude(roundedPolygon([[0, 0], [0.13, 0], [0.155, -0.13]], 0.008), 0.006, 0, 4), m.frameDark, root);
      at(g, s * 0.3, spineY - 0.02, z, 0, s > 0 ? 0 : Math.PI, 0);
      bolt(root, v3(s * 0.38, spineY, z), v3(0, 0, Math.sign(z)));
    }
  }
  // Transport wheels at the head end, lifting handle at the foot end.
  for (const z of [-0.23, 0.23]) {
    at(wheel(root, 0.04, 0.03), -0.585, 0.044, z);
    block(root, -0.56, 0.05, z + Math.sign(z) * 0.022, 0.06, 0.03, 0.008, m.frameDark, 0.003);
  }
  mesh(bentTube([v3(0.535, 0.058, -0.1), v3(0.62, 0.07, -0.085), v3(0.62, 0.07, 0.085), v3(0.535, 0.058, 0.1)], 0.012, 0.04), m.frame, root);
  const grip = mesh(cyl(0.016, 0.12, 16), m.grip, root);
  at(grip, 0.62, 0.07, 0, Math.PI / 2);

  kit.spot("pad", v3(0.25, top + 0.001, 0));
  kit.spot("frame", v3(0.46, 0.18, 0.026));
  kit.spot("feet", v3(0.5, footTop[1] + 0.001, 0.24));
  return kit.finish();
}

// ------------------------------------------------------- adjustable bench

export function adjustableBench(): EquipmentModel {
  const kit = new Kit("adjustable-bench");
  const { m, root } = kit;
  const spineTop = 0.17;
  const spineY = spineTop - 0.025;
  beam(root, v3(-0.76, spineY, 0), v3(0.55, spineY, 0), 0.08, 0.05, m.frame);
  for (const x of [-0.72, 0.52]) {
    const t = foot(kit, x, 0.28, 0.07, 0.05);
    block(root, x, (t + spineY) / 2, 0, 0.06, spineY - t + 0.01, 0.06, m.frame, 0.004);
  }
  for (const z of [-0.2, 0.2]) {
    at(wheel(root, 0.045, 0.034), 0.6, 0.05, z);
    block(root, 0.565, 0.052, z + Math.sign(z) * 0.024, 0.08, 0.035, 0.008, m.frameDark, 0.003);
  }
  // Rear lifting handle.
  beam(root, v3(-0.76, spineY, 0), v3(-0.97, spineY + 0.04, 0), 0.04, 0.035, m.frame);
  const grip = mesh(cyl(0.021, 0.12, 16), m.grip, root);
  at(grip, -0.915, spineY + 0.03, 0, 0, 0, Math.PI / 2 - 0.19);

  // Seat on its post.
  beam(root, v3(0.3, spineTop, 0), v3(0.3, 0.36, 0), 0.06, 0.06, m.frame);
  block(root, 0.3, 0.366, 0, 0.26, 0.012, 0.16, m.frameDark, 0.003);
  rectPad(node(root, 0.3, 0.372, 0), 0.34, 0.3, 0.06, 0.05);

  // Backrest, hinged at H and rotated by -angle about z.
  const H = v3(0.12, 0.36, 0);
  beam(root, v3(H.x, spineTop, 0), v3(H.x, H.y - 0.02, 0), 0.06, 0.05, m.frame);
  const hinge = kit.part(root, H.x, H.y, 0);
  for (const z of [-0.042, 0.042]) {
    const cheek = mesh(extrude(roundedPolygon([[-0.07, 0.005], [0.03, 0.005], [0.03, -0.05], [-0.03, -0.06]], 0.012), 0.008, 0.001, 4), m.frameDark, hinge);
    cheek.position.z = z;
  }
  const pivot = mesh(cyl(0.012, 0.11, 12), m.steel, hinge);
  pivot.rotation.x = Math.PI / 2;
  beam(hinge, v3(-0.03, -0.005, 0), v3(-0.78, -0.005, 0), 0.06, 0.03, m.frame);
  const back = node(hinge, -0.43, 0.012, 0);
  pad(back, [[0.4, -0.125], [0.4, 0.125], [-0.4, 0.15], [-0.4, -0.15]], 0.062, 0.05);

  // Support arm from under the backrest down to a notch on the ladder.
  const La = 0.5;
  const attach = v3(-0.3, -0.02, 0);
  const pinY = 0.23;
  const stops = [0, 30, 45, 60, 85].map((d) => THREE.MathUtils.degToRad(d));
  const P = new THREE.Vector3();
  const armPoints = (theta: number) => {
    P.copy(attach).applyAxisAngle(v3(0, 0, 1), -theta).add(H);
    const dx = Math.sqrt(Math.max(0, La * La - (P.y - pinY) ** 2));
    return v3(P.x - dx, pinY, 0);
  };
  const notchX = stops.map((t) => armPoints(t).x);
  const ladderTop = 0.232;
  const outline: [number, number][] = [
    [-0.7, spineTop],
    [-0.1, spineTop],
    [-0.1, ladderTop],
  ];
  const notchR = 0.013;
  for (const x of [...notchX].sort((a, b) => b - a)) {
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI;
      outline.push([x + Math.cos(a) * notchR, ladderTop - Math.sin(a) * notchR]);
    }
  }
  outline.push([-0.7, ladderTop]);
  const ladderShape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const z of [-0.038, 0.038]) mesh(extrude(ladderShape, 0.008, 0.001, 2, 1), m.frameDark, root).position.z = z;

  const arm = kit.part(root);
  beam(arm, v3(0, 0, 0), v3(0, La, 0), 0.03, 0.04, m.frame, v3(0, 0, 1));
  const pin = mesh(cyl(0.011, 0.11, 14), m.chrome, arm);
  pin.rotation.x = Math.PI / 2;
  const lever = mesh(cyl(0.013, 0.09, 12), m.accent, arm);
  at(lever, 0, 0.03, 0.07, Math.PI / 2);
  const armTop = node(arm, 0, La, 0);
  mesh(cyl(0.012, 0.075, 12), m.steel, armTop).rotation.x = Math.PI / 2;

  const pose = (theta: number) => {
    hinge.rotation.z = -theta;
    const F = armPoints(theta);
    P.copy(attach).applyAxisAngle(v3(0, 0, 1), -theta).add(H);
    arm.position.copy(F);
    arm.quaternion.setFromUnitVectors(v3(0, 1, 0), P.clone().sub(F).normalize());
  };
  pose(0);

  kit.spot("backrest", v3(-0.5, 0.09, 0), hinge);
  kit.spot("seat", v3(0.32, 0.449, 0));
  kit.spot("ladder", v3(-0.42, 0.21, 0.043));
  kit.spot("wheels", v3(0.6, 0.05, 0.22));

  // Cycles flat → 30° → 45° → 60° → 85°, holding each setting.
  const tick = new Ticker();
  let theta = 0;
  const hold = 1.6;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    let target = 0;
    if (active) {
      const k = time / hold;
      const i = Math.floor(k) % stops.length;
      const next = stops[(i + 1) % stops.length];
      target = stops[i] + (next - stops[i]) * smooth((k % 1 - 0.55) / 0.45);
    }
    theta = damp(theta, target, 5, dt);
    pose(theta);
  });
}

// -------------------------------------------------------------- power rack

export function powerRack(): EquipmentModel {
  const kit = new Kit("power-rack");
  const { m, root } = kit;
  const X = 0.6;
  const Z = 0.55;
  const T = 0.076;
  const top = 2.29;
  const runnerY = 0.012 + 0.03;
  for (const z of [-Z, Z]) {
    beam(root, v3(-0.78, runnerY, z), v3(0.78, runnerY, z), T, 0.06, m.frame);
    for (const x of [-0.72, 0.72]) rubberFoot(root, x, z, 0.03, 0.012);
    for (const x of [-0.784, 0.784]) block(root, x, runnerY, z, 0.01, 0.064, T + 0.004, m.uhmw, 0.003);
  }
  beam(root, v3(-X, runnerY, -Z), v3(-X, runnerY, Z), T, 0.06, m.frame);
  // Uprights with laser-cut hole strips on every face.
  const holes = holeStrip(36, false);
  const numbered = holeStrip(36, true);
  const stripY = 0.35 + 0.9;
  for (const x of [-X, X]) {
    for (const z of [-Z, Z]) {
      beam(root, v3(x, runnerY + 0.03, z), v3(x, top, z), T, T, m.frame, v3(0, 0, 1), 0.006);
      for (let f = 0; f < 4; f++) {
        const a = (f * Math.PI) / 2;
        const outer = Math.sin(a) * Math.sign(z) > 0.5;
        const d = decal(root, outer ? numbered : holes, T * 0.98, 1.8);
        at(d, x + Math.cos(a) * (T / 2 + 0.0006), stripY, z + Math.sin(a) * (T / 2 + 0.0006), 0, Math.PI / 2 - a, 0);
      }
      bolt(root, v3(x + Math.sign(x) * (T / 2), runnerY + 0.08, z), v3(Math.sign(x), 0, 0), 0.011);
    }
  }
  const topY = top - T / 2;
  for (const x of [-X, X]) beam(root, v3(x, topY, -Z - T / 2), v3(x, topY, Z + T / 2), T, T, m.frame, undefined, 0.006);
  for (const z of [-Z, Z]) beam(root, v3(-X + T / 2, topY, z), v3(X - T / 2, topY, z), T, T, m.frame, undefined, 0.006);

  // Pull-up bar on brackets in front of the top.
  const pullY = 2.18;
  for (const z of [-Z, Z]) beam(root, v3(X, pullY + 0.02, z), v3(X + 0.14, pullY, z), T * 0.8, 0.05, m.frame);
  const bar = mesh(cyl(0.016, 2 * Z + 0.12, 20), m.knurl, root);
  at(bar, X + 0.12, pullY, 0, Math.PI / 2);

  // J-hooks on the front uprights with a bar racked in them.
  const jY = 1.33;
  const jShape = roundedPolygon(
    [
      [0, 0],
      [0.1, 0],
      [0.1, 0.075],
      [0.082, 0.075],
      [0.082, 0.026],
      [0.012, 0.026],
      [0.012, 0.12],
      [0, 0.12],
    ],
    [0.006, 0.012, 0.004, 0.004, 0.008, 0.008, 0.004, 0.004],
  );
  for (const z of [-Z, Z]) {
    const j = mesh(extrude(jShape, 0.046, 0.002, 4, 1), m.frameDark, root);
    at(j, X + T / 2, jY - 0.03, z);
    for (const s of [1, -1]) block(root, X, jY + 0.06, z + s * (T / 2 + 0.005), T + 0.02, 0.1, 0.008, m.frameDark, 0.003);
    block(root, X + T / 2 + 0.047, jY - 0.001, z, 0.068, 0.008, 0.05, m.uhmw, 0.003);
    const k = knob(root, 0.014);
    at(k, X, jY + 0.07, z + Math.sign(z) * (T / 2 + 0.009), Math.sign(z) * Math.PI / 2);
  }
  const rack = olympicBar(root);
  rack.group.position.set(X + T / 2 + 0.045, jY + 0.003 + 0.014, 0);

  // Safety arms spanning front to back just inside the uprights.
  const sY = 0.86;
  const sZ = Z - T / 2 - 0.027;
  for (const s of [1, -1]) {
    beam(root, v3(-X - 0.06, sY, s * sZ), v3(X + 0.16, sY, s * sZ), 0.05, 0.05, m.frame, undefined, 0.005);
    beam(root, v3(-X - 0.04, sY + 0.028, s * sZ), v3(X + 0.14, sY + 0.028, s * sZ), 0.046, 0.008, m.uhmw, undefined, 0.002);
    for (const x of [-X, X]) {
      const k = knob(root, 0.014);
      at(k, x, sY, s * (Z + T / 2 + 0.002), (s * Math.PI) / 2);
    }
  }

  // Plate storage horns on the rear uprights.
  const storage: [number, number, PlateSpec[]][] = [
    [1, 0.3, [{ kind: "bumper", kg: 20 }, { kind: "bumper", kg: 20 }]],
    [1, 0.8, [{ kind: "iron", kg: 10 }, { kind: "iron", kg: 5 }]],
    [-1, 0.3, [{ kind: "bumper", kg: 25 }, { kind: "bumper", kg: 25 }]],
    [-1, 0.8, [{ kind: "iron", kg: 20 }]],
  ];
  for (const [s, y, specs] of storage) storageHorn(root, -X, y, s * (Z + T / 2), s, specs);

  kit.spot("uprights", v3(X + T / 2 + 0.001, 1.05, Z));
  kit.spot("j-hooks", v3(X + T / 2 + 0.1, jY + 0.045, Z + 0.025));
  kit.spot("safety-arms", v3(X + 0.16, sY + 0.035, sZ));
  kit.spot("pull-up-bar", v3(X + 0.12, pullY + 0.017, 0.2));
  kit.spot("plate-storage", v3(-X, 0.3 + 0.226, Z + T / 2 + 0.07));
  return kit.finish();
}
