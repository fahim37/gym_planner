import * as THREE from "three";
import { Kit, Ticker, TAU, at, block, cyl, damp, decal, lathe, mesh, settleAngle, v3 } from "./helpers";
import type { EquipmentModel } from "./index";
import { BRAND, textLabel } from "./materials";

/**
 * Exercise mat whose far end is rolled up: a strip of foam `t` thick bent
 * along a flat run plus an Archimedean spiral. Rolls flat while active.
 */
export function exerciseMat(): EquipmentModel {
  const kit = new Kit("exercise-mat");
  const { m, root } = kit;
  const L = 1.83;
  const W = 0.61;
  const t = 0.012;
  const core = 0.022;
  const N = 280;
  const V = 8;
  const x0 = -L / 2;

  const total = N * V + 8;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const top: number[] = [];
  const rest: number[] = [];
  for (let i = 0; i < N; i++) {
    const s = (i / (N - 1)) * L;
    const b = i * V;
    // top a/b, bottom a/b, side a (top, bottom), side b (top, bottom)
    const us = [
      [s, 0],
      [s, W],
      [s, 0],
      [s, W],
      [s, 0],
      [s, t],
      [s, 0],
      [s, t],
    ];
    us.forEach(([u, v], k) => uv.set([u, v], (b + k) * 2));
    if (i === N - 1) continue;
    const n = b + V;
    top.push(b, b + 1, n, b + 1, n + 1, n);
    rest.push(b + 2, n + 2, b + 3, b + 3, n + 2, n + 3);
    rest.push(b + 4, n + 4, b + 5, n + 4, n + 5, b + 5);
    rest.push(b + 6, b + 7, n + 6, n + 6, b + 7, n + 7);
  }
  const capA = N * V;
  const capB = capA + 4;
  rest.push(capA, capA + 2, capA + 1, capA + 1, capA + 2, capA + 3);
  rest.push(capB, capB + 1, capB + 2, capB + 1, capB + 3, capB + 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex([...top, ...rest]);
  geo.addGroup(0, top.length, 0);
  geo.addGroup(top.length, rest.length, 1);
  geo.boundingSphere = new THREE.Sphere(v3(0, 0.1, 0), 1.1);
  const mat = new THREE.Mesh(geo, [m.mat, m.matEdge]);
  mat.castShadow = mat.receiveShadow = true;
  mat.userData.keep = true;
  root.add(mat);

  const c = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const set = (idx: number, p: THREE.Vector3, n: THREE.Vector3) => {
    pos.set([p.x, p.y, p.z], idx * 3);
    nor.set([n.x, n.y, n.z], idx * 3);
  };
  const p = new THREE.Vector3();
  const nz = v3(0, 0, -1);
  const pz = v3(0, 0, 1);
  const shape = (rolled: number) => {
    const flat = L - rolled;
    const R0 = Math.sqrt((rolled * t) / Math.PI + core * core);
    const xc = x0 + flat;
    let tangentEnd = v3(1, 0, 0);
    for (let i = 0; i < N; i++) {
      const s = (i / (N - 1)) * L;
      if (s <= flat) {
        c.set(x0 + s, t / 2, 0);
        nrm.set(0, 1, 0);
      } else {
        const q = s - flat;
        const phi = ((R0 - Math.sqrt(Math.max(0, R0 * R0 - (t * q) / Math.PI))) * TAU) / t;
        const r = R0 - (t * phi) / TAU;
        c.set(xc + r * Math.sin(phi), t / 2 + R0 - r * Math.cos(phi), 0);
        nrm.set(-Math.sin(phi), Math.cos(phi), 0);
        if (i === N - 1) tangentEnd = v3(Math.cos(phi), Math.sin(phi), 0);
      }
      const b = i * V;
      const up = c.clone().addScaledVector(nrm, t / 2);
      const down = c.clone().addScaledVector(nrm, -t / 2);
      const neg = nrm.clone().negate();
      for (const [k, base, z, n] of [
        [0, up, -W / 2, nrm],
        [1, up, W / 2, nrm],
        [2, down, -W / 2, neg],
        [3, down, W / 2, neg],
        [4, up, -W / 2, nz],
        [5, down, -W / 2, nz],
        [6, up, W / 2, pz],
        [7, down, W / 2, pz],
      ] as const) {
        set(b + k, p.copy(base).setZ(z), n);
      }
      if (i === 0 || i === N - 1) {
        const cap = i === 0 ? capA : capB;
        const n = i === 0 ? v3(-1, 0, 0) : tangentEnd;
        set(cap, p.copy(up).setZ(-W / 2), n);
        set(cap + 1, p.copy(up).setZ(W / 2), n);
        set(cap + 2, p.copy(down).setZ(-W / 2), n);
        set(cap + 3, p.copy(down).setZ(W / 2), n);
      }
    }
    geo.getAttribute("position").needsUpdate = true;
    geo.getAttribute("normal").needsUpdate = true;
    geo.boundingBox = null;
  };
  const restRolled = 0.62;
  shape(restRolled);

  const logo = decal(root, textLabel(BRAND, "#d9f99d", 512, 96, "bold italic 64px sans-serif"), 0.36, 0.068);
  logo.position.set(-0.66, t + 0.0006, 0);
  logo.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  logo.material = kit.own((logo.material as THREE.MeshStandardMaterial).clone());
  (logo.material as THREE.MeshStandardMaterial).opacity = 0.55;

  kit.spot("mat", v3(-0.3, t + 0.001, 0.08));

  const tick = new Ticker();
  let rolled = restRolled;
  return kit.finish((time, active) => {
    const next = damp(rolled, active ? 0 : restRolled, 1.1, tick.dt(time));
    if (Math.abs(next - rolled) > 1e-5) {
      rolled = next;
      shape(rolled);
    }
  });
}

const patchMats = new Map<string, THREE.MeshStandardMaterial>();
function patchMat(tex: THREE.Texture) {
  let mat = patchMats.get(tex.uuid);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    patchMats.set(tex.uuid, mat);
  }
  return mat;
}

