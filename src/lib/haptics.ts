/**
 * Light haptic feedback for taps (client only).
 * - Android / Chrome: the Vibration API.
 * - iPhone (Safari 17.4+ / iOS 18): no Vibration API, but toggling a native
 *   `<input type="checkbox" switch>` through its label plays the system tick,
 *   so we keep one hidden switch around and click its label.
 * Must be called from a user gesture (click / pointer handler).
 */

export type HapticKind = "tap" | "select" | "success";

const PATTERN: Record<HapticKind, number | number[]> = {
  tap: 8,
  select: 12,
  success: [14, 60, 22],
};

let label: HTMLLabelElement | null = null;
let last = 0;

function iosSwitch(): HTMLLabelElement | null {
  if (label?.isConnected) return label;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.id = "haptic-switch";
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");
  label = document.createElement("label");
  label.htmlFor = input.id;
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px";
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
}

export function haptic(kind: HapticKind = "tap") {
  if (typeof window === "undefined") return;
  const now = performance.now();
  if (now - last < 40) return; // one tick per gesture
  last = now;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(PATTERN[kind]);
      return;
    }
    const l = iosSwitch();
    if (!l) return;
    l.click();
    if (kind === "success") window.setTimeout(() => l.click(), 90);
  } catch {
    // Haptics are a nicety; never let them break a tap.
  }
}
