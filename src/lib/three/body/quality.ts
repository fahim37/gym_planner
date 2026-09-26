/**
 * Adaptive resolution: keeps the frame rate at the display's refresh
 * (120 Hz phones included) by trading device-pixel ratio.
 *
 * The refresh period is estimated from the fastest steady frame intervals
 * seen (the median of the quickest quarter of recent intervals, snapped to
 * common rates). When the median interval misses that budget, the pixel
 * ratio steps down; when frames have comfortable headroom for a while, it
 * steps back up (with a back-off so it doesn't oscillate).
 */
const RATES = [30, 48, 60, 72, 75, 90, 100, 120, 144, 165, 240];

export type Tier = "high" | "medium" | "low";

export class QualityController {
  /** Current device-pixel ratio to render at. */
  dpr: number;
  readonly maxDpr: number;
  readonly minDpr: number;
  /** Estimated display refresh period (ms). */
  refreshMs = 1000 / 60;
  /** Median frame interval over the last window (ms). */
  frameMs = 0;
  tier: Tier = "high";
  private readonly samples = new Float32Array(90);
  private readonly sorted = new Float32Array(90);
  private count = 0;
  private cursor = 0;
  private last = -1;
  private cooldown = 0;
  private goodFrames = 0;
  private ceiling: number;

  constructor(deviceDpr: number, private readonly onChange: (dpr: number) => void) {
    this.maxDpr = Math.min(Math.max(1, deviceDpr), 3);
    // Never drop below a crisp 1.5× on high-density phones: a sharp figure at a slightly lower
    // frame rate looks far better than a blurry one at 120 fps.
    this.minDpr = Math.min(1.5, this.maxDpr);
    this.dpr = Math.min(this.maxDpr, 2);
    this.ceiling = this.maxDpr;
  }

  /** Call once per rendered frame with the rAF timestamp (ms). */
  frame(now: number) {
    if (this.last < 0 || now - this.last > 250) {
      // First frame, or back from a pause / hidden tab: restart the window.
      this.last = now;
      this.count = 0;
      return;
    }
    const dt = now - this.last;
    this.last = now;
    this.samples[this.cursor] = dt;
    this.cursor = (this.cursor + 1) % this.samples.length;
    this.count = Math.min(this.count + 1, this.samples.length);
    if (this.cooldown > 0) {
      this.cooldown--;
      return;
    }
    if (this.count < 30) return;
    const n = this.count;
    this.sorted.set(this.samples.subarray(0, n));
    const s = this.sorted.subarray(0, n).sort();
    this.frameMs = s[n >> 1];
    const fastest = s[n >> 3];
    let hz = 1000 / fastest;
    let best = RATES[0];
    for (const r of RATES) if (Math.abs(r - hz) < Math.abs(best - hz)) best = r;
    hz = best;
    this.refreshMs = Math.min(this.refreshMs, 1000 / hz);
    const budget = this.refreshMs;
    if (this.frameMs > budget * 1.3 && this.dpr > this.minDpr) {
      // Missing frames: drop resolution (and remember not to climb back past here soon).
      this.ceiling = this.dpr;
      this.set(Math.max(this.minDpr, this.dpr * 0.84));
      this.goodFrames = 0;
    } else if (this.frameMs < budget * 1.08) {
      this.goodFrames++;
      if (this.goodFrames > 180 && this.dpr < Math.min(this.maxDpr, this.ceiling)) {
        this.set(Math.min(this.maxDpr, this.ceiling, this.dpr * 1.12));
        this.goodFrames = 0;
        // Allow a higher ceiling again only slowly.
        this.ceiling = Math.min(this.maxDpr, this.ceiling + 0.1);
      }
    }
  }

  private set(dpr: number) {
    this.dpr = Math.round(dpr * 100) / 100;
    this.tier = this.dpr >= 1.75 ? "high" : this.dpr >= 1.3 ? "medium" : "low";
    this.count = 0;
    this.cooldown = 20;
    this.onChange(this.dpr);
  }
}
