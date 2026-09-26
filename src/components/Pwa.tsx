"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const SAVED_KEY = "ironform:offline-saved";
const DISMISS_KEY = "ironform:install-dismissed";
/** Re-download everything for offline at most this often (ms): new builds get picked up. */
const RESAVE_MS = 12 * 60 * 60 * 1000;

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the app still works, it just asks again.
  }
}

/**
 * Installable, offline-first app:
 * - registers the service worker (public/sw.js) in production;
 * - asks it to save every page for offline use after the first load (and twice a day);
 * - offers an "Install app" button where the browser supports it, and the
 *   Share → Add to Home Screen hint on iPhone;
 * - shows when you're offline and when everything has been saved.
 */
export default function Pwa() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [offline, setOffline] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const dismissed = read(DISMISS_KEY);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      if (!dismissed) setInstallEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const hintTimer = window.setTimeout(() => {
      if (isIos && !standalone && !dismissed) setIosHint(true);
    }, 4000);

    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const offlineTimer = window.setTimeout(() => setOffline(!navigator.onLine), 0);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
      navigator.serviceWorker
        .register(`${base}/sw.js`, { scope: `${base}/` })
        .then(() => navigator.serviceWorker.ready)
        .then((reg) => {
          const last = Number(read(SAVED_KEY) ?? 0);
          if (!reg.active || !navigator.onLine || Date.now() - last < RESAVE_MS) return;
          const channel = new MessageChannel();
          const first = !last;
          channel.port1.onmessage = (ev) => {
            if (ev.data?.type === "offline-ready") {
              write(SAVED_KEY, String(Date.now()));
              if (first) setToast("Saved for offline — the whole guide now works without internet");
            }
          };
          // Let the page finish loading its 3D first; then save quietly in the background.
          window.setTimeout(() => reg.active?.postMessage({ type: "save-offline" }, [channel.port2]), 6000);
        })
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearTimeout(hintTimer);
      window.clearTimeout(offlineTimer);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const dismiss = () => {
    write(DISMISS_KEY, "1");
    setInstallEvent(null);
    setIosHint(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
  };

  const card = "glass pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-xl animate-rise";

  return (
    <div
      data-app-chrome
      className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
      style={{ bottom: "calc(var(--tabbar-offset, 0px) + 0.75rem)" }}
      aria-live="polite"
    >
      {offline && (
        <div className={card}>
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300" />
          <span className="text-zinc-200">You&apos;re offline — showing saved content</span>
        </div>
      )}
      {toast && (
        <div className={card}>
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/20 text-emerald-300">✓</span>
          <span className="text-zinc-200">{toast}</span>
        </div>
      )}
      {(installEvent || iosHint) && (
        <div className={`${card} max-w-md`}>
          <span className="min-w-0 flex-1 text-zinc-200">
            {installEvent ? (
              <>
                <b className="text-white">Install IronForm</b> — opens like an app and works offline.
              </>
            ) : (
              <>
                <b className="text-white">Install IronForm:</b> tap <b className="text-white">Share</b>, then <b className="text-white">Add to Home Screen</b>.
              </>
            )}
          </span>
          {installEvent && (
            <button type="button" onClick={install} className="h-9 shrink-0 rounded-full bg-amber-300 px-4 text-sm font-bold text-zinc-900 active:scale-95">
              Install
            </button>
          )}
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
