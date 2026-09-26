"use client";

import { useEffect } from "react";
import { haptic, type HapticKind } from "@/lib/haptics";

/** Things that tick when tapped: buttons, tabs, the tab bar and anything marked `data-haptic`. */
const TARGETS = 'button:not(:disabled), [role="tab"], [role="switch"], nav[data-app-chrome] a, [data-haptic]';

/** One app-wide listener that gives taps a light haptic tick (see src/lib/haptics.ts). */
export default function Haptics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.detail === 0) return; // keyboard and scripted clicks
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(TARGETS);
      if (!el || el.dataset.haptic === "off") return;
      haptic((el.dataset.haptic as HapticKind | undefined) || (el.getAttribute("role") === "tab" ? "select" : "tap"));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