/** Rolls `x` back and forth while active, returning to 0; `spin` turns without slipping. */
function rolling(amplitude: number, period: number, radius: number, apply: (x: number, angle: number) => void) {
  const tick = new Ticker();
  let x = 0;
  return (time: number, active: boolean) => {
    x = damp(x, active ? amplitude * Math.sin((time / period) * TAU) : 0, 4, tick.dt(time));
    apply(x, -x / radius);
  };
}

// ----------------------------------------------------------- medicine ball

export function medicineBall(): EquipmentModel {
  const kit = new Kit("medicine-ball");
  const { m, root } = kit;
  const R = 0.14;
  const ball = kit.part(root, 0, R, 0);
  mesh(new THREE.SphereGeometry(R, 48, 32), m.medball, ball);
  // Moulding seams and a coloured grip band.
  for (const rx of [0, Math.PI / 2]) {
    const seam = mesh(new THREE.TorusGeometry(R, 0.0028, 6, 64), m.rubber, ball);
    seam.rotation.set(rx + Math.PI / 2, 0, 0);
  }
  const band = mesh(new THREE.TorusGeometry(R, 0.0045, 8, 64), m.accent, ball);
  band.rotation.set(0, Math.PI / 2, 0.5);
  const label = mesh(new THREE.SphereGeometry(R + 0.0008, 24, 12, -0.5, 1.0, Math.PI / 2 - 0.3, 0.6), patchMat(textLabelBall()), ball);
  label.rotation.y = Math.PI;
  label.castShadow = false;
  kit.spot("shell", v3(-R * 0.35, R * 0.93, R * 0.1), ball);
  kit.spot("weight-label", v3(R + 0.002, 0, 0), ball);

  const tick = new Ticker();
  let amp = 0;
  let spin = 0;
  const H = 0.38;
  const T = 0.95;
  return kit.finish((time, active) => {
    const dt = tick.dt(time);
    amp = damp(amp, active ? 1 : 0, 3, dt);
    const f = (time / T) % 1;
    const contact = Math.max(0, 1 - Math.min(f, 1 - f) / 0.07);
    const squash = 0.12 * amp * contact;
    ball.position.y = R * (1 - squash) + amp * H * 4 * f * (1 - f);
    ball.scale.set(1 + squash / 2, 1 - squash, 1 + squash / 2);
    spin = active ? spin + dt * 1.6 * amp : settleAngle(spin, 2, dt);
    ball.rotation.z = -spin;
  });
}

