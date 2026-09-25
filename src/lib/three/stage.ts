import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { solvePose } from "@/lib/anatomy/solver";
import type { CameraPreset, Pose } from "@/lib/anatomy/types";
import type { MuscleId } from "@/lib/muscles";
import { BodyRig, createPalette, worldJoints, type Palette } from "./rig";

const PRESETS: Record<CameraPreset, THREE.Vector3> = {
  front: new THREE.Vector3(0.95, 0.32, 0.85),
  back: new THREE.Vector3(-0.95, 0.4, 0.8),
  side: new THREE.Vector3(0.06, 0.18, 1),
};

export interface StageOptions {
  interactive?: boolean;
  /** Keep the drawing buffer so the canvas can be exported (thumbnails). */
  preserveDrawingBuffer?: boolean;
  /** Show the anatomy figure (default true); off for equipment-only scenes. */
  figure?: boolean;
}

export interface FrameOptions {
  /** View direction: a preset, or a vector from the target towards the camera. Defaults to the current view. */
  direction?: CameraPreset | THREE.Vector3;
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  readonly palette: Palette = createPalette();
  readonly rig = new BodyRig(this.palette);
  readonly controls: OrbitControls | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly bounds = new THREE.Box3(new THREE.Vector3(-0.5, 0, -0.4), new THREE.Vector3(0.5, 1.9, 0.4));
  private readonly target = new THREE.Vector3(0, 0.9, 0);
  private preset: CameraPreset = "front";
  /** Custom view direction set by frame(); overrides the preset while set. */
  private viewDir: THREE.Vector3 | null = null;
  private readonly key: THREE.DirectionalLight;

  constructor(canvas: HTMLCanvasElement, opts: StageOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9ca3af, 1.6));
    const key = (this.key = new THREE.DirectionalLight(0xffffff, 2.4));
    key.position.set(2.5, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 2.5;
    key.shadow.camera.bottom = -1;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0005;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xdbeafe, 1.3);
    rim.position.set(-3, 2.5, -2);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-1, 1, 4);
    this.scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4, 48),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    if (opts.figure ?? true) this.scene.add(this.rig.group);

    if (opts.interactive) {
      const controls = new OrbitControls(this.camera, canvas);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 1.2;
      controls.maxDistance = 9;
      controls.maxPolarAngle = Math.PI * 0.62;
      this.controls = controls;
    }
  }

  /**
   * Frames the camera around every pose the figure will take, including
   * equipment (`props`, re-positioned for each pose).
   */
  fit(poses: Pose[], props?: { group: THREE.Object3D; update: (rig: BodyRig) => void }) {
    const box = new THREE.Box3();
    for (const pose of poses) {
      const j = worldJoints(solvePose(pose));
      box.expandByPoint(j.head.clone().addScaledVector(j.headUp, 0.13));
      for (const s of j.sides) {
        for (const p of [s.hand, s.toe, s.heel, s.knee, s.elbow]) box.expandByPoint(p);
      }
      box.expandByPoint(j.pelvis);
      if (props) {
        this.pose(pose);
        props.update(this.rig);
        props.group.updateMatrixWorld(true);
        box.expandByObject(props.group);
      }
    }
    if (poses.length) this.pose(poses[0]);
    // Barbell plates stick far out sideways; don't let them shrink the figure.
    box.min.z = Math.max(box.min.z, -0.7);
    box.max.z = Math.min(box.max.z, 0.7);
    box.min.y = Math.min(box.min.y, 0);
    this.bounds.copy(box);
    box.getCenter(this.target);
    this.setPreset(this.preset);
  }

  /** Smallest camera distance at which every corner of `bounds` is in view. */
  private fitDistance(dir: THREE.Vector3) {
    const forward = dir.clone().negate();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward);
    const tanV = Math.tan(((this.camera.fov / 2) * Math.PI) / 180);
    const tanH = tanV * this.camera.aspect;
    const { min, max } = this.bounds;
    const corner = new THREE.Vector3();
    let dist = 0.5;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).sub(this.target);
      const depth = corner.dot(forward);
      dist = Math.max(dist, Math.abs(corner.dot(right)) / tanH - depth, Math.abs(corner.dot(up)) / tanV - depth);
    }
    return dist * 1.08;
  }

  /** Places the camera along `dir` at the distance that fits the bounds. */
  private lookFrom(dir: THREE.Vector3) {
    const d = dir.clone().normalize();
    const dist = this.fitDistance(d);
    this.camera.position.copy(this.target).addScaledVector(d, dist);
    this.camera.lookAt(this.target);
    if (this.controls) {
      this.controls.target.copy(this.target);
      this.controls.update();
    }
    return dist;
  }

  setPreset(preset: CameraPreset) {
    this.preset = preset;
    this.viewDir = null;
    this.lookFrom(PRESETS[preset]);
  }

  /**
   * Frames the camera tightly on any object or box (e.g. a piece of
   * equipment). Also scales the orbit zoom range and the key light's shadow
   * to the subject's size. Returns the camera distance used.
   */
  frame(subject: THREE.Object3D | THREE.Box3, opts: FrameOptions = {}): number {
    const box = subject instanceof THREE.Box3 ? subject.clone() : new THREE.Box3().setFromObject(subject);
    if (box.isEmpty()) return this.camera.position.distanceTo(this.target);
    this.bounds.copy(box);
    box.getCenter(this.target);
    if (typeof opts.direction === "string") {
      this.preset = opts.direction;
      this.viewDir = null;
    } else if (opts.direction) {
      this.viewDir = opts.direction.clone().normalize();
    }
    const dir = this.viewDir ?? PRESETS[this.preset].clone().normalize();
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    if (this.controls) {
      // Set before placing the camera: OrbitControls clamps to these on update.
      this.controls.minDistance = Math.max(0.1, sphere.radius * 0.35);
      this.controls.maxDistance = Math.max(this.fitDistance(dir) * 2.5, this.controls.minDistance * 2);
    }
    // Grow (never shrink below the default) the shadow frustum to cover the subject.
    const reach = Math.max(2, sphere.center.length() + sphere.radius);
    const shadow = this.key.shadow.camera;
    shadow.left = -reach;
    shadow.right = reach;
    shadow.top = Math.max(2.5, reach);
    shadow.bottom = -Math.max(1, reach);
    shadow.updateProjectionMatrix();
    return this.lookFrom(dir);
  }

  resize(width: number, height: number) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.lookFrom(this.viewDir ?? PRESETS[this.preset]);
  }

  pose(p: Pose) {
    this.rig.update(solvePose(p));
  }

  /** Muscle under a point in normalised device coordinates, if any. */
  pick(ndcX: number, ndcY: number): MuscleId | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    this.scene.updateMatrixWorld();
    const hit = this.raycaster.intersectObjects(this.rig.group.children, false)[0];
    return (hit?.object.userData.muscle as MuscleId | undefined) ?? null;
  }

  render(time = 0) {
    // Gentle pulse on the target muscles.
    this.palette.primary.emissiveIntensity = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(time * 3.2));
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.controls?.dispose();
    this.renderer.dispose();
  }
}
