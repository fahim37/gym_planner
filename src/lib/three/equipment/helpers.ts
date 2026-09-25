import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import type { EquipmentModel } from "./index";
import { mats } from "./materials";

export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const TAU = Math.PI * 2;
const Y = v3(0, 1, 0);

// ---------------------------------------------------------------- geometry

/**
 * Rounded-rectangle tube along +y, centred on the origin: `w` along x, `d`
 * along z. Smooth normals on the rounded edges, flat end caps, UVs in metres.
 */
export function boxTube(w: number, d: number, len: number, r = Math.min(w, d) * 0.2, seg = 3) {
  r = Math.max(0.001, Math.min(r, w / 2 - 1e-4, d / 2 - 1e-4));
  const cx = w / 2 - r;
  const cz = d / 2 - r;
  const prof: [number, number, number, number][] = [];
  [[cx, cz], [-cx, cz], [-cx, -cz], [cx, -cz]].forEach(([x, z], k) => {
    for (let i = 0; i <= seg; i++) {
      const a = ((k + i / seg) * Math.PI) / 2;
      prof.push([x + Math.cos(a) * r, z + Math.sin(a) * r, Math.cos(a), Math.sin(a)]);
    }
  });
  prof.push(prof[0]);
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const h = len / 2;
  let s = 0;
  prof.forEach(([x, z, nx, nz], i) => {
    if (i > 0) s += Math.hypot(x - prof[i - 1][0], z - prof[i - 1][1]);
    pos.push(x, -h, z, x, h, z);
    nor.push(nx, 0, nz, nx, 0, nz);
    uv.push(s, 0, s, len);
  });
  for (let i = 0; i < prof.length - 1; i++) {
    const b = i * 2;
    idx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
  }
  const n = prof.length - 1;
  for (const sign of [1, -1]) {
    const c = pos.length / 3;
    pos.push(0, sign * h, 0);
    nor.push(0, sign, 0);
    uv.push(0, 0);
    for (let i = 0; i < n; i++) {
      pos.push(prof[i][0], sign * h, prof[i][1]);
      nor.push(0, sign, 0);
      uv.push(prof[i][0], prof[i][1]);
    }
    for (let i = 0; i < n; i++) {
      const a = c + 1 + i;
      const b = c + 1 + ((i + 1) % n);
      if (sign > 0) idx.push(c, b, a);
      else idx.push(c, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Cylinder along y with UVs in metres (u around, v along). */
export function cyl(r: number, len: number, seg = 24, rTop = r, open = false) {
  const g = new THREE.CylinderGeometry(rTop, r, len, seg, 1, open);
  scaleUV(g, TAU * Math.max(r, rTop), len);
  return g;
}

export function scaleUV(g: THREE.BufferGeometry, su: number, sv: number) {
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}

/** A profile point [radius, y]; a third element `true` keeps the corner smooth. */
export type ProfilePoint = [number, number] | [number, number, true];

/**
 * Surface of revolution around y with crisp corners (each interior point is
 * doubled unless marked smooth) and UVs in metres.
 */
export function lathe(profile: ProfilePoint[], seg = 40, phiStart = 0, phiLength = TAU) {
  const pts: THREE.Vector2[] = [];
  profile.forEach(([r, y, smooth], i) => {
    const p = new THREE.Vector2(Math.max(0, r), y);
    pts.push(p);
    if (!smooth && i > 0 && i < profile.length - 1) pts.push(p.clone());
  });
  const g = new THREE.LatheGeometry(pts, seg, phiStart, phiLength);
  const along = [0];
  for (let j = 1; j < pts.length; j++) along.push(along[j - 1] + pts[j].distanceTo(pts[j - 1]));
  const rMax = Math.max(...pts.map((p) => p.x));
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i <= seg; i++) {
    for (let j = 0; j < pts.length; j++) uv.setXY(i * pts.length + j, (i / seg) * phiLength * rMax, along[j]);
  }
  return g;
}

export function roundedRect(w: number, h: number, r: number, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  const x = cx - w / 2;
  const y = cy - h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Closed polygon through `points` with every corner rounded by `r`. */
export function roundedPolygon(points: [number, number][], r: number | number[]) {
  const s = new THREE.Shape();
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = new THREE.Vector2(...points[i]);
    const prev = new THREE.Vector2(...points[(i + n - 1) % n]);
    const next = new THREE.Vector2(...points[(i + 1) % n]);
    const rr = Array.isArray(r) ? r[i] : r;
    const a = prev.clone().sub(p);
    const b = next.clone().sub(p);
    const k = Math.min(rr, a.length() / 2, b.length() / 2);
    const p0 = p.clone().add(a.normalize().multiplyScalar(k));
    const p1 = p.clone().add(b.normalize().multiplyScalar(k));
    if (i === 0) s.moveTo(p0.x, p0.y);
    else s.lineTo(p0.x, p0.y);
    s.quadraticCurveTo(p.x, p.y, p1.x, p1.y);
  }
  s.closePath();
  return s;
}

export function circlePath(r: number, cx = 0, cy = 0) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, TAU, true);
  return p;
}

/**
 * Extrudes `shape` along z, centred on z = 0. The bevel rounds the edges and
 * adds `bevel` to every side, so pass a shape shrunk by `bevel`.
 */
export function extrude(shape: THREE.Shape, depth: number, bevel = 0, curveSegments = 10, bevelSegments = 3) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments,
  });
  g.translate(0, 0, -depth / 2);
  const out = toCreasedNormals(g, 0.7);
  g.dispose();
  return out;
}

