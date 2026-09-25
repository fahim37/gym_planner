import * as THREE from "three";
import { buildEquipmentModel, type EquipmentModel } from "../equipment";
import { toWorld, type BodyRig } from "../rig";
import type { ExtraPropBuilder, ExtraPropParams } from "./types";

/*
 * Props for the core, cardio and mobility library. Builders return an object
 * plus an optional `update(rig)` that runs every frame after the pose is
 * solved; `rig.joints` holds world-space joints (metres, y up, floor at 0).
 * Positions passed in `params` are authoring centimetres (x forward, y down,
 * floor at 250, z outward) unless noted.
 */

const num = (p: ExtraPropParams, key: string, fallback: number) => (typeof p[key] === "number" ? (p[key] as number) : fallback);
const str = (p: ExtraPropParams, key: string, fallback: string) => (typeof p[key] === "string" ? (p[key] as string) : fallback);

/** Shared materials (never disposed, like the ones in ../props). */
let shared: ReturnType<typeof createMaterials> | null = null;
function createMaterials() {
  return {
    rubber: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.25, metalness: 0.9 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.4, metalness: 0.6 }),
    frameDark: new THREE.MeshStandardMaterial({ color: 0x2e2e33, roughness: 0.45, metalness: 0.5 }),
    pad: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 }),
    grip: new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.75 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xa47148, roughness: 0.7 }),
  };
}
const mats = () => (shared ??= createMaterials());

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/** Collects geometries so a prop can free them on dispose. */
class Geos {
  private readonly list: THREE.BufferGeometry[] = [];
  add<T extends THREE.BufferGeometry>(g: T): T {
    this.list.push(g);
    return g;
  }
  dispose = () => this.list.forEach((g) => g.dispose());
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent?: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  parent?.add(m);
  return m;
}

/** A cylinder from `a` to `b` (world metres). */
function rod(geos: Geos, parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 16) {
  const m = mesh(geos.add(new THREE.CylinderGeometry(r, r, a.distanceTo(b), seg)), mat, parent);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(Y_AXIS, new THREE.Vector3().subVectors(b, a).normalize());
  return m;
}

/** An axis-aligned box centred at `c` (world metres). */
function block(geos: Geos, parent: THREE.Object3D, c: THREE.Vector3, w: number, h: number, d: number, mat: THREE.Material) {
  const m = mesh(geos.add(new THREE.BoxGeometry(w, h, d)), mat, parent);
  m.position.copy(c);
  return m;
}

/** Authoring cm → world metres. */
const W = (x: number, y: number, z = 0) => toWorld([x, y, z]);

/** Midpoint of the two hands' grip centres (where held handles sit). */
function palms(rig: BodyRig, out: THREE.Vector3, tmp: THREE.Vector3) {
  const [a, b] = rig.joints!.sides;
  tmp.copy(b.grip);
  return out.copy(a.grip).add(tmp).multiplyScalar(0.5);
}

// ───────────────────────── medicine ball ─────────────────────────

/** Rubber medicine ball held between both palms. Params: radius (m, default 0.115). */
const medicineBall: ExtraPropBuilder = (params) => {
  const radius = num(params, "radius", 0.115);
  const geos = new Geos();
  const m = mats();
  const group = new THREE.Group();
  mesh(geos.add(new THREE.SphereGeometry(radius, 32, 20)), m.rubber, group);
  const seamGeo = geos.add(new THREE.TorusGeometry(radius * 1.002, radius * 0.035, 6, 48));
  for (const r of [0, Math.PI / 2]) {
    const seam = new THREE.Mesh(seamGeo, m.red);
    seam.rotation.y = r;
    group.add(seam);
  }
  const tmp = new THREE.Vector3();
  return {
    object: group,
    update(rig) {
      if (!rig.joints) return;
      const [a, b] = rig.joints.sides;
      group.position.copy(a.hand).lerp(a.wrist, 0.35);
      tmp.copy(b.hand).lerp(b.wrist, 0.35);
      group.position.add(tmp).multiplyScalar(0.5);
      // Never sink into the floor (e.g. a slam at the bottom).
      group.position.y = Math.max(group.position.y, radius);
    },
    dispose: geos.dispose,
  };
};

// ─────────────────────────── ab wheel ───────────────────────────