function textLabelBall() {
  return textLabel("6 KG", "#fbbf24", 256, 128, "bold 80px sans-serif");
}

// ------------------------------------------------------------------ ab wheel

export function abWheel(): EquipmentModel {
  const kit = new Kit("ab-wheel");
  const { m, root } = kit;
  const R = 0.095;
  const W = 0.062;
  const roll = kit.part(root, 0, R, 0);
  const wheel = kit.part(roll);
  const tyre = mesh(
    lathe(
      [
        [0.066, -W / 2],
        [R - 0.012, -W / 2],
        [R - 0.003, -W / 2 + 0.006, true],
        [R, -W / 2 + 0.016, true],
        [R - 0.003, -0.008],
        [R, -0.002, true],
        [R, 0.002, true],
        [R - 0.003, 0.008],
        [R, W / 2 - 0.016, true],
        [R - 0.003, W / 2 - 0.006, true],
        [R - 0.012, W / 2],
        [0.066, W / 2],
      ],
      48,
    ),
    m.rubber,
    wheel,
  );
  tyre.rotation.x = Math.PI / 2;
  at(mesh(cyl(0.068, W - 0.008, 32), m.accent, wheel), 0, 0, 0, Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const spoke = block(wheel, Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0, 0.05, 0.014, W - 0.002, m.plastic, 0.004);
    spoke.rotation.z = a;
  }
  at(mesh(cyl(0.02, W + 0.006, 20), m.steel, wheel), 0, 0, 0, Math.PI / 2);
  at(mesh(cyl(0.008, 0.36, 12), m.steel, roll), 0, 0, 0, Math.PI / 2);
  for (const s of [1, -1]) {
    at(mesh(cyl(0.021, 0.11, 20), m.grip, roll), 0, 0, s * 0.105, Math.PI / 2);
    at(mesh(cyl(0.024, 0.012, 20), m.plastic, roll), 0, 0, s * 0.166, Math.PI / 2);
    at(mesh(cyl(0.024, 0.008, 20), m.plastic, roll), 0, 0, s * 0.046, Math.PI / 2);
  }
  kit.spot("wheel", v3(0, R + 0.001, 0), roll);
  kit.spot("handles", v3(0, 0.022, 0.12), roll);
  return kit.finish(
    rolling(0.32, 3, R, (x, angle) => {
      roll.position.x = x;
      wheel.rotation.z = angle;
    }),
  );
}

// -------------------------------------------------------------- foam roller

export function foamRoller(): EquipmentModel {
  const kit = new Kit("foam-roller");
  const { m, root } = kit;
  const R = 0.075;
  const core = 0.05;
  const L = 0.33;
  const roll = kit.part(root, 0, R, 0);
  const spin = kit.part(roll);
  at(mesh(cyl(R, L, 48, R, true), m.foamRoller, spin), 0, 0, 0, Math.PI / 2);
  for (const s of [1, -1]) {
    const face = mesh(new THREE.RingGeometry(core, R, 48, 1), m.foamRoller, spin);
    at(face, 0, 0, (s * L) / 2, 0, s > 0 ? 0 : Math.PI, 0);
    const lip = mesh(new THREE.RingGeometry(core - 0.005, core, 48, 1), m.plastic, spin);
    at(lip, 0, 0, s * (L / 2 + 0.004), 0, s > 0 ? 0 : Math.PI, 0);
  }
  at(mesh(cyl(core, L + 0.008, 40, core, true), m.plastic, spin), 0, 0, 0, Math.PI / 2);
  const bore = mesh(cyl(core - 0.005, L + 0.008, 40, core - 0.005, true), m.board, spin);
  at(bore, 0, 0, 0, Math.PI / 2);
  bore.material = kit.own(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6, side: THREE.BackSide }));
  kit.spot("surface", v3(0, R + 0.001, 0.06), roll);
  kit.spot("core", v3(0, core - 0.002, L / 2 + 0.005), roll);
  return kit.finish(
    rolling(0.26, 2.6, R, (x, angle) => {
      roll.position.x = x;
      spin.rotation.z = angle;
    }),
  );
}
