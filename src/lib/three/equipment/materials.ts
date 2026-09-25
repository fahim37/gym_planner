import * as THREE from "three";
import { SITE } from "@/config/site";

/**
 * Shared materials and procedural textures for the equipment models. They are
 * created lazily (canvas textures need the DOM), live for the whole session
 * and are never disposed by individual models.
 */

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function canvas(w: number, h: number, draw: Draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  return c;
}

function texture(c: HTMLCanvasElement, { color = false, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

/** Tileable value noise, `octaves` as [cells per side, amplitude]. */
function noise(size: number, octaves: [number, number][], seed: number, contrast = 1) {
  const rand = rng(seed);
  const sum = new Float32Array(size * size);
  let total = 0;
  for (const [n, amp] of octaves) {
    const grid = Float32Array.from({ length: n * n }, rand);
    total += amp;
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * n;
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      const r0 = (y0 % n) * n;
      const r1 = ((y0 + 1) % n) * n;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * n;
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const c0 = x0 % n;
        const c1 = (x0 + 1) % n;
        const a = grid[r0 + c0] + (grid[r0 + c1] - grid[r0 + c0]) * sx;
        const b = grid[r1 + c0] + (grid[r1 + c1] - grid[r1 + c0]) * sx;
        sum[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
  }
  return canvas(size, size, (ctx) => {
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < sum.length; i++) {
      const c = Math.max(0, Math.min(255, 128 + (sum[i] / total - 0.5) * 2 * contrast * 127));
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = c;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });
}

/** Diamond knurl: a grid of little pyramids, 4 per tile side. */
function knurlCanvas() {
  const size = 64;
  const pitch = 16;
  return canvas(size, size, (ctx) => {
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x + y) / pitch;
        const v = (x - y + size) / pitch;
        const h = 1 - 2 * Math.max(Math.abs((u % 1) - 0.5), Math.abs((v % 1) - 0.5));
        const c = 40 + h * 200;
        const i = (y * size + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

/** Studio environment (equirectangular) so metals have something to reflect. */
function studioCanvas() {
  return canvas(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.42, "#d4d4d8");
    g.addColorStop(0.5, "#a1a1aa");
    g.addColorStop(0.53, "#52525b");
    g.addColorStop(1, "#27272a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Softboxes and a window strip give chrome crisp highlights.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(w * 0.08, h * 0.12, w * 0.16, h * 0.16);
    ctx.fillRect(w * 0.58, h * 0.08, w * 0.12, h * 0.22);
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(0, h * 0.34, w, h * 0.035);
    ctx.fillStyle = "#3f3f46";
    ctx.fillRect(0, h * 0.4, w, h * 0.05);
    for (let i = 0; i < 6; i++) ctx.fillRect(w * (0.05 + i * 0.17), h * 0.3, w * 0.012, h * 0.14);
  });
}

function beltCanvas() {
  const rand = rng(11);
  return canvas(64, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#1f1f22";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) {
      ctx.fillStyle = `rgba(255,255,255,${0.05 + rand() * 0.04})`;
      ctx.fillRect(0, y, w, 2);
    }
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rand() * 0.07})`;
      ctx.fillRect(rand() * w, rand() * h, 1, 1);
    }
    // Splice seam and a worn centre track make the motion readable.
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.42);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(w * 0.3, 0, w * 0.4, h);
  });
}

/** Radial vent slots for the rower's fan cage (white = solid). */
function ventCanvas() {
  return canvas(256, 256, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";
    ctx.lineWidth = 7;
    for (let ring = 0; ring < 2; ring++) {
      const r0 = ring ? c * 0.62 : c * 0.3;
      const r1 = ring ? c * 0.88 : c * 0.54;
      const n = ring ? 28 : 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.1;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
        ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
        ctx.stroke();
      }
    }
  });
}

function create() {
  const env = texture(studioCanvas(), { color: true, repeat: false });
  env.mapping = THREE.EquirectangularReflectionMapping;

  const grain = texture(noise(256, [[64, 0.5], [256, 1]], 3, 1.3));
  grain.repeat.set(5, 5);
  const speckle = texture(noise(256, [[96, 0.6], [256, 1]], 5, 1.4));
  speckle.repeat.set(6, 6);
  const powder = texture(noise(128, [[128, 1]], 9, 0.8));
  powder.repeat.set(14, 14);
  const knurl = texture(knurlCanvas());
  knurl.repeat.set(1 / 0.006, 1 / 0.006);
  const foam = texture(noise(256, [[32, 0.4], [128, 1]], 21, 1.2));
  foam.repeat.set(5, 5);
  const vent = texture(ventCanvas(), { repeat: false });

  const std = (p: THREE.MeshStandardMaterialParameters, envIntensity = 0.35) =>
    new THREE.MeshStandardMaterial({ envMap: env, envMapIntensity: envIntensity, ...p });

  const mats = {
    env,
    chrome: std({ color: 0xc4c8d0, roughness: 0.18, metalness: 1 }, 1.1),
    steel: std({ color: 0x9ca3af, roughness: 0.35, metalness: 0.9 }, 0.9),
    knurl: std({ color: 0xa1a5ad, roughness: 0.42, metalness: 1, bumpMap: knurl, bumpScale: 1.2 }, 1),
    aluminium: std({ color: 0xd4d4d8, roughness: 0.3, metalness: 0.85, bumpMap: powder, bumpScale: 0.2 }, 0.9),
    iron: std({ color: 0x232327, roughness: 0.5, metalness: 0.45, bumpMap: speckle, bumpScale: 0.6 }, 0.6),
    frame: std({ color: 0x4b4b53, roughness: 0.38, metalness: 0.55, bumpMap: powder, bumpScale: 0.25 }, 0.7),
    frameDark: std({ color: 0x27272b, roughness: 0.42, metalness: 0.45, bumpMap: powder, bumpScale: 0.25 }, 0.6),
    pad: std({ color: 0x1f1f23, roughness: 0.58, bumpMap: grain, bumpScale: 0.25 }, 0.5),
    welt: std({ color: 0x3f3f46, roughness: 0.5 }, 0.4),
    board: std({ color: 0x111113, roughness: 0.8 }, 0.2),
    rubber: std({ color: 0x151518, roughness: 0.88, bumpMap: speckle, bumpScale: 0.5 }, 0.25),
    grip: std({ color: 0x1c1c1f, roughness: 0.75, bumpMap: speckle, bumpScale: 1 }, 0.3),
    plastic: std({ color: 0x2a2a2e, roughness: 0.45 }, 0.5),
    plasticLight: std({ color: 0x71717a, roughness: 0.4 }, 0.5),
    uhmw: std({ color: 0x18181b, roughness: 0.35 }, 0.5),
    accent: std({ color: 0xf59e0b, roughness: 0.45, metalness: 0.05 }, 0.25),
    red: std({ color: 0xdc2626, roughness: 0.4 }, 0.4),
    cable: std({ color: 0x18181b, roughness: 0.45, metalness: 0.3 }, 0.4),
    hole: new THREE.MeshBasicMaterial({ color: 0x09090b }),
    mat: std({ color: 0x4d7c0f, roughness: 0.92, bumpMap: foam, bumpScale: 1.2 }, 0.2),
    matEdge: std({ color: 0x3f6212, roughness: 0.9 }, 0.2),
    fanCage: std(
      { color: 0x1f1f22, roughness: 0.45, alphaMap: vent, alphaTest: 0.5, side: THREE.DoubleSide },
      0.4,
    ),
    glass: std({ color: 0x0b0b0d, roughness: 0.08, metalness: 0.2 }, 1.2),
  };
  return mats;
}

export type Mats = ReturnType<typeof create>;

let cache: Mats | null = null;

export function mats(): Mats {
  return (cache ??= create());
}

const cached = new Map<string, THREE.Texture>();

function once(key: string, make: () => THREE.Texture) {
  let t = cached.get(key);
  if (!t) cached.set(key, (t = make()));
  return t;
}

/** Scrolling treadmill belt texture; clone it per model (offset is per texture). */
export function beltTexture() {
  return once("belt", () => texture(beltCanvas(), { color: true }));
}

/**
 * Face decal for a bumper plate, mapped onto a RingGeometry of `outer` radius:
 * a coloured band near the rim with the weight printed top and bottom.
 */
export function plateDecal(kg: number, color: string) {
  return once(`plate-${kg}-${color}`, () =>
    texture(
      canvas(256, 256, (ctx, w) => {
        const c = w / 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(c, c, c * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 44px sans-serif";
        ctx.fillText(`${kg}`, c, c * 0.42);
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("KG", c, c * 1.62);
      }),
      { color: true, repeat: false },
    ),
  );
}

/** One row per value, for weight stack plate stickers. Returns the texture and row count. */
export function stackLabels(values: number[]) {
  const key = `stack-${values.join(",")}`;
  const rowH = 32;
  return once(key, () =>
    texture(
      canvas(128, rowH * values.length, (ctx, w) => {
        values.forEach((v, i) => {
          const y = i * rowH;
          ctx.fillStyle = "#e4e4e7";
          ctx.beginPath();
          ctx.roundRect(4, y + 4, w - 8, rowH - 8, 5);
          ctx.fill();
          ctx.fillStyle = "#18181b";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${v} kg`, w / 2, y + rowH / 2 + 1);
        });
      }),
      { color: true, repeat: false },
    ),
  );
}