/** Ab wheel under the palms that rolls along the floor. Params: radius (m, default 0.09). */
const abWheel: ExtraPropBuilder = (params) => {
  const radius = num(params, "radius", 0.09);
  const geos = new Geos();
  const m = mats();
  const group = new THREE.Group();
  const wheel = new THREE.Group();
  group.add(wheel);
  // Tyre and hub, axis along z.
  const tyre = mesh(geos.add(new THREE.TorusGeometry(radius - 0.018, 0.02, 12, 40)), m.tyre, wheel);
  tyre.scale.z = 1.6;
  const hub = mesh(geos.add(new THREE.CylinderGeometry(radius - 0.02, radius - 0.02, 0.05, 32)), m.red, wheel);
  hub.rotation.x = Math.PI / 2;
  // Spokes so the rolling is visible.
  for (let k = 0; k < 3; k++) {
    const spoke = block(geos, wheel, new THREE.Vector3(), 0.012, (radius - 0.02) * 2, 0.056, m.frameDark);
    spoke.rotation.z = (k * Math.PI) / 3;
  }
  // Axle and grips.
  rod(geos, group, new THREE.Vector3(0, 0, -0.17), new THREE.Vector3(0, 0, 0.17), 0.008, m.chrome);
  for (const s of [1, -1]) {
    rod(geos, group, new THREE.Vector3(0, 0, s * 0.05), new THREE.Vector3(0, 0, s * 0.16), 0.017, m.grip);
  }
  const tmp = new THREE.Vector3();
  return {
    object: group,
    grip: { hands: "both", radius: 0.017 },
    update(rig) {
      if (!rig.joints) return;
      palms(rig, tmp, group.position);
      group.position.set(tmp.x, radius, 0);
      wheel.rotation.z = -tmp.x / radius;
    },
    dispose: geos.dispose,
  };
};

// ───────────────────── 45° hyperextension bench ─────────────────────

/**
 * 45° back-extension bench. Params (authoring cm): ankleX, ankleY — the
 * athlete's ankle; the legs run up-forward at 45° to the hips, which sit just
 * above the top edge of the thigh pad.
 */
const hyperBench: ExtraPropBuilder = (params) => {
  const ax = num(params, "ankleX", 70);
  const ay = num(params, "ankleY", 228);
  const geos = new Geos();
  const m = mats();
  const group = new THREE.Group();
  const s = Math.SQRT1_2;
  // Unit vectors in authoring space: along the leg (hip → ankle) and toward the front of the legs.
  const leg = [-s, s];
  const front = [s, s];
  const along = (d: number, f: number): [number, number] => [ax + leg[0] * d + front[0] * f, ay + leg[1] * d + front[1] * f];
  const tilt = new THREE.Euler(0, 0, Math.PI / 4);

  // Foot plate under the soles (perpendicular to the legs).
  const [fx, fy] = along(4.5, 6);
  const plate = block(geos, group, W(fx, fy), 0.03, 0.3, 0.42, m.frameDark);
  plate.setRotationFromEuler(tilt);
  // Ankle rollers behind the heels, just above the ankle.
  const [rx, ry] = along(-7, -10.5);
  for (const z of [-11, 11]) {
    const roller = mesh(geos.add(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 24)), m.pad, group);
    roller.rotation.x = Math.PI / 2;
    roller.position.copy(W(rx, ry, z));
  }
  rod(geos, group, W(rx, ry, -20), W(rx, ry, 20), 0.012, m.chrome);
  // Thigh pad: from just below the hip crease down the front of the thighs.
  const [px, py] = along(-(88 - 20), 15);
  const pad = block(geos, group, W(px, py), 0.32, 0.1, 0.4, m.pad);
  pad.setRotationFromEuler(tilt);
  // Frame: a floor rail, a post to the pad and a post to the foot plate / rollers.
  const baseY = 247.5;
  const baseLen = (px - ax + 60) / 100;
  const baseX = (ax + px) / 2 - 8;
  for (const z of [-18, 18]) block(geos, group, W(baseX, baseY, z), baseLen, 0.05, 0.06, m.frame);
  for (const x of [baseX - baseLen * 45, baseX + baseLen * 45]) block(geos, group, W(x, baseY), 0.06, 0.05, 0.42, m.frame);
  const [ux, uy] = along(-(88 - 20), 3);
  rod(geos, group, W(ux, uy), W(px - 18, baseY - 3), 0.03, m.frame);
  rod(geos, group, W(fx - 3, fy + 3), W(fx - 12, baseY - 3), 0.03, m.frame);
  rod(geos, group, W(rx, ry), W(fx - 4, fy - 2), 0.02, m.frame);
  return { object: group, dispose: geos.dispose };
};

