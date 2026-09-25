"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Beeps and buzzes for the workout player. Everything here is best effort:
 * browsers without Web Audio / vibration, or sandboxed frames that block them,
 * just stay quiet.
 */

type AudioCtor = typeof AudioContext;
let ctx: AudioContext | null = null;

/** Call from a click/tap handler: browsers only allow audio after a user gesture. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const Ctor: AudioCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => undefined);
  } catch {
    ctx = null;
  }
}

/** A short sine blip with a soft attack/release so it doesn't click. */
export function beep(frequency = 880, ms = 120, volume = 0.25, delay = 0) {
  if (!ctx || ctx.state !== "running") return;
  try {
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.03);
  } catch {
    // Audio graph unavailable.
  }
}

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration blocked (iframe, iOS): ignore.
  }
}

/** Countdown tick for the last seconds of rest. */
export function tick() {
  beep(880, 110);
  buzz(40);
}

/** Rest is over: a brighter double tone and a stronger buzz. */
export function go() {
  beep(1320, 140);
  beep(1760, 220, 0.25, 0.15);
  buzz([120, 60, 120]);
}

// --- Sound on/off preference, kept in this browser. ---
const KEY = "workout:sound";
const listeners = new Set<() => void>();

function readSound() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSoundPref() {
  const on = useSyncExternalStore(subscribe, readSound, () => true);
  const toggle = useCallback(() => {
    const next = !readSound();
    try {
      localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      // Not persisted.
    }
    if (next) unlockAudio();
    listeners.forEach((l) => l());
  }, []);
  return [on, toggle] as const;
}
