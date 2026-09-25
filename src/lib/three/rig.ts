import * as THREE from "three";
import type { MuscleId } from "@/lib/muscles";
import type { Skeleton, Vec3 } from "@/lib/anatomy/types";

/** Authoring centimetres (y down, floor at 250) → three.js metres (y up). */
export function toWorld(p: Vec3, out = new THREE.Vector3()) {
  return out.set((p[0] - 160) / 100, (250 - p[1]) / 100, p[2] / 100);
}

export function toDir(d: Vec3, out = new THREE.Vector3()) {
  return out.set(d[0], -d[1], d[2]).normalize();
}

export type Emphasis = "primary" | "secondary";
export type Highlights = Partial<Record<MuscleId, Emphasis>>;

const CM = 0.01;
const SPHERE = new THREE.SphereGeometry(1, 36, 24);

/** Inverted-hull contour that gives the figure an illustrated, anatomy-chart outline. */
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x52525b, side: THREE.BackSide });
const OUTLINE_SCALE = 1.045;

export interface Palette {
  skin: THREE.MeshStandardMaterial;
  shorts: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  primary: THREE.MeshStandardMaterial;
  secondary: THREE.MeshStandardMaterial;
  hover: THREE.MeshStandardMaterial;
}

/** Fine vertical striations; on a sphere they run pole-to-pole, i.e. along the muscle. */
function fiberTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let x = 0; x < size; x += 2 + rand() * 3) {
    const shade = Math.floor(90 + rand() * 90);
    ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    ctx.lineWidth = 0.8 + rand() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rand() * 6 - 3, size / 3, x + rand() * 6 - 3, (2 * size) / 3, x, size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

export function createPalette(): Palette {
  const fibers = fiberTexture();
  const muscle = { bumpMap: fibers, bumpScale: 1.4 };
  return {
    skin: new THREE.MeshStandardMaterial({ color: 0xdedee2, roughness: 0.6, metalness: 0.02, ...muscle }),
    shorts: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9 }),
    primary: new THREE.MeshStandardMaterial({
      color: 0xe0311f,
      roughness: 0.45,
      ...muscle,
      emissive: 0x8a0f05,
      emissiveIntensity: 0.35,
    }),
    secondary: new THREE.MeshStandardMaterial({
      color: 0xf28b6c,
      roughness: 0.5,
      ...muscle,
      emissive: 0x6b1d0c,
      emissiveIntensity: 0.12,
    }),
    hover: new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.45,
      emissive: 0x6b5200,
      emissiveIntensity: 0.4,
    }),
  };
}

// Scratch vectors reused every frame.
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

/** Unit vector perpendicular to `axis`, as close as possible to the first usable candidate. */
function perp(axis: THREE.Vector3, out: THREE.Vector3, ...candidates: THREE.Vector3[]) {
  for (const c of candidates) {
    out.copy(c).addScaledVector(axis, -c.dot(axis));
    if (out.lengthSq() > 0.06) return out.normalize();
  }
  out.set(0, 1, 0).addScaledVector(axis, -axis.y);
  if (out.lengthSq() < 1e-4) out.set(1, 0, 0).addScaledVector(axis, -axis.x);
  return out.normalize();
}

/** Places a unit-sphere mesh as an ellipsoid. Radii are in cm: [side, along y-axis, along z-axis]. */
function place(
  mesh: THREE.Mesh,
  center: THREE.Vector3,
  yAxis: THREE.Vector3,
  zHint: THREE.Vector3,
  r: [number, number, number],
) {
  _y.copy(yAxis).normalize();
  perp(_y, _z, zHint, WORLD_UP);
  _x.crossVectors(_y, _z);
  _m.makeBasis(_x.multiplyScalar(r[0] * CM), _y.multiplyScalar(r[1] * CM), _z.multiplyScalar(r[2] * CM));
  _m.setPosition(center);
  mesh.matrix.copy(_m);
  mesh.matrixWorldNeedsUpdate = true;
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);

type Slot = "skin" | "shorts" | "hair";

interface Part {
  mesh: THREE.Mesh;
  muscle?: MuscleId;
  /** Material when the muscle isn't highlighted. */
  base: Slot;
}