// ─────────────────────── side cable column ───────────────────────

/**
 * A cable column standing beside the athlete (z ≠ 0), for anti-rotation and
 * rotation work. Params (authoring cm): x, y — pulley height, z — lateral
 * position (positive = near side); handle: "d" (default) or "rope".
 */
const sideCable: ExtraPropBuilder = (params) => {
  const x = num(params, "x", 180);
  const y = num(params, "y", 100);
  const z = num(params, "z", 100);
  const rope = str(params, "handle", "d") === "rope";
  const geos = new Geos();
  const m = mats();
  const group = new THREE.Group();
  const pulley = W(x, y, z);
  const out = Math.sign(z) || 1;
  // Column behind the pulley: base, twin uprights, top bar, weight stack and the pulley rail.
  const colZ = pulley.z + out * 0.12;
  const cx = pulley.x;
  block(geos, group, new THREE.Vector3(cx, 0.02, colZ + out * 0.05), 0.55, 0.04, 0.5, m.frame);
  for (const dx of [-0.16, 0.16]) block(geos, group, new THREE.Vector3(cx + dx, 1.07, colZ + out * 0.05), 0.06, 2.1, 0.06, m.frame);
  block(geos, group, new THREE.Vector3(cx, 2.12, colZ + out * 0.05), 0.38, 0.06, 0.08, m.frame);
  block(geos, group, new THREE.Vector3(cx, 0.45, colZ + out * 0.08), 0.22, 0.8, 0.1, m.frameDark);
  rod(geos, group, new THREE.Vector3(cx - 0.04, 0.9, colZ + out * 0.08), new THREE.Vector3(cx - 0.04, 2.1, colZ + out * 0.08), 0.008, m.chrome);
  rod(geos, group, new THREE.Vector3(cx + 0.04, 0.9, colZ + out * 0.08), new THREE.Vector3(cx + 0.04, 2.1, colZ + out * 0.08), 0.008, m.chrome);
  block(geos, group, new THREE.Vector3(cx, 1.07, colZ - out * 0.02), 0.05, 2.1, 0.05, m.frameDark);
  // Carriage and pulley wheel.
  block(geos, group, new THREE.Vector3(cx, pulley.y, colZ - out * 0.06), 0.1, 0.16, 0.06, m.frame);
  const wheel = mesh(geos.add(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 20)), m.chrome, group);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.copy(pulley);
  // Unit-length cable along -y from the pulley, aimed and stretched every frame.
  const cableGeo = geos.add(new THREE.CylinderGeometry(0.005, 0.005, 1, 8));
  cableGeo.translate(0, -0.5, 0);
  const cable = mesh(cableGeo, m.cable, group);
  cable.position.copy(pulley);
  // Handle across the palms.
  const handle = new THREE.Group();
  group.add(handle);
  if (rope) {
    rod(geos, handle, new THREE.Vector3(0, 0, -0.08), new THREE.Vector3(0, 0, 0.08), 0.016, m.rope);
  } else {
    rod(geos, handle, new THREE.Vector3(0, 0, -0.06), new THREE.Vector3(0, 0, 0.06), 0.016, m.grip);
    const loop = mesh(geos.add(new THREE.TorusGeometry(0.07, 0.006, 8, 24, Math.PI)), m.chrome, handle);
    loop.rotation.y = Math.PI / 2;
  }
  const tmp = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  return {
    object: group,
    grip: { hands: "both", radius: 0.016, style: "neutral" },
    update(rig) {
      if (!rig.joints) return;
      const [a, b] = rig.joints.sides;
      palms(rig, handle.position, tmp);
      // Grip runs from one palm to the other.
      dir.subVectors(a.hand, b.hand);
      if (dir.lengthSq() > 1e-6) handle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
      dir.subVectors(handle.position, pulley);
      cable.scale.set(1, dir.length(), 1);
      cable.quaternion.setFromUnitVectors(down, dir.normalize());
    },
    dispose: geos.dispose,
  };
};


// ─────────────────────────── ropes ───────────────────────────

/** A tube through a moving list of points; vertices are rewritten in place every frame. */
class DynamicTube {
  readonly mesh: THREE.Mesh;
  private readonly pos: Float32Array;
  private readonly nrm: Float32Array;
  private readonly geo: THREE.BufferGeometry;
  private readonly t = new THREE.Vector3();
  private readonly n = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly ref = new THREE.Vector3();

