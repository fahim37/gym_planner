"use client";

import { useEffect, useState } from "react";

/**
 * Keeps the screen on while `active` (Screen Wake Lock API). The browser drops
 * the lock when the page is hidden; it is re-acquired when the page is visible
 * again and released on unmount. Returns whether the lock is currently held.
 */
export function useWakeLock(active: boolean) {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let disposed = false;

    const release = () => {
      const l = lock;
      lock = null;
      setHeld(false);
      l?.release().catch(() => undefined);
    };
    const acquire = async () => {
      if (disposed || lock || document.visibilityState !== "visible") return;
      try {
        const l = await navigator.wakeLock.request("screen");
        if (disposed) {
          l.release().catch(() => undefined);
          return;
        }
        lock = l;
        setHeld(true);
        l.addEventListener("release", () => {
          if (lock === l) {
            lock = null;
            setHeld(false);
          }
        });
      } catch {
        // Denied (battery saver, iframe without permission): the screen may sleep.
      }
    };
    const onVisibility = () => (document.visibilityState === "visible" ? acquire() : release());

    acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [active]);

  return held && active;
}
