import { Timeline } from "@/lib/anatomy/timeline";
import type { Exercise } from "@/lib/exercise-types";
import { PropSet } from "./props";
import type { Highlights } from "./rig";
import { Stage } from "./stage";

/**
 * Renders still images of exercises with one shared offscreen WebGL context,
 * so a grid of cards doesn't need one live canvas (and GPU context) per card.
 */
const WIDTH = 640;
const HEIGHT = 480;
let stage: Stage | null = null;
const cache = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

function getStage() {
  if (!stage) {
    const canvas = document.createElement("canvas");
    stage = new Stage(canvas, { preserveDrawingBuffer: true });
    stage.renderer.setPixelRatio(1);
    stage.resize(WIDTH, HEIGHT);
  }
  return stage;
}

function render(exercise: Exercise): string {
  const s = getStage();
  const highlights: Highlights = {};
  for (const m of exercise.secondary) highlights[m] = "secondary";
  for (const m of exercise.primary) highlights[m] = "primary";
  s.rig.setHighlights(highlights);

  const timeline = new Timeline(exercise.animation);
  const poses = Array.from({ length: timeline.length }, (_, i) => timeline.keyframe(i));
  const props = new PropSet(exercise.animation.props ?? []);
  s.scene.add(props.group);
  s.fit(poses, props);
  const pose = poses[Math.min(1, poses.length - 1)];
  s.pose(pose);
  props.update(s.rig);
  s.setPreset(exercise.animation.camera ?? "front");
  s.render(0.5);
  const url = cropToFigure(s.renderer.domElement);
  s.scene.remove(props.group);
  props.dispose();
  return url;
}

let crop: HTMLCanvasElement | null = null;

/**
 * Crops the render to the figure and its equipment (the opaque pixels; faint floor shadow
 * doesn't count) with a little air, so the figure fills the card like a chart drawing.
 */
function cropToFigure(src: HTMLCanvasElement): string {
  crop ??= document.createElement("canvas");
  crop.width = WIDTH;
  crop.height = HEIGHT;
  const ctx = crop.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src.toDataURL("image/webp", 0.85);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(src, 0, 0, WIDTH, HEIGHT);
  const { data } = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  let x0 = WIDTH;
  let y0 = HEIGHT;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < HEIGHT; y += 2)
    for (let x = 0; x < WIDTH; x += 2)
      if (data[(y * WIDTH + x) * 4 + 3] > 120) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return src.toDataURL("image/webp", 0.85);
  // Grow the box to the card's 4:3 shape with ~6% air, centred on the figure.
  let w = x1 - x0 + 2;
  let h = y1 - y0 + 2;
  const pad = 1.12;
  w *= pad;
  h *= pad;
  if (w / h > WIDTH / HEIGHT) h = (w * HEIGHT) / WIDTH;
  else w = (h * WIDTH) / HEIGHT;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const out = document.createElement("canvas");
  out.width = WIDTH;
  out.height = HEIGHT;
  out.getContext("2d")!.drawImage(src, cx - w / 2, cy - h / 2, w, h, 0, 0, WIDTH, HEIGHT);
  return out.toDataURL("image/webp", 0.85);
}

export function thumbnail(exercise: Exercise): Promise<string> {
  let p = cache.get(exercise.slug);
  if (!p) {
    // Render one at a time, yielding between jobs so scrolling stays smooth.
    p = queue.then(() => getStage().rig.ready).then(() => new Promise<string>((resolve, reject) => {
      requestAnimationFrame(() => {
        try {
          resolve(render(exercise));
        } catch (e) {
          reject(e);
        }
      });
    }));
    queue = p.catch(() => undefined);
    cache.set(exercise.slug, p);
  }
  return p;
}