  constructor(
    readonly count: number,
    private readonly radius: number,
    mat: THREE.Material,
    private readonly sides = 6,
  ) {
    const verts = count * sides;
    this.pos = new Float32Array(verts * 3);
    this.nrm = new Float32Array(verts * 3);
    const index: number[] = [];
    for (let i = 0; i < count - 1; i++) {
      for (let k = 0; k < sides; k++) {
        const a = i * sides + k;
        const b = i * sides + ((k + 1) % sides);
        index.push(a, a + sides, b, b, a + sides, b + sides);
      }
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute("normal", new THREE.BufferAttribute(this.nrm, 3));
    this.geo.setIndex(index);
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
  }

  /** Limits what camera framing sees of this tube (an empty box = ignored). */
  setBounds(box: THREE.Box3) {
    this.geo.boundingBox = box;
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  }

  update(points: THREE.Vector3[]) {
    const { t, n, b, ref, sides, radius } = this;
    for (let i = 0; i < this.count; i++) {
      const p = points[i];
      t.subVectors(points[Math.min(i + 1, this.count - 1)], points[Math.max(i - 1, 0)]).normalize();
      ref.set(0, 1, 0);
      if (Math.abs(t.y) > 0.9) ref.set(1, 0, 0);
      n.crossVectors(t, ref).normalize();
      b.crossVectors(t, n);
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const o = (i * sides + k) * 3;
        const nx = n.x * c + b.x * s;
        const ny = n.y * c + b.y * s;
        const nz = n.z * c + b.z * s;
        this.nrm[o] = nx;
        this.nrm[o + 1] = ny;
        this.nrm[o + 2] = nz;
        this.pos[o] = p.x + nx * radius;
        this.pos[o + 1] = p.y + ny * radius;
        this.pos[o + 2] = p.z + nz * radius;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.normal.needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
  }
}

/**
 * Skipping rope. The rope turns once per jump, timed from the pelvis height:
 * overhead when the feet land, under the feet at the top of the jump.
 * Params (authoring cm): groundY, airY — pelvis height on landing and at the top.
 */
const jumpRope: ExtraPropBuilder = (params) => {
  const ground = (250 - num(params, "groundY", 151)) / 100;
  const air = (250 - num(params, "airY", 141)) / 100;
  const geos = new Geos();
  const m = mats();
  const group = new THREE.Group();
  const N = 56;
  const rope = new DynamicTube(N, 0.005, m.red);
  group.add(rope.mesh);
  const handles = [0, 1].map(() => {
    const h = mesh(geos.add(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 12)), m.grip, group);
    return h;
  });
  const points = Array.from({ length: N }, () => new THREE.Vector3());
  const tips = [new THREE.Vector3(), new THREE.Vector3()];
  const mid = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const across = new THREE.Vector3();
  let prevY: number | null = null;
  let rising = true;
  return {
    object: group,
    grip: { hands: "both", radius: 0.014, style: "neutral" },
    update(rig) {
      const j = rig.joints;
      if (!j) return;
      const y = j.pelvis.y;
      if (prevY !== null && Math.abs(y - prevY) > 1e-5) rising = y > prevY;
      prevY = y;
      const h = Math.min(1, Math.max(0, (y - ground) / Math.max(1e-3, air - ground)));
      // Angle of the rope around the hands' axis: π = overhead, π/2 = in front, 0 = under the feet.
      const phi = rising ? Math.PI * (1 - h) : -Math.PI * (1 - h);
      j.sides.forEach((s, i) => {
        // Upright handle in the fist, the rope leaving from its lower end.
        handles[i].position.copy(s.grip);
        tips[i].copy(handles[i].position).y -= 0.07;
      });
      mid.copy(tips[0]).add(tips[1]).multiplyScalar(0.5);
      across.subVectors(tips[0], tips[1]).multiplyScalar(0.5);
      dir.set(Math.sin(phi), -Math.cos(phi), 0);
      // Just clears the floor when it passes under the feet.
      const R = mid.y - 0.04;
      for (let i = 0; i < N; i++) {
        const s = i / (N - 1);
        const r = R * Math.pow(Math.sin(Math.PI * s), 0.55);
        points[i].copy(mid).addScaledVector(across, Math.cos(Math.PI * s)).addScaledVector(dir, r);
      }
      rope.update(points);
    },
    dispose() {
      geos.dispose();
      rope.dispose();
    },
  };
};

/**
 * Two battle ropes anchored far ahead. Waves travel down each rope from the
 * hand's own up-and-down motion (recorded each frame). Params (authoring cm):
 * anchorX — anchor point on the floor ahead (default 620).
 */
const battleRopes: ExtraPropBuilder = (params) => {
  const anchorX = (num(params, "anchorX", 620) - 160) / 100;
  const geos = new Geos();
  const m = mats();
  const group = new THREE.Group();
  const N = 64;
  const ropes = [0, 1].map(() => {
    const t = new DynamicTube(N, 0.019, m.rope, 8);
    // Only the first metre counts for camera framing; the rest runs off-screen.
    t.setBounds(new THREE.Box3());
    group.add(t.mesh);
    return t;
  });
  // Anchor post (ignored by framing too).
  const postGeo = geos.add(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 16));
  postGeo.boundingBox = new THREE.Box3();
  const post = mesh(postGeo, m.frame, group);
  post.position.set(anchorX + 0.08, 0.25, 0);
  post.frustumCulled = false;
  const history = [0, 1].map(() => [] as { t: number; y: number }[]);
  const mean = [0, 0];
  const points = Array.from({ length: N }, () => new THREE.Vector3());
  const hand = new THREE.Vector3();
  const speed = 7; // wave speed, m/s
  const sample = (hist: { t: number; y: number }[], t: number) => {
    for (let k = hist.length - 1; k >= 0; k--) if (hist[k].t <= t) return hist[k].y;
    return hist.length ? hist[0].y : 0;
  };
  return {
    object: group,
    grip: { hands: "both", radius: 0.019, style: "neutral" },
    update(rig) {
      const j = rig.joints;
      if (!j) return;
      const now = performance.now() / 1000;
      j.sides.forEach((s, i) => {
        hand.copy(s.grip);
        const hist = history[i];
        // Several updates at the same instant (camera framing poses every keyframe): start the record afresh.
        if (hist.length && now - hist[hist.length - 1].t < 0.004) hist.length = 0;
        hist.push({ t: now, y: hand.y });
        while (hist.length > 2 && now - hist[0].t > 1.2) hist.shift();
        mean[i] = hist.length === 1 ? hand.y : mean[i] + (hand.y - mean[i]) * 0.05;
        const ax = anchorX;
        const az = Math.sign(hand.z || 1) * 0.12;
        const len = Math.hypot(ax - hand.x, hand.y);
        for (let k = 0; k < N; k++) {
          const u = k / (N - 1);
          const p = points[k];
          p.x = hand.x + (ax - hand.x) * u;
          p.z = hand.z + (az - hand.z) * u;
          // Hangs from the hand and settles toward the floor, with the hand's waves running along it.
          const base = 0.03 + (hand.y - 0.03) * Math.pow(1 - u, 2.2);
          const wave = (sample(hist, now - (u * len) / speed) - mean[i]) * Math.pow(1 - u, 0.8) * 1.4;
          p.y = Math.max(0.02, base + (k === 0 ? 0 : wave));
        }
        ropes[i].update(points);
      });
    },
    dispose() {
      geos.dispose();
      ropes.forEach((r) => r.dispose());
    },
  };
};

