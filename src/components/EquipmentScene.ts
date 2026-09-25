import * as THREE from "three";
import type { EquipmentSlug } from "@/lib/equipment-catalog";
import { buildEquipmentModel, type EquipmentModel } from "@/lib/three/equipment";
import { EQUIPMENT_VIEW } from "@/lib/three/equipment-thumbnails";
import { Stage } from "@/lib/three/stage";

/** Where a hotspot lands on screen this frame, in canvas CSS pixels. */
export interface MarkerState {
  x: number;
  y: number;
  /** In front of the camera and inside the canvas. */
  visible: boolean;
  /** Hidden behind part of the model. */
  occluded: boolean;
  /** Distance from the camera, for stacking nearer markers on top. */
  depth: number;
}

interface View {
  target: THREE.Vector3;
  dir: THREE.Vector3;
  dist: number;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const OCCLUSION_INTERVAL = 120;

/**
 * The equipment viewer's 3D side: a Stage with one equipment model, camera
 * tweens to hotspots, the "in use" demo, and hotspot projection for the DOM
 * markers. React owns the render loop and the UI.
 */
export class EquipmentScene {
  readonly stage: Stage;
  readonly model: EquipmentModel;
  readonly hasDemo: boolean;
  /** Part ids the model has a hotspot for. */
  readonly hotspotIds: string[];
  /** Called when the user starts dragging, pinching or scrolling the view. */
  onInteract?: () => void;

  private readonly controls: NonNullable<Stage["controls"]>;
  private readonly slug: EquipmentSlug;
  private demo = false;
  /** Bounds at rest, and (measured on first use) over the whole demo animation. */
  private readonly restBox: THREE.Box3;
  private motionBox: THREE.Box3 | null = null;
  private homeBox: THREE.Box3;
  private readonly center = new THREE.Vector3();
  private readonly radius: number;
  private homeDist: number;
  private sized = false;
  private tween: { from: View; to: View; start: number; dur: number } | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private readonly occluded = new Map<string, boolean>();
  private lastOcclusion = -Infinity;
  private width = 1;
  private height = 1;
  private readonly tmp = new THREE.Vector3();
  private readonly ndc = new THREE.Vector3();
  private readonly ray = new THREE.Vector3();
  private readonly reducedMotion: boolean;

  constructor(canvas: HTMLCanvasElement, slug: EquipmentSlug) {
    this.slug = slug;
    this.stage = new Stage(canvas, { interactive: true, figure: false });
    this.controls = this.stage.controls!;
    this.model = buildEquipmentModel(slug);
    this.stage.scene.add(this.model.group);
    this.model.group.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(this.model.group);
    this.restBox = this.homeBox = box;
    box.getCenter(this.center);
    this.radius = Math.max(0.05, box.getBoundingSphere(new THREE.Sphere()).radius);
    this.homeDist = this.stage.frame(box, { direction: EQUIPMENT_VIEW });
    this.hasDemo = typeof this.model.update === "function";
    this.hotspotIds = Object.keys(this.model.hotspots ?? {});

    // Thin lines (cables) shouldn't count as blocking a hotspot.
    this.raycaster.params.Line.threshold = 0.005;
    this.raycaster.params.Points.threshold = 0.005;

    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.controls.autoRotate = !this.reducedMotion;
    this.controls.autoRotateSpeed = 1.4;
    this.controls.addEventListener("start", this.handleStart);
  }

  private handleStart = () => {
    this.tween = null;
    this.controls.autoRotate = false;
    this.onInteract?.();
  };

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const cam = this.stage.camera;
    const target = this.controls.target.clone();
    const offset = cam.position.clone().sub(target);
    const zoom = offset.length() / this.homeDist;
    this.stage.resize(width, height); // Re-fits the home view to the new aspect.
    this.homeDist = cam.position.distanceTo(this.controls.target);
    this.controls.maxDistance = Math.max(this.controls.maxDistance, this.homeDist * 2);
    if (!this.sized) {
      this.sized = true;
      return;
    }
    // Keep the user's angle, focus point and relative zoom.
    this.controls.target.copy(target);
    cam.position.copy(target).addScaledVector(offset.normalize(), zoom * this.homeDist);
    this.controls.update();
  }

