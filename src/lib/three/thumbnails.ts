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
  const url = s.renderer.domElement.toDataURL("image/webp", 0.85);
  s.scene.remove(props.group);
  props.dispose();
  return url;
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