// ─────────────────────── cardio machines ───────────────────────

/**
 * Places a catalogue equipment model facing the athlete (+x) and returns a
 * world→model converter. Params (authoring cm): x — model origin; scale.
 */
function placeModel(slug: "treadmill" | "rowing-machine" | "exercise-bike", params: ExtraPropParams) {
  const model: EquipmentModel = buildEquipmentModel(slug);
  const group = new THREE.Group();
  group.add(model.group);
  model.group.position.copy(W(num(params, "x", 160), 250));
  model.group.rotation.y = Math.PI;
  model.group.scale.setScalar(num(params, "scale", 1));
  const local = (world: THREE.Vector3, out: THREE.Vector3) => {
    model.group.updateWorldMatrix(true, false);
    return model.group.worldToLocal(out.copy(world));
  };
  return { model, group, local };
}

/** Moving parts of a model, found by their rest position (null if the model changes). */
function keepPart(model: EquipmentModel, x: number, y: number) {
  return (
    model.group.children.find((c) => c.userData.keep && !(c as THREE.Mesh).isMesh && Math.abs(c.position.x - x) < 0.01 && Math.abs(c.position.y - y) < 0.01) ??
    null
  );
}

/** Treadmill whose belt runs under the athlete. Params: x (authoring cm), speed (belt speed factor). */
const treadmill: ExtraPropBuilder = (params) => {
  const { model, group } = placeModel("treadmill", params);
  const k = num(params, "speed", 0.8);
  return {
    object: group,
    update() {
      model.update?.((performance.now() / 1000) * k, true);
    },
    dispose: () => model.dispose(),
  };
};