/** Tube through `points` with rounded corners (fillet radius `bend`). */
export function bentTube(points: THREE.Vector3[], radius: number, bend: number, radial = 14) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  let from = points[0].clone();
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const a = points[i - 1].clone().sub(p);
    const b = points[i + 1].clone().sub(p);
    const k = Math.min(bend, a.length() / 2, b.length() / 2);
    const p0 = p.clone().add(a.normalize().multiplyScalar(k));
    const p1 = p.clone().add(b.normalize().multiplyScalar(k));
    path.add(new THREE.LineCurve3(from, p0));
    path.add(new THREE.QuadraticBezierCurve3(p0, p.clone(), p1));
    from = p1;
  }
  path.add(new THREE.LineCurve3(from, points[points.length - 1].clone()));
  const segs = Math.max(8, path.curves.length * 6);
  const g = new THREE.TubeGeometry(path, segs, radius, radial, false);
  scaleUV(g, path.getLength(), TAU * radius);
  return g;
}

const sharedGeos = new Map<string, THREE.BufferGeometry>();

/** A geometry cached for the session and shared between models (never disposed by them). */
export function shared(key: string, make: () => THREE.BufferGeometry) {
  let g = sharedGeos.get(key);
  if (!g) {
    g = make();
    g.userData.shared = true;
    sharedGeos.set(key, g);
  }
  return g;
}

// --------------------------------------------------------------- placement

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent?: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  parent?.add(m);
  return m;
}

export function at<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): T {
  obj.position.set(x, y, z);
  obj.rotation.set(rx, ry, rz);
  return obj;
}

