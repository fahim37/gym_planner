/*
 * IronForm service worker: makes the app installable and fully usable offline.
 *
 * - Build files (/_next/static, fonts, icons) never change once published: cache-first.
 * - Pages: network-first, so you always get the latest when online; the saved copy
 *   when offline. Client-side (RSC) page data is handled the same way.
 * - After install, every page listed by /offline-routes is downloaded in the
 *   background together with the scripts and styles it references, so the whole
 *   guide works offline after the first visit.
 */
const VERSION = "v1";
const STATIC = `ironform-static-${VERSION}`;
const PAGES = `ironform-pages-${VERSION}`;
const SCOPE = new URL(self.registration.scope).pathname.replace(/\/$/, "");

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll([`${SCOPE}/`]).catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, PAGES]);
      for (const key of await caches.keys()) if (key.startsWith("ironform-") && !keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

const isStatic = (url) =>
  url.pathname.startsWith(`${SCOPE}/_next/static/`) ||
  /\/(icon|apple-icon)(\/|$)/.test(url.pathname) ||
  /\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/.test(url.pathname);

const isRsc = (request, url) => request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, key) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(key)) || (await cache.match(key, { ignoreSearch: true }));
    if (hit) return hit;
    if (request.mode === "navigate") {
      const home = await cache.match(`${SCOPE}/`);
      if (home) return home;
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/sw.js")) return;
  if (isStatic(url)) {
    event.respondWith(cacheFirst(request));
  } else if (isRsc(request, url)) {
    // RSC payloads depend on request headers: cache per exact URL; when offline and
    // missing, fail so the router falls back to a full page load from the page cache.
    event.respondWith(networkFirst(request, request));
  } else if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    const key = new Request(url.origin + url.pathname + url.search);
    event.respondWith(networkFirst(request, key));
  }
});

// ── Save everything for offline ──────────────────────────────────────────────

const ASSET_RE = /(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g;

async function saveAll(port) {
  const report = (msg) => port && port.postMessage(msg);
  try {
    const res = await fetch(`${SCOPE}/offline-routes`, { cache: "no-store" });
    const { routes } = await res.json();
    const pages = await caches.open(PAGES);
    const statics = await caches.open(STATIC);
    const assets = new Set();
    let done = 0;
    const queue = routes.slice();
    const worker = async () => {
      while (queue.length) {
        const route = queue.shift();
        const url = `${SCOPE}${route === "/" ? "/" : route}`;
        try {
          const r = await fetch(url, { credentials: "same-origin" });
          if (r.ok) {
            const type = r.headers.get("content-type") || "";
            if (type.includes("text/html")) {
              const html = await r.clone().text();
              for (const m of html.matchAll(ASSET_RE)) assets.add(new URL(m[1].replace(/&amp;/g, "&"), self.location.origin).href);
              await pages.put(new Request(new URL(url, self.location.origin).href), r);
            } else {
              await statics.put(url, r);
            }
          }
        } catch {
          // Offline mid-way: whatever was saved stays saved; the rest follows next time.
        }
        done++;
        if (done % 10 === 0) report({ type: "offline-progress", done, total: routes.length });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    const list = [...assets];
    await Promise.all(
      [0, 1, 2, 3].map(async (k) => {
        for (let i = k; i < list.length; i += 4) {
          if (await statics.match(list[i])) continue;
          try {
            const r = await fetch(list[i]);
            if (r.ok) await statics.put(list[i], r);
          } catch {
            /* retried on the next save */
          }
        }
      }),
    );
    report({ type: "offline-ready", pages: routes.length, assets: list.length });
  } catch (e) {
    report({ type: "offline-error", message: String(e) });
  }
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "save-offline") event.waitUntil(saveAll(event.ports[0]));
});