/** Adjustment holes (and optional numbers) for uprights and tracks; one hole per 64px row. */
export function holeStrip(count: number, numbered: boolean) {
  return once(`holes-${count}-${numbered}`, () =>
    texture(
      canvas(64, 64 * count, (ctx, w) => {
        for (let i = 0; i < count; i++) {
          const y = i * 64 + 32;
          const hx = numbered ? w * 0.4 : w / 2;
          const g = ctx.createRadialGradient(hx, y - 3, 2, hx, y, 12);
          g.addColorStop(0, "#000");
          g.addColorStop(0.8, "#0a0a0c");
          g.addColorStop(1, "#3f3f46");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(hx, y, 11, 0, Math.PI * 2);
          ctx.fill();
          if (numbered && i % 2 === 0) {
            ctx.fillStyle = "#e4e4e7";
            ctx.font = "bold 13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${count - i}`, w * 0.84, y + 5);
          }
        }
      }),
      { color: true, repeat: false },
    ),
  );
}

/** Brand printed on machine panels. */
export const BRAND = SITE.name.toUpperCase();

/** A printed label (weights, logos) on a transparent background. */
export function textLabel(text: string, color: string, w = 256, h = 128, font = "bold 72px sans-serif") {
  return once(`label-${text}-${color}-${w}-${h}-${font}`, () =>
    texture(
      canvas(w, h, (ctx) => {
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, w / 2, h / 2);
      }),
      { color: true, repeat: false },
    ),
  );
}