  /** Current camera setup, relative to the orbit target. */
  private currentView(): View {
    const target = this.controls.target.clone();
    const offset = this.stage.camera.position.clone().sub(target);
    return { target, dist: offset.length(), dir: offset.normalize() };
  }

  private animateTo(to: View, keepAutoRotate = false) {
    if (!keepAutoRotate) this.controls.autoRotate = false;
    this.tween = { from: this.currentView(), to, start: performance.now(), dur: this.reducedMotion ? 1 : 900 };
  }

  /** The view that fits `box` from `dir`, without moving the camera yet. */
  private fittedView(box: THREE.Box3, dir: THREE.Vector3): View {
    const from = this.currentView();
    this.homeBox = box;
    this.homeDist = this.stage.frame(box, { direction: dir });
    const to = this.currentView();
    this.controls.target.copy(from.target);
    this.stage.camera.position.copy(from.target).addScaledVector(from.dir, from.dist);
    return to;
  }

  /** Bounds of the model over its demo animation, sampled on a throwaway copy. */
  private measureMotion(): THREE.Box3 {
    if (this.motionBox) return this.motionBox;
    const box = this.restBox.clone();
    try {
      const probe = buildEquipmentModel(this.slug);
      for (let i = 0; probe.update && i <= 240; i++) {
        probe.update(i / 30, true);
        if (i % 4 === 0) box.union(new THREE.Box3().setFromObject(probe.group));
      }
      probe.dispose();
    } catch {
      // Keep the rest bounds.
    }
    return (this.motionBox = box);
  }

  /**
   * Starts or stops the "in use" animation. With `reframe`, the camera eases
   * out to fit the whole motion (and back in when it stops).
   */
  setDemo(on: boolean, reframe: boolean) {
    this.demo = on;
    if (!reframe || !this.hasDemo) return;
    const box = on ? this.measureMotion() : this.restBox;
    if (box.equals(this.homeBox)) return;
    this.animateTo(this.fittedView(box, this.currentView().dir), true);
  }