/** Rowing machine whose seat, handle and chain follow the athlete. Params: x (authoring cm). */
const rower: ExtraPropBuilder = (params) => {
  const { model, group, local } = placeModel("rowing-machine", params);
  const seat = keepPart(model, 0.1, 0.34);
  const fan = keepPart(model, -0.98, 0.5);
  const handle = model.group.children.find((c) => c.userData.keep && !(c as THREE.Mesh).isMesh && c !== seat && c !== fan) ?? null;
  const chain = (model.group.children.find((c) => c.userData.keep && (c as THREE.Mesh).isMesh) as THREE.Mesh | undefined) ?? null;
  const exit = new THREE.Vector3(-0.78, 0.46, 0);
  const tmp = new THREE.Vector3();
  const p = new THREE.Vector3();
  const end = new THREE.Vector3();
  let last = performance.now();
  return {
    object: group,
    grip: { hands: "both", radius: 0.018 },
    update(rig: BodyRig) {
      const j = rig.joints;
      if (!j) return;
      if (seat) seat.position.x = local(j.pelvis, p).x;
      if (handle) {
        palms(rig, tmp, p);
        local(tmp, p);
        handle.position.set(p.x, p.y, 0);
        if (chain) {
          end.copy(handle.position).add(tmp.set(-0.028, 0, 0));
          const len = Math.max(1e-4, exit.distanceTo(end));
          chain.position.copy(exit);
          chain.quaternion.setFromUnitVectors(Y_AXIS, tmp.subVectors(end, exit).divideScalar(len));
          chain.scale.set(1, len, 1);
        }
      }
      const now = performance.now();
      if (fan) fan.rotation.z -= Math.min(0.1, (now - last) / 1000) * 12;
      last = now;
    },
    dispose: () => model.dispose(),
  };
};

/**
 * Exercise bike whose cranks turn with the athlete's feet. Params: x
 * (authoring cm), scale. The far-side pedal (model +z) follows side 1's foot.
 */
const bike: ExtraPropBuilder = (params) => {
  const { model, group, local } = placeModel("exercise-bike", params);
  const crank = keepPart(model, 0.1, 0.32);
  const pedals: THREE.Object3D[] = [];
  crank?.traverse((o) => {
    if (o !== crank && o.userData.keep) pedals.push(o);
  });
  const ball = new THREE.Vector3();
  const p = new THREE.Vector3();
  return {
    object: group,
    grip: { hands: "both", radius: 0.019, style: "neutral" },
    update(rig: BodyRig) {
      const j = rig.joints;
      if (!j || !crank) return;
      // Pedal axle under the ball of the foot: 9.3 cm ahead of and 6.6 cm below the ankle.
      ball.copy(j.sides[1].ankle).add(p.set(0.093, -0.066, 0));
      local(ball, p);
      const angle = Math.atan2(-(p.x - crank.position.x), -(p.y - crank.position.y));
      crank.rotation.z = -angle;
      for (const pedal of pedals) pedal.rotation.z = angle - pedal.parent!.rotation.z;
    },
    dispose: () => model.dispose(),
  };
};

// ─────────────────────────── doorway ───────────────────────────

/** A door frame for the doorway chest stretch. Params (authoring cm): x — front face of the frame, half — half the opening width. */
const doorway: ExtraPropBuilder = (params) => {
  const x = num(params, "x", 154);
  const half = num(params, "half", 46);
  const geos = new Geos();
  const m = mats();
  const group = new THREE.Group();
  for (const s of [1, -1]) {
    block(geos, group, W(x - 7, 147.5, s * (half + 6)), 0.14, 2.05, 0.12, m.wood);
  }
  block(geos, group, W(x - 7, 39, 0), 0.14, 0.12, (half * 2 + 24) / 100, m.wood);
  return { object: group, dispose: geos.dispose };
};

/** Props for the core & cardio exercise library, keyed by `kind` (use a "core:" prefix). */
export const CORE_PROPS: Record<string, ExtraPropBuilder> = {
  "core:medicine-ball": medicineBall,
  "core:ab-wheel": abWheel,
  "core:hyper-bench": hyperBench,
  "core:side-cable": sideCable,
  "core:jump-rope": jumpRope,
  "core:battle-ropes": battleRopes,
  "core:treadmill": treadmill,
  "core:rower": rower,
  "core:bike": bike,
  "core:doorway": doorway,
};