export type ScreenKind = "treadmill" | "rower" | "bike";

/** Console display artwork, used as an emissive map. */
export function screenTexture(kind: ScreenKind) {
  return once(`screen-${kind}`, () =>
    texture(
      canvas(512, 288, (ctx, w, h) => {
        if (kind === "rower") {
          ctx.fillStyle = "#b9c4a8";
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "#1c2416";
          ctx.font = "bold 64px monospace";
          ctx.textAlign = "left";
          ctx.fillText("2:04.6", 30, 90);
          ctx.font = "bold 30px monospace";
          ctx.fillText("/500m", 330, 90);
          ctx.fillText("1250 m    24 s/m", 30, 160);
          ctx.fillText("04:52     187 W", 30, 215);
          ctx.fillRect(30, 240, w - 60, 3);
          for (let i = 0; i < 12; i++) ctx.fillRect(34 + i * 38, 262 - (i % 4) * 5, 28, 14 + (i % 4) * 5);
          return;
        }
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, w, h);
        const cyan = "#38bdf8";
        const amber = "#fbbf24";
        ctx.textBaseline = "middle";
        if (kind === "treadmill") {
          // 400 m track with the runner's dot, flanked by speed and time.
          ctx.strokeStyle = "#1e3a8a";
          ctx.lineWidth = 16;
          ctx.beginPath();
          ctx.roundRect(150, 70, 212, 150, 75);
          ctx.stroke();
          ctx.strokeStyle = cyan;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.roundRect(150, 70, 212, 150, 75);
          ctx.stroke();
          ctx.fillStyle = amber;
          ctx.beginPath();
          ctx.arc(362, 145, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.textAlign = "center";
          ctx.fillStyle = amber;
          ctx.font = "bold 52px sans-serif";
          ctx.fillText("8.5", 75, 120);
          ctx.fillText("24:10", 440, 120);
          ctx.fillStyle = "#94a3b8";
          ctx.font = "bold 20px sans-serif";
          ctx.fillText("KM/H", 75, 170);
          ctx.fillText("TIME", 440, 170);
          ctx.fillStyle = cyan;
          ctx.font = "bold 30px sans-serif";
          ctx.fillText("2.0%", 75, 240);
          ctx.fillText("312 kcal", 440, 240);
          ctx.fillStyle = "#e2e8f0";
          ctx.font = "bold 24px sans-serif";
          ctx.fillText("3.42 km", 256, 145);
        } else {
          ctx.textAlign = "center";
          ctx.fillStyle = amber;
          ctx.font = "bold 96px sans-serif";
          ctx.fillText("92", 150, 120);
          ctx.fillStyle = cyan;
          ctx.fillText("214", 380, 120);
          ctx.fillStyle = "#94a3b8";
          ctx.font = "bold 26px sans-serif";
          ctx.fillText("RPM", 150, 200);
          ctx.fillText("WATTS", 380, 200);
          ctx.fillStyle = "#1e3a8a";
          ctx.fillRect(40, 240, w - 80, 16);
          ctx.fillStyle = cyan;
          ctx.fillRect(40, 240, (w - 80) * 0.62, 16);
        }
      }),
      { color: true, repeat: false },
    ),
  );
}