/** Joints of the solved skeleton converted to three.js space. */
interface WorldJoints {
  pelvis: THREE.Vector3;
  chest: THREE.Vector3;
  head: THREE.Vector3;
  up: THREE.Vector3;
  forward: THREE.Vector3;
  side: THREE.Vector3;
  chestForward: THREE.Vector3;
  chestSide: THREE.Vector3;
  headUp: THREE.Vector3;
  headForward: THREE.Vector3;
  sides: {
    shoulder: THREE.Vector3;
    elbow: THREE.Vector3;
    wrist: THREE.Vector3;
    hand: THREE.Vector3;
    hip: THREE.Vector3;
    knee: THREE.Vector3;
    ankle: THREE.Vector3;
    heel: THREE.Vector3;
    toe: THREE.Vector3;
    armFront: THREE.Vector3;
    legFront: THREE.Vector3;
  }[];
}

export function worldJoints(sk: Skeleton): WorldJoints {
  return {
    pelvis: toWorld(sk.pelvis),
    chest: toWorld(sk.chest),
    head: toWorld(sk.head),
    up: toDir(sk.up),
    forward: toDir(sk.forward),
    side: new THREE.Vector3(0, 0, 1),
    chestForward: toDir(sk.chestForward),
    chestSide: toDir(sk.chestSide),
    headUp: toDir(sk.headUp),
    headForward: toDir(sk.headForward),
    sides: sk.sides.map((s) => ({
      shoulder: toWorld(s.shoulder),
      elbow: toWorld(s.elbow),
      wrist: toWorld(s.wrist),
      hand: toWorld(s.hand),
      hip: toWorld(s.hip),
      knee: toWorld(s.knee),
      ankle: toWorld(s.ankle),
      heel: toWorld(s.heel),
      toe: toWorld(s.toe),
      armFront: toDir(s.armFront),
      legFront: toDir(s.legFront),
    })),
  };
}

type Updater = (j: WorldJoints) => void;

/**
 * A stylised anatomical figure built from ellipsoid "muscles" that follow
 * the solved skeleton. Every muscle mesh carries its MuscleId so it can be
 * highlighted or picked with a raycaster.
 */
export class BodyRig {
  readonly group = new THREE.Group();
  private readonly parts: Part[] = [];
  private readonly updaters: Updater[] = [];
  private highlights: Highlights = {};
  private hovered: MuscleId | null = null;
  joints: WorldJoints | null = null;

  constructor(private readonly palette: Palette) {
    this.build();
  }

  /** Meshes that belong to a muscle, for raycasting. */
  get muscleMeshes() {
    return this.parts.filter((p) => p.muscle).map((p) => p.mesh);
  }

  private part(base: Slot, muscle?: MuscleId) {
    const mesh = new THREE.Mesh(SPHERE, this.palette[base]);
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.muscle = muscle;
    const outline = new THREE.Mesh(SPHERE, OUTLINE);
    outline.scale.setScalar(OUTLINE_SCALE);
    outline.raycast = () => {};
    mesh.add(outline);
    this.group.add(mesh);
    this.parts.push({ mesh, muscle, base });
    return mesh;
  }

  private on(fn: Updater) {
    this.updaters.push(fn);
  }