  /**
   * Swings the camera round to face a part and moves in on it.
   * Returns false (and leaves the camera alone) when the model has no hotspot for it.
   */
  focus(id: string): boolean {
    const local = this.model.hotspots[id];
    if (!local) return false;
    const point = local.clone().applyMatrix4(this.model.group.matrixWorld);
    const current = this.currentView();

    // Look at the side of the model the part is on, blended with the current
    // heading so the camera doesn't swing more than it needs to.
    const heading = current.dir.clone().setY(0);
    if (heading.lengthSq() < 1e-6) heading.set(EQUIPMENT_VIEW.x, 0, EQUIPMENT_VIEW.z);
    heading.normalize();
    const outward = point.clone().sub(this.center).setY(0);
    const horizontal =
      outward.lengthSq() > (this.radius * 0.05) ** 2
        ? heading.multiplyScalar(0.55).add(outward.normalize().multiplyScalar(0.8))
        : heading;
    if (horizontal.lengthSq() < 1e-6) horizontal.copy(outward);
    horizontal.normalize();
    const elevation = THREE.MathUtils.clamp(Math.asin(current.dir.y), 0.3, 0.75);
    const dir = horizontal.multiplyScalar(Math.cos(elevation)).setY(Math.sin(elevation)).normalize();

    const dist = THREE.MathUtils.clamp(this.homeDist * 0.45, this.controls.minDistance * 1.2, this.homeDist);
    // Aim a little below the part so it sits above the info sheet.
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.stage.camera.fov / 2));
    const target = point.clone();
    target.y -= dist * tanV * 0.28;
    this.animateTo({ target, dir, dist });
    return true;
  }

  /** The part whose hotspot is nearest to where a tap hits the model, if the tap lands near one. */
  pickPart(ndcX: number, ndcY: number): string | null {
    // Fingers are imprecise: a tap just outside a marker still counts...
    let best: string | null = null;
    let bestPx = 32;
    for (const id of this.hotspotIds) {
      const ndc = this.ndc.copy(this.model.hotspots[id]).applyMatrix4(this.model.group.matrixWorld).project(this.stage.camera);
      const px = Math.hypot(((ndc.x - ndcX) * this.width) / 2, ((ndc.y - ndcY) * this.height) / 2);
      if (ndc.z < 1 && px < bestPx) {
        bestPx = px;
        best = id;
      }
    }
    if (best) return best;
    // ...and so does a tap on the model near a part's anchor.
    this.raycaster.far = Infinity;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.stage.camera);
    const hit = this.raycaster.intersectObject(this.model.group, true)[0];
    if (!hit) return null;
    let bestDist = Math.max(0.12, this.radius * 0.3);
    for (const id of this.hotspotIds) {
      const d = this.tmp.copy(this.model.hotspots[id]).applyMatrix4(this.model.group.matrixWorld).distanceTo(hit.point);
      if (d < bestDist) {
        bestDist = d;
        best = id;
      }
    }
    return best;
  }

  /** Back to the starting three-quarter view. */
  reset() {
    this.animateTo(this.fittedView(this.homeBox, EQUIPMENT_VIEW));
  }

  render(now: number) {
    const tw = this.tween;
    if (tw) {
      const k = Math.min(1, (now - tw.start) / tw.dur);
      const e = easeInOut(k);
      // Orbit around (rather than cut through) the model: interpolate angles and log-distance.
      const a = new THREE.Spherical().setFromVector3(tw.from.dir);
      const b = new THREE.Spherical().setFromVector3(tw.to.dir);
      let dTheta = b.theta - a.theta;
      if (dTheta > Math.PI) dTheta -= Math.PI * 2;
      if (dTheta < -Math.PI) dTheta += Math.PI * 2;
      const dir = new THREE.Vector3().setFromSphericalCoords(1, a.phi + (b.phi - a.phi) * e, a.theta + dTheta * e);
      const dist = tw.from.dist * (tw.to.dist / tw.from.dist) ** e;
      this.controls.target.lerpVectors(tw.from.target, tw.to.target, e);
      this.stage.camera.position.copy(this.controls.target).addScaledVector(dir, dist);
      if (k >= 1) this.tween = null;
    }
    this.model.update?.(now / 1000, this.demo);
    this.stage.render(now / 1000);
  }

  /** Projects every hotspot to canvas pixels (call after render). */
  project(out: Map<string, MarkerState>, now: number) {
    const cam = this.stage.camera;
    const matrix = this.model.group.matrixWorld;
    const checkOcclusion = now - this.lastOcclusion > OCCLUSION_INTERVAL;
    if (checkOcclusion) this.lastOcclusion = now;
    for (const id of this.hotspotIds) {
      const world = this.tmp.copy(this.model.hotspots[id]).applyMatrix4(matrix);
      const depth = world.distanceTo(cam.position);
      const ndc = this.ndc.copy(world).project(cam);
      const visible = ndc.z < 1 && Math.abs(ndc.x) <= 1.02 && Math.abs(ndc.y) <= 1.02;
      if (checkOcclusion) {
        let blocked = false;
        if (visible) {
          // Anything between the camera and (just short of) the hotspot hides it.
          this.raycaster.set(cam.position, this.ray.copy(world).sub(cam.position).normalize());
          this.raycaster.far = Math.max(0.001, depth - this.radius * 0.1);
          blocked = this.raycaster.intersectObject(this.model.group, true).length > 0;
        }
        this.occluded.set(id, blocked);
      }
      out.set(id, {
        x: ((ndc.x + 1) / 2) * this.width,
        y: ((1 - ndc.y) / 2) * this.height,
        visible,
        occluded: this.occluded.get(id) ?? false,
        depth,
      });
    }
  }

  dispose() {
    this.controls.removeEventListener("start", this.handleStart);
    this.stage.scene.remove(this.model.group);
    this.model.dispose();
    this.stage.dispose();
  }
}
