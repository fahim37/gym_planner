import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ContactShadow } from "./body/floor";
import { QualityController } from "./body/quality";
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
  private rigInstance: BodyRig | null = null;
  readonly controls: OrbitControls | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly bounds = new THREE.Box3(new THREE.Vector3(-0.5, 0, -0.4), new THREE.Vector3(0.5, 1.9, 0.4));
  private readonly target = new THREE.Vector3(0, 0.9, 0);
  private preset: CameraPreset = "front";
  /** Custom view direction set by frame(); overrides the preset while set. */
  private viewDir: THREE.Vector3 | null = null;
  private readonly key: THREE.DirectionalLight;
  private readonly figure: boolean;
  private readonly contact: ContactShadow | null = null;
  /** Adaptive resolution (null for export stages such as thumbnails). */
  readonly quality: QualityController | null = null;
  private lastRenderAt = -1;
  private lastVersion = -1;
  private lastPulseAt = -1;
  private readonly lastCamera = new THREE.Matrix4();
  private renderedOnce = false;
  /** Leaning figures are viewed from above-behind for the "back" preset. */
  private backLift = 0;
  private tween: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null;
  private pointerType = "mouse";
  private readonly cleanup: (() => void)[] = [];
  private fpsEl: HTMLElement | null = null;
  private fpsFrames = 0;
  private fpsAt = 0;

  /** The anatomy figure, built on first use: `figure: false` stages never pay for it. */
  get rig(): BodyRig {
    this.rigInstance ??= new BodyRig(this.palette);
    return this.rigInstance;
  }

  constructor(canvas: HTMLCanvasElement, opts: StageOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
    });
    const deviceDpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(Math.min(deviceDpr, 2));
    if (!opts.preserveDrawingBuffer) {
      this.quality = new QualityController(deviceDpr, (dpr) => {
        this.renderer.setPixelRatio(dpr);
        this.lastVersion = -1;
      });
      this.renderer.setPixelRatio(this.quality.dpr);
    }
    this.renderer.shadowMap.enabled = true;
    // r186 removed PCFSoftShadowMap; PCF with a Vogel-disk radius is its soft replacement.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // The shadow map is only redrawn when the pose changes (see render()).
    this.renderer.shadowMap.autoUpdate = false;
    // Neutral tone mapping keeps the target-muscle red saturated (ACES shifts it orange).
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Studio image-based lighting plus a key light for shape and shadow, and a cool rim.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.5;
    this.cleanup.push(() => env.dispose());
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bcc6, 0.35));
    const key = (this.key = new THREE.DirectionalLight(0xfffaf3, 2.3));
    key.position.set(2.2, 4.2, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 2.5;
    key.shadow.camera.bottom = -1;
    key.shadow.radius = 5;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.012;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 1.5);
    rim.position.set(-3, 2.8, -2.4);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-1.5, 1, 4);
    this.scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4, 48),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.figure = opts.figure ?? true;
    if (this.figure) {
      this.scene.add(this.rig.group);
      this.contact = new ContactShadow();
      this.scene.add(this.contact.mesh);
    }
    this.watchPointers(canvas);
    if (process.env.NODE_ENV !== "production" && typeof location !== "undefined" && /[?&]fps\b/.test(location.search)) this.showFps(canvas);

    if (opts.interactive) {
      const controls = new OrbitControls(this.camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.09;
      controls.rotateSpeed = 0.9;
      controls.zoomSpeed = 0.9;
      controls.enablePan = false;
      controls.minDistance = 1.0;
      controls.maxDistance = 9;
      controls.maxPolarAngle = Math.PI * 0.62;
      controls.addEventListener("start", () => (this.tween = null));
      this.controls = controls;
    }
  }

  /** Tracks the pointer type (for touch-friendly picking) and double-tap to reset the view. */
  private watchPointers(canvas: HTMLCanvasElement) {
    let lastTap = 0;
    let downAt = 0;
    let downX = 0;
    let downY = 0;
    const down = (e: PointerEvent) => {
      this.pointerType = e.pointerType || "mouse";
      downAt = e.timeStamp;
      downX = e.clientX;
      downY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (!this.controls || e.pointerType !== "touch") return;
      if (e.timeStamp - downAt > 300 || Math.hypot(e.clientX - downX, e.clientY - downY) > 10) return;
      if (e.timeStamp - lastTap < 320) {
        lastTap = 0;
        this.resetView();
      } else lastTap = e.timeStamp;
    };
    const move = (e: PointerEvent) => (this.pointerType = e.pointerType || "mouse");
    canvas.addEventListener("pointerdown", down, { passive: true });
    canvas.addEventListener("pointerup", up, { passive: true });
    canvas.addEventListener("pointermove", move, { passive: true });
    canvas.addEventListener("dblclick", () => this.resetView());
    this.cleanup.push(() => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointermove", move);
    });
  }

  /** Glides the camera back to the current preset's framing. */
  resetView() {
    const dir = this.viewDir ?? this.presetDir(this.preset);
    const dist = this.fitDistance(dir.clone().normalize());
    const to = this.target.clone().addScaledVector(dir.clone().normalize(), dist);
    if (this.controls) this.controls.target.copy(this.target);
    this.tween = { from: this.camera.position.clone(), to, t: 0 };
  }

  /** Dev-only frame-rate readout (append ?fps to the URL). */
  private showFps(canvas: HTMLCanvasElement) {
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;left:6px;bottom:6px;z-index:50;font:11px ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.65);padding:3px 6px;border-radius:6px;pointer-events:none;white-space:pre";
    canvas.parentElement?.appendChild(el);
    this.fpsEl = el;
    this.cleanup.push(() => el.remove());
  }

  /** Direction from the target to the camera for a preset. */
  private presetDir(preset: CameraPreset) {
    const d = PRESETS[preset].clone();
    // A figure leaning forward (rows, deadlifts) shows its back to the sky: look from above-behind.
    if (preset === "back" && this.backLift > 0) d.lerp(new THREE.Vector3(-0.55, 1.35, 0.55), this.backLift);
    return d.normalize();
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
    // How far the figure leans forward on average (torso angle 0 upright … 90 face-down).
    const lean = poses.length ? poses.reduce((a, p) => a + Math.min(90, Math.max(0, p.torso)), 0) / poses.length : 0;
    this.backLift = THREE.MathUtils.smoothstep(lean, 30, 70) * 0.8;
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
    // Once the viewer is live, glide between presets instead of jumping.
    if (this.renderedOnce && this.controls) this.resetView();
    else this.lookFrom(this.presetDir(preset));
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
    const dir = this.viewDir ?? this.presetDir(this.preset);
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
    this.tween = null;
    this.lookFrom(this.viewDir ?? this.presetDir(this.preset));
    this.lastVersion = -1;
  }

  pose(p: Pose) {
    this.rig.update(solvePose(p));
  }

  /**
   * Muscle under a point in normalised device coordinates, if any. Picks on
   * the GPU against the skinned body; touch gets a finger-sized radius.
   */
  pick(ndcX: number, ndcY: number): MuscleId | null {
    if (!this.rigInstance) return null;
    this.scene.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    const radius = this.pointerType === "touch" ? 14 : 3;
    const id = this.rigInstance.pick(this.renderer, this.camera, ndcX, ndcY, radius);
    if (id) return id;
    // Fallback: proxy volumes (e.g. before the mesh has loaded).
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = this.raycaster.intersectObjects(this.rigInstance.muscleMeshes, false)[0];
    return (hit?.object.userData.muscle as MuscleId | undefined) ?? null;
  }

  /**
   * Draws a frame (call from requestAnimationFrame with seconds). Skips the
   * draw when nothing visible changed; the target-muscle pulse alone redraws
   * at most 30 times a second. All motion is time-based.
   */
  render(time = 0) {
    if (typeof document !== "undefined" && document.hidden) return;
    const now = time * 1000;
    const dt = this.lastRenderAt < 0 ? 1 / 60 : Math.min(0.1, Math.max(0, time - this.lastRenderAt / 1000));
    this.lastRenderAt = now;
    this.quality?.frame(now);

    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / 0.55);
      const k = 1 - Math.pow(1 - tw.t, 3);
      this.camera.position.lerpVectors(tw.from, tw.to, k);
      this.camera.lookAt(this.target);
      if (tw.t >= 1) this.tween = null;
    }
    if (this.controls) {
      // Frame-rate independent damping (the factor is per 60 Hz frame).
      this.controls.dampingFactor = 1 - Math.pow(1 - 0.09, dt * 60);
      if (!this.tween) this.controls.update(dt);
    }

    const rig = this.rigInstance;
    let dirty = !this.renderedOnce || this.lastVersion < 0;
    if (rig && this.figure) {
      if (rig.version !== this.lastVersion) {
        dirty = true;
        this.renderer.shadowMap.needsUpdate = true;
        if (rig.joints) this.contact?.update(rig.joints);
      }
      this.lastVersion = rig.version;
      // Gentle pulse on the target muscles.
      if (now - this.lastPulseAt > 33) {
        rig.setPulse(0.5 + 0.5 * Math.sin(time * 3.2));
        this.lastPulseAt = now;
        dirty = true;
      }
    } else {
      this.renderer.shadowMap.needsUpdate = true;
      dirty = true;
    }
    this.camera.updateMatrixWorld();
    if (!this.lastCamera.equals(this.camera.matrixWorld)) {
      this.lastCamera.copy(this.camera.matrixWorld);
      dirty = true;
    }
    if (!dirty) return;
    this.renderer.render(this.scene, this.camera);
    this.renderedOnce = true;
    if (this.fpsEl) {
      this.fpsFrames++;
      if (now - this.fpsAt > 500) {
        const q = this.quality;
        const info = this.renderer.info.render;
        this.fpsEl.textContent = `${Math.round((this.fpsFrames * 1000) / (now - this.fpsAt))} fps · ${q ? q.frameMs.toFixed(1) : "–"} ms (budget ${q ? q.refreshMs.toFixed(1) : "–"})\ndpr ${this.renderer.getPixelRatio().toFixed(2)} ${q?.tier ?? ""} · ${info.calls} calls · ${info.triangles} tris`;
        this.fpsFrames = 0;
        this.fpsAt = now;
      }
    }
  }

  dispose() {
    this.cleanup.forEach((c) => c());
    this.controls?.dispose();
    this.contact?.dispose();
    this.rigInstance?.dispose();
    this.renderer.dispose();
  }
}