export function node(parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** Orients `obj` so its +y runs from `a` to `b`, centred between them. */
export function span(obj: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  obj.position.copy(a).add(b).multiplyScalar(0.5);
  obj.quaternion.setFromUnitVectors(Y, b.clone().sub(a).normalize());
  return obj;
}

/** Cylinder from `a` to `b`. */
export function rod(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 20) {
  return span(mesh(cyl(r, a.distanceTo(b), seg), mat, parent), a, b);
}

const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

/**
 * Rectangular tube from `a` to `b`: `w` wide and `d` deep, where the `d` side
 * faces `face` (default: up, or +x for vertical beams).
 */
export function beam(
  parent: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  w: number,
  d: number,
  mat: THREE.Material,
  face?: THREE.Vector3,
  r?: number,
) {
  _y.subVectors(b, a).normalize();
  const hint = face ?? (Math.abs(_y.y) > 0.95 ? v3(1, 0, 0) : Y);
  _z.copy(hint).addScaledVector(_y, -hint.dot(_y)).normalize();
  _x.crossVectors(_y, _z);
  const m = mesh(boxTube(w, d, a.distanceTo(b), r), mat, parent);
  m.quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  return m;
}

/** Axis-aligned rounded box centred at (x, y, z). */
export function block(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material, r?: number) {
  const m = mesh(boxTube(w, d, h, r ?? Math.min(w, h, d) * 0.15, 2), mat, parent);
  m.position.set(x, y, z);
  return m;
}

/** A thin cable that can be re-aimed every frame. */
export class Cable {
  readonly mesh: THREE.Mesh;
  constructor(parent: THREE.Object3D, radius = 0.0035, mat: THREE.Material = mats().cable) {
    const g = new THREE.CylinderGeometry(radius, radius, 1, 8, 1, true);
    g.translate(0, 0.5, 0);
    this.mesh = mesh(g, mat, parent);
    this.mesh.userData.keep = true;
  }
  set(a: THREE.Vector3, b: THREE.Vector3) {
    const len = Math.max(1e-4, a.distanceTo(b));
    this.mesh.position.copy(a);
    this.mesh.quaternion.setFromUnitVectors(Y, _y.subVectors(b, a).divideScalar(len));
    this.mesh.scale.set(1, len, 1);
  }
}

/**
 * A tube whose centreline is re-sampled every frame (ropes, bands). The cross
 * section is an ellipse `rx` × `ry` (ry along the frame normal, which starts
 * close to world up); UVs are in metres along the rest length.
 */
export class DynamicTube {
  readonly mesh: THREE.Mesh;
  private readonly pos: Float32Array;
  private readonly nor: Float32Array;
  private readonly n = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly t = new THREE.Vector3();

  constructor(
    parent: THREE.Object3D,
    mat: THREE.Material,
    readonly samples: number,
    private readonly radial = 10,
    private rx = 0.01,
    private ry = rx,
    private readonly closed = false,
    restLength = 1,
  ) {
    const ring = radial + 1;
    const count = samples * ring;
    this.pos = new Float32Array(count * 3);
    this.nor = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    const idx: number[] = [];
    const circ = Math.PI * (rx + ry);
    for (let i = 0; i < samples; i++) {
      for (let j = 0; j <= radial; j++) uv.set([(i / (samples - 1)) * restLength, (j / radial) * circ], (i * ring + j) * 2);
    }
    const last = closed ? samples : samples - 1;
    for (let i = 0; i < last; i++) {
      const a = i * ring;
      const c = ((i + 1) % samples) * ring;
      for (let j = 0; j < radial; j++) idx.push(a + j, c + j, a + j + 1, a + j + 1, c + j, c + j + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    this.mesh = mesh(g, mat, parent);
    this.mesh.userData.keep = true;
  }

  /** `points` must hold `samples` centreline points. */
  set(points: THREE.Vector3[], rx = this.rx, ry = this.ry) {
    this.rx = rx;
    this.ry = ry;
    const { n, b, t } = this;
    const N = this.samples;
    const ring = this.radial + 1;
    for (let i = 0; i < N; i++) {
      const prev = points[this.closed ? (i - 1 + N) % N : Math.max(0, i - 1)];
      const next = points[this.closed ? (i + 1) % N : Math.min(N - 1, i + 1)];
      t.subVectors(next, prev).normalize();
      if (i === 0) n.set(0, 1, 0);
      n.addScaledVector(t, -n.dot(t));
      if (n.lengthSq() < 1e-6) n.set(1, 0, 0).addScaledVector(t, -t.x);
      n.normalize();
      b.crossVectors(t, n);
      const p = points[i];
      for (let j = 0; j <= this.radial; j++) {
        const a = (j / this.radial) * TAU;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const k = (i * ring + j) * 3;
        this.pos[k] = p.x + b.x * c * rx + n.x * s * ry;
        this.pos[k + 1] = p.y + b.y * c * rx + n.y * s * ry;
        this.pos[k + 2] = p.z + b.z * c * rx + n.z * s * ry;
        const nx = b.x * c * ry + n.x * s * rx;
        const ny = b.y * c * ry + n.y * s * rx;
        const nz = b.z * c * ry + n.z * s * rx;
        const l = Math.hypot(nx, ny, nz) || 1;
        this.nor[k] = nx / l;
        this.nor[k + 1] = ny / l;
        this.nor[k + 2] = nz / l;
      }
    }
    const g = this.mesh.geometry;
    g.getAttribute("position").needsUpdate = true;
    g.getAttribute("normal").needsUpdate = true;
    g.computeBoundingSphere();
    g.boundingBox = null;
  }
}

const decalMats = new Map<string, THREE.MeshStandardMaterial>();

/** Printed label on a plane facing +z (shared material per texture). */
export function decal(parent: THREE.Object3D, tex: THREE.Texture, w: number, h: number) {
  let mat = decalMats.get(tex.uuid);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      depthWrite: false,
    });
    decalMats.set(tex.uuid, mat);
  }
  const m = mesh(new THREE.PlaneGeometry(w, h), mat, parent);
  m.castShadow = false;
  return m;
}

// ------------------------------------------------------------------ model

/** Collects the pieces of one model: hotspots, owned resources, final merge. */
export class Kit {
  readonly m = mats();
  readonly root = new THREE.Group();
  readonly hotspots: Record<string, THREE.Vector3> = {};
  private readonly tracked: { id: string; obj: THREE.Object3D; local: THREE.Vector3 }[] = [];
  private readonly owned: { dispose(): void }[] = [];

  constructor(name: string) {
    this.root.name = name;
  }

  own<T extends { dispose(): void }>(r: T): T {
    this.owned.push(r);
    return r;
  }

  /** A group that will move: excluded from static merging. */
  part(parent: THREE.Object3D = this.root, x = 0, y = 0, z = 0) {
    const g = node(parent, x, y, z);
    g.userData.keep = true;
    return g;
  }