  private build() {
    const c = new THREE.Vector3();
    const a = new THREE.Vector3();
    const d = new THREE.Vector3();
    const f = new THREE.Vector3();
    const o = new THREE.Vector3();

    // ---------- Torso ----------
    const ribs = this.part("skin");
    const waist = this.part("skin");
    const pelvis = this.part("shorts");
    const neck = this.part("skin");
    this.on((j) => {
      place(ribs, c.copy(j.pelvis).addScaledVector(j.up, 0.4), j.up, j.chestForward, [17.5, 20.5, 11.8]);
      place(waist, c.copy(j.pelvis).addScaledVector(j.up, 0.18), j.up, j.forward, [13.8, 15, 10]);
      place(pelvis, c.copy(j.pelvis).addScaledVector(j.up, 0.02), j.up, j.forward, [15.2, 10, 10.4]);
      a.copy(j.chest).addScaledVector(j.up, 0.02);
      c.copy(a).add(j.head).multiplyScalar(0.5);
      place(neck, c, d.subVectors(j.head, a), j.headForward, [6.4, 8, 6]);
    });

    const girdle = this.part("skin");
    this.on((j) => {
      place(girdle, c.copy(j.chest).addScaledVector(j.up, -0.035).addScaledVector(j.chestForward, -0.01), j.up, j.chestForward, [19, 7.5, 9.5]);
    });

    const traps = this.part("skin", "traps");
    const trapsLower = this.part("skin", "traps");
    this.on((j) => {
      place(traps, c.copy(j.chest).addScaledVector(j.up, 0.035).addScaledVector(j.chestForward, -0.025), j.up, j.chestForward, [12.5, 6, 6.2]);
      place(trapsLower, c.copy(j.chest).addScaledVector(j.up, -0.08).addScaledVector(j.chestForward, -0.075), j.up, j.chestForward, [4.6, 13, 3.2]);
    });

    for (const sign of [1, -1]) {
      const pec = this.part("skin", "chest");
      const lat = this.part("skin", "lats");
      const rhomboid = this.part("skin", "upper-back");
      const oblique = this.part("skin", "obliques");
      const erector = this.part("skin", "lower-back");
      const glute = this.part("shorts", "glutes");
      this.on((j) => {
        place(pec, c.copy(j.chest).addScaledVector(j.up, -0.085).addScaledVector(j.chestForward, 0.072).addScaledVector(j.chestSide, sign * 0.08), j.up, j.chestForward, [9.8, 7.8, 5]);
        d.copy(j.up).addScaledVector(j.chestSide, sign * 0.3);
        place(lat, c.copy(j.chest).addScaledVector(j.up, -0.2).addScaledVector(j.chestSide, sign * 0.12).addScaledVector(j.chestForward, -0.045), d, j.chestForward, [7.4, 16, 7.6]);
        place(rhomboid, c.copy(j.chest).addScaledVector(j.up, -0.11).addScaledVector(j.chestForward, -0.085).addScaledVector(j.chestSide, sign * 0.055), j.up, j.chestForward, [5, 8.5, 3.2]);
        place(oblique, c.copy(j.pelvis).addScaledVector(j.up, 0.16).addScaledVector(j.side, sign * 0.112).addScaledVector(j.forward, 0.02), j.up, j.forward, [4, 11, 6.8]);
        place(erector, c.copy(j.pelvis).addScaledVector(j.up, 0.15).addScaledVector(j.forward, -0.083).addScaledVector(j.side, sign * 0.035), j.up, j.forward, [3.3, 13.5, 3.2]);
        place(glute, c.copy(j.pelvis).addScaledVector(j.up, -0.03).addScaledVector(j.forward, -0.066).addScaledVector(j.side, sign * 0.07), j.up, j.forward, [8.4, 9.2, 7.6]);
      });
    }

    // Six-pack.
    for (let row = 0; row < 3; row++) {
      for (const sign of [1, -1]) {
        const block = this.part("skin", "abs");
        this.on((j) => {
          const along = 0.1 + row * 0.074;
          const depth = row === 2 ? 0.078 : 0.085;
          place(block, c.copy(j.pelvis).addScaledVector(j.up, along).addScaledVector(j.forward, depth).addScaledVector(j.side, sign * 0.037), j.up, j.forward, [3.4, 3.4, 2.3]);
        });
      }
    }

    // ---------- Head ----------
    const skull = this.part("skin");
    const hair = this.part("hair");
    const jaw = this.part("skin");
    const nose = this.part("skin");
    this.on((j) => {
      place(skull, j.head, j.headUp, j.headForward, [9.4, 11.2, 10.4]);
      place(hair, c.copy(j.head).addScaledVector(j.headUp, 0.03).addScaledVector(j.headForward, -0.022), j.headUp, j.headForward, [9.3, 9.2, 9.6]);
      place(jaw, c.copy(j.head).addScaledVector(j.headUp, -0.05).addScaledVector(j.headForward, 0.032), j.headUp, j.headForward, [7.2, 6.2, 6.6]);
      place(nose, c.copy(j.head).addScaledVector(j.headForward, 0.1).addScaledVector(j.headUp, -0.01), j.headUp, j.headForward, [1.4, 2.2, 1.8]);
    });

    // ---------- Limbs ----------
    for (const i of [0, 1]) {
      const sign = i === 0 ? 1 : -1;

      const deltFront = this.part("skin", "front-delts");
      const deltSide = this.part("skin", "side-delts");
      const deltRear = this.part("skin", "rear-delts");
      const humerus = this.part("skin");
      const biceps = this.part("skin", "biceps");
      const triceps = this.part("skin", "triceps");
      const elbow = this.part("skin");
      const forearm = this.part("skin", "forearms");
      const wristPart = this.part("skin");
      const hand = this.part("skin");
      const out = new THREE.Vector3();
      const side = new THREE.Vector3();
      this.on((j) => {
        const s = j.sides[i];
        d.subVectors(s.elbow, s.shoulder).normalize();
        perp(d, f, s.armFront, j.chestForward);
        side.copy(j.chestSide).multiplyScalar(sign);
        perp(d, out, side, j.up);
        const top = c.copy(s.shoulder).addScaledVector(d, 0.035);
        place(deltSide, o.copy(top).addScaledVector(out, 0.035), d, out, [6, 9, 5.4]);
        place(deltFront, o.copy(top).addScaledVector(f, 0.034).addScaledVector(out, 0.012), d, f, [5.6, 8.6, 4.6]);
        place(deltRear, o.copy(top).addScaledVector(f, -0.034).addScaledVector(out, 0.012), d, f, [5.6, 8.6, 4.6]);

        const mid = a.copy(s.shoulder).add(s.elbow).multiplyScalar(0.5);
        place(humerus, mid, d, f, [4, 15, 4]);
        place(biceps, o.copy(mid).addScaledVector(d, 0.012).addScaledVector(f, 0.026), d, f, [4.4, 11, 4.7]);
        place(triceps, o.copy(mid).addScaledVector(d, -0.01).addScaledVector(f, -0.025), d, f, [4.8, 12.5, 4.7]);
        place(elbow, s.elbow, d, f, [3.8, 3.8, 3.8]);

        d.subVectors(s.wrist, s.elbow).normalize();
        perp(d, f, s.armFront, j.chestForward);
        place(forearm, o.copy(s.elbow).addScaledVector(d, 0.1), d, f, [4.6, 11.5, 4]);
        place(wristPart, o.copy(s.elbow).addScaledVector(d, 0.215), d, f, [2.9, 7, 2.4]);
        place(hand, o.copy(s.wrist).addScaledVector(d, 0.045), d, f, [3, 4.8, 1.9]);
      });

      const shorts = this.part("shorts");
      const femur = this.part("skin");
      const quads = this.part("skin", "quads");
      const teardrop = this.part("skin", "quads");
      const hams = this.part("skin", "hamstrings");
      const adductor = this.part("skin", "adductors");
      const knee = this.part("skin");
      const tibia = this.part("skin");
      const calf = this.part("skin", "calves");
      const foot = this.part("skin");
      const inward = new THREE.Vector3();
      this.on((j) => {
        const s = j.sides[i];
        d.subVectors(s.knee, s.hip).normalize();
        perp(d, f, s.legFront, j.forward);
        inward.copy(j.side).multiplyScalar(-sign);
        perp(d, inward, inward, j.forward);

        const mid = a.copy(s.hip).add(s.knee).multiplyScalar(0.5);
        place(femur, mid, d, f, [7.2, 22, 7.2]);
        place(quads, o.copy(mid).addScaledVector(d, 0.02).addScaledVector(f, 0.03), d, f, [7.8, 20, 6.8]);
        place(teardrop, o.copy(s.knee).addScaledVector(d, -0.075).addScaledVector(f, 0.028).addScaledVector(inward, 0.028), d, f, [4.4, 6.2, 4.2]);
        place(hams, o.copy(mid).addScaledVector(f, -0.033), d, f, [6.9, 19.5, 6]);
        place(adductor, o.copy(mid).addScaledVector(d, -0.06).addScaledVector(inward, 0.035), d, f, [4.6, 14.5, 5]);
        place(shorts, o.copy(s.hip).addScaledVector(d, 0.075), d, f, [9.3, 8.5, 9.3]);
        place(knee, s.knee, d, f, [5.3, 5.3, 5.3]);

        d.subVectors(s.ankle, s.knee).normalize();
        perp(d, f, s.legFront, j.forward);
        place(tibia, o.copy(s.knee).addScaledVector(d, 0.21), d, f, [4.5, 21, 4.8]);
        place(calf, o.copy(s.knee).addScaledVector(d, 0.13).addScaledVector(f, -0.034), d, f, [6, 11.5, 5.6]);

        o.subVectors(s.toe, s.heel);
        const footLen = o.length();
        o.normalize();
        c.copy(s.heel).add(s.toe).multiplyScalar(0.5);
        place(foot, c, o, d.negate(), [3.9, (footLen / CM) * 0.52, 2.8]);
      });
    }
  }

  update(sk: Skeleton) {
    const j = worldJoints(sk);
    this.joints = j;
    for (const u of this.updaters) u(j);
  }

  setHighlights(h: Highlights) {
    this.highlights = h;
    this.applyMaterials();
  }

  setHovered(m: MuscleId | null) {
    if (m === this.hovered) return;
    this.hovered = m;
    this.applyMaterials();
  }

  private applyMaterials() {
    for (const p of this.parts) {
      const emphasis = p.muscle ? this.highlights[p.muscle] : undefined;
      if (p.muscle && p.muscle === this.hovered) p.mesh.material = this.palette.hover;
      else if (emphasis) p.mesh.material = this.palette[emphasis];
      else p.mesh.material = this.palette[p.base];
    }
  }
}
