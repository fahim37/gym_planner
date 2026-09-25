import * as THREE from "three";
import { Kit, Ticker, TAU, damp, decal, v3 } from "./helpers";
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