  /** Hotspot at a model-space point, or at `local` inside a moving part (followed on update). */
  spot(id: string, local: THREE.Vector3, part?: THREE.Object3D) {
    this.hotspots[id] = local.clone();
    if (part && part !== this.root) {
      part.userData.keep = true;
      this.tracked.push({ id, obj: part, local: local.clone() });
    }
  }

  private syncSpots() {
    for (const t of this.tracked) {
      const p = this.hotspots[t.id].copy(t.local);
      for (let o: THREE.Object3D | null = t.obj; o && o !== this.root; o = o.parent) {
        o.updateMatrix();
        p.applyMatrix4(o.matrix);
      }
    }
  }

  finish(update?: (time: number, active: boolean) => void): EquipmentModel {
    mergeStatic(this.root);
    this.syncSpots();
    const root = this.root;
    const owned = this.owned;
    return {
      group: root,
      hotspots: this.hotspots,
      update: update
        ? (time, active) => {
            update(time, active);
            this.syncSpots();
          }
        : undefined,
      dispose() {
        const geos = new Set<THREE.BufferGeometry>();
        root.traverse((o) => {
          const g = (o as THREE.Mesh).geometry;
          if ((o as THREE.Mesh).isMesh && !g.userData.shared) geos.add(g);
        });
        geos.forEach((g) => g.dispose());
        owned.forEach((r) => r.dispose());
      },
    };
  }
}

function prepare(src: THREE.BufferGeometry, matrix: THREE.Matrix4) {
  const g = src.clone();
  g.userData = {};
  g.applyMatrix4(matrix);
  for (const name of Object.keys(g.attributes)) {
    if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
  }
  const count = g.getAttribute("position").count;
  if (!g.getAttribute("uv")) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  if (!g.index) {
    const idx = new Uint32Array(count);
    for (let i = 0; i < count; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  if (matrix.determinant() < 0) {
    const idx = g.index!;
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, a);
    }
  }
  g.clearGroups();
  return g;
}

/**
 * Bakes a model's static meshes into one mesh per material, so a model built
 * from hundreds of parts draws in a handful of calls. Static sub-groups are
 * flattened into the nearest ancestor flagged `userData.keep` (or the root);
 * anything animated must carry that flag (see Kit.part).
 */
export function mergeStatic(root: THREE.Object3D) {
  const buckets = new Map<string, { mat: THREE.Material; cast: boolean; geos: THREE.BufferGeometry[] }>();
  const doomed: THREE.Object3D[] = [];
  const nested: THREE.Object3D[] = [];
  const walk = (obj: THREE.Object3D, parentMatrix: THREE.Matrix4) => {
    for (const c of obj.children) {
      if (c.userData.keep) {
        nested.push(c);
        continue;
      }
      c.updateMatrix();
      const matrix = parentMatrix.clone().multiply(c.matrix);
      const m = c as THREE.Mesh;
      if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh && !Array.isArray(m.material) && !c.children.length) {
        const key = `${m.material.uuid}|${m.castShadow}`;
        const b = buckets.get(key) ?? { mat: m.material, cast: m.castShadow, geos: [] };
        b.geos.push(prepare(m.geometry, matrix));
        buckets.set(key, b);
        doomed.push(c);
      } else {
        walk(c, matrix);
      }
    }
  };
  walk(root, new THREE.Matrix4());
  for (const o of doomed) o.removeFromParent();
  for (const b of buckets.values()) {
    const merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    if (b.geos.length > 1) b.geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const out = mesh(merged, b.mat, root);
    out.castShadow = b.cast;
  }
  // Drop groups left empty by the flattening.
  const prune = (obj: THREE.Object3D) => {
    for (const c of [...obj.children]) {
      if (c.userData.keep) continue;
      prune(c);
      if (!c.children.length && !(c as THREE.Mesh).isMesh) c.removeFromParent();
    }
  };
  prune(root);
  for (const n of nested) mergeStatic(n);
}

// --------------------------------------------------------------- animation

/** Converts the absolute `time` passed to update() into a clamped frame delta. */
export class Ticker {
  private last = Number.NaN;
  dt(time: number) {
    const d = Number.isNaN(this.last) ? 0 : time - this.last;
    this.last = time;
    return Math.min(Math.max(d, 0), 0.1);
  }
}

/** Frame-rate independent exponential approach of `cur` to `target`. */
export const damp = (cur: number, target: number, rate: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const smooth = (t: number) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};
/** 0 → 1 → 0 over one period, easing at both ends. */
export const wave = (time: number, period: number) => 0.5 - 0.5 * Math.cos((time / period) * TAU);

/** Spins down to the nearest whole turn (so a part returns to its rest orientation). */
export function settleAngle(angle: number, rate: number, dt: number) {
  return damp(angle, Math.round(angle / TAU) * TAU, rate, dt);
}
