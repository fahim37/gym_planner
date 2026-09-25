#!/usr/bin/env node
// Mobile smoke audit: visits every page of a running server as a 390×844 touch
// phone and reports console errors, uncaught exceptions, HTTP errors, failed
// requests, horizontal overflow, tap targets under 40×40 px, images without
// alt, controls without an accessible name and broken internal links.
//
// Usage:
//   node scripts/audit-pages.mjs [baseUrl] [--out=DIR] [--only=SUBSTRING] [--concurrency=N] [--settle=MS]
//
//   baseUrl        default http://localhost:3100 (start one with `npm run dev -- -p 3100`)
//   --out          report directory (default $AUDIT_OUT or <tmpdir>/gym-workout-audit)
//   --only         audit only routes whose path contains SUBSTRING (e.g. --only=/equipment)
//   --concurrency  pages audited in parallel (default 1; WebGL on CPU is heavy)
//   --settle       ms to wait after load for client rendering (default 1500)
//
// Routes come from src/app/**/page.tsx; dynamic segments are filled from the
// data (served by the app's JSON API, or bundled from src/ with esbuild if the
// API is unavailable). Writes audit.json and audit.txt; exits 1 on errors
// (HTTP errors, exceptions, console errors, broken links, overflow).
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const base = (args.find((a) => !a.startsWith("--")) ?? "http://localhost:3100").replace(/\/$/, "");
const outDir = resolve(flag("out") ?? process.env.AUDIT_OUT ?? join(tmpdir(), "gym-workout-audit"));
const only = flag("only");
const concurrency = Math.max(1, Number(flag("concurrency") ?? 1));
const settle = Number(flag("settle") ?? 1500);
const MIN_TAP = 40;
const VIEWPORT = { width: 390, height: 844 };
const CHROMIUM = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";

// ─────────────────────────────── Routes ───────────────────────────────

async function loadData() {
  const get = async (p) => {
    const r = await fetch(base + p);
    if (!r.ok) throw new Error(`${p} → HTTP ${r.status}`);
    return r.json();
  };
  try {
    const [ex, mus, eq, progs] = await Promise.all([get("/api/exercises"), get("/api/muscles"), get("/api/equipment"), get("/api/programs")]);
    return {
      source: "api",
      exercises: ex.exercises.map((e) => e.slug),
      muscles: mus.map((m) => m.id),
      equipment: eq.equipment.map((e) => e.slug),
      programs: progs.map((p) => ({ slug: p.slug, days: p.days.length })),
    };
  } catch (err) {
    console.warn(`API unavailable (${err.message}); bundling the data from src/ with esbuild instead.`);
    const { build } = await import("esbuild");
    const out = await build({
      stdin: {
        contents: [
          'export { EXERCISES } from "@/data/exercises";',
          'export { PROGRAMS } from "@/data/programs";',
          'export { MUSCLE_IDS } from "@/lib/muscles";',
          'export { EQUIPMENT_CATALOG } from "@/lib/equipment-catalog";',
        ].join("\n"),
        resolveDir: root,
        loader: "ts",
      },
      bundle: true,
      platform: "node",
      format: "esm",
      write: false,
      logLevel: "silent",
      tsconfig: join(root, "tsconfig.json"),
    });
    const mod = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);
    return {
      source: "source",
      exercises: mod.EXERCISES.map((e) => e.slug),
      muscles: [...mod.MUSCLE_IDS],
      equipment: mod.EQUIPMENT_CATALOG.map((e) => e.slug),
      programs: mod.PROGRAMS.map((p) => ({ slug: p.slug, days: p.days.length })),
    };
  }
}

/** Page patterns like "/exercises/[slug]" from src/app/**\/page.tsx (route groups stripped). */
function pagePatterns() {
  const appDir = join(root, "src", "app");
  const found = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (dir === appDir && name === "api") continue;
        if (name.startsWith("_") || name.startsWith("@")) continue;
        walk(p);
      } else if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(name)) {
        const segs = relative(appDir, dir).split(sep).filter((s) => s && !/^\(.*\)$/.test(s));
        found.push(`/${segs.join("/")}`);
      }
    }
  })(appDir);
  return found.sort();
}

/** How to fill each dynamic page pattern; null = deliberately skipped. */
const PARAMS = {
  "/exercises/[slug]": (d) => d.exercises.map((s) => `/exercises/${s}`),
  "/muscles/[id]": (d) => d.muscles.map((s) => `/muscles/${s}`),
  "/equipment/[slug]": (d) => d.equipment.map((s) => `/equipment/${s}`),
  "/programs/[slug]": (d) => d.programs.map((p) => `/programs/${p.slug}`),
  "/programs/[slug]/day/[day]": (d) => d.programs.flatMap((p) => Array.from({ length: p.days }, (_, i) => `/programs/${p.slug}/day/${i + 1}`)),
};

function buildRoutes(data) {
  const routes = [];
  const unaudited = [];
  for (const pattern of pagePatterns()) {
    if (pattern === "/dev" || pattern.startsWith("/dev/")) continue; // authoring tools, 404 in production
    if (!pattern.includes("[")) routes.push({ path: pattern, expect: 200 });
    else if (PARAMS[pattern]) routes.push(...PARAMS[pattern](data).map((path) => ({ path, expect: 200 })));
    else if (PARAMS[pattern] === undefined) unaudited.push(pattern);
  }
  // The not-found page must render cleanly too.
  routes.push({ path: "/exercises/zzz-no-such-exercise", expect: 404 });
  routes.push({ path: "/zzz-no-such-page", expect: 404 });
  return { routes: only ? routes.filter((r) => r.path.includes(only)) : routes, unaudited };
}

// ─────────────────────────── In-page checks ───────────────────────────

/** Runs in the browser. Keep it self-contained. */
function inspectPage(minTap) {
  const vw = window.innerWidth;
  const se = document.scrollingElement || document.documentElement;
  const text = (s) => (s || "").replace(/\s+/g, " ").trim();
  const describe = (el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
    const label = text(el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || el.getAttribute("alt") || el.getAttribute("placeholder")).slice(0, 40);
    const href = el.getAttribute("href");
    return `${tag}${id}${id ? "" : cls}${label ? ` "${label}"` : ""}${href ? ` → ${href}` : ""}`;
  };
  const shown = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
    if (el.closest('[aria-hidden="true"], [inert], [hidden]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const inFixed = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).position === "fixed") return true;
    return false;
  };
  const clippedX = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== "visible") return true;
    }
    return false;
  };

  // Horizontal overflow and the outermost elements causing it.
  const overflowPx = Math.round(se.scrollWidth - vw);
  const offenders = [];
  if (overflowPx > 0) {
    const sticking = new Set();
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if ((r.right > vw + 1 || r.left < -1) && r.width > 0 && !clippedX(el) && !inFixed(el)) sticking.add(el);
    }
    for (const el of sticking) {
      if (sticking.has(el.parentElement)) continue;
      const r = el.getBoundingClientRect();
      offenders.push(`${describe(el)} (x ${Math.round(r.left)}…${Math.round(r.right)})`);
      if (offenders.length >= 5) break;
    }
  }

  // Tap targets.
  const interactive = document.querySelectorAll(
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="slider"], [role="menuitem"], [tabindex]:not([tabindex="-1"])',
  );
  const smallTargets = [];
  const unlabeled = [];
  let inlineLinks = 0;
  for (const el of interactive) {
    if (!shown(el) || getComputedStyle(el).pointerEvents === "none") continue;
    const name = text(
      el.getAttribute("aria-label") ||
        (el.getAttribute("aria-labelledby") || "").split(/\s+/).map((id) => document.getElementById(id)?.textContent).join(" ") ||
        el.textContent ||
        el.getAttribute("title") ||
        [...el.querySelectorAll("img[alt]")].map((i) => i.alt).join(" ") ||
        (el.labels ? [...el.labels].map((l) => l.textContent).join(" ") : "") ||
        el.getAttribute("placeholder") ||
        (el.type === "submit" || el.type === "button" ? el.value : ""),
    );
    if (!name) unlabeled.push(describe(el));
    let r = el.getBoundingClientRect();
    // A small checkbox/radio inside a big <label> is fine: the label is the target.
    for (const l of el.labels ?? []) {
      const lr = l.getBoundingClientRect();
      if (lr.width * lr.height > r.width * r.height) r = lr;
    }
    if (r.width >= minTap && r.height >= minTap) continue;
    const parent = el.parentElement;
    const isInline = getComputedStyle(el).display === "inline" && parent && text(parent.textContent).length > text(el.textContent).length + 10;
    if (isInline) {
      inlineLinks++; // links inside a sentence are exempt (WCAG 2.5.8)
      continue;
    }
    smallTargets.push({ el: describe(el), w: Math.round(r.width), h: Math.round(r.height) });
  }

  const imagesWithoutAlt = [...document.querySelectorAll("img:not([alt])")].map((img) => (img.currentSrc || img.src || "").replace(location.origin, "").slice(0, 80));

  const links = [...document.querySelectorAll("a[href]")]
    .map((a) => new URL(a.getAttribute("href"), location.href))
    .filter((u) => u.origin === location.origin)
    .map((u) => u.pathname);

  const headLinks = [...document.querySelectorAll('link[rel~="icon"], link[rel="manifest"], link[rel="apple-touch-icon"]')].map((l) =>
    new URL(l.getAttribute("href"), location.href).href.replace(location.origin, ""),
  );

  return {
    viewportWidth: vw,
    scrollWidth: se.scrollWidth,
    overflowPx: Math.max(0, overflowPx),
    overflowOffenders: offenders,
    smallTargets,
    inlineLinks,
    unlabeledControls: unlabeled,
    imagesWithoutAlt,
    links: [...new Set(links)],
    headLinks,
    title: document.title,
  };
}

// ────────────────────────────── Runner ──────────────────────────────

const shortUrl = (u) => u.replace(base, "").slice(0, 140);
const clip = (s, n = 300) => (s.length > n ? `${s.slice(0, n)}…` : s);
/** Error text without long stacks / code frames: the first few non-empty lines. */
const firstLines = (s, n = 3) =>
  s
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, n)
    .join(" | ");

async function auditPage(context, route) {
  const page = await context.newPage();
  const url = base + route.path;
  const r = { path: route.path, expect: route.expect, status: null, ms: 0, consoleErrors: [], exceptions: [], failedRequests: [] };
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // Chrome logs the document's own status as an error; expected for the 404 checks.
    const own = m.location().url === url && /Failed to load resource/.test(m.text());
    if (own && route.expect !== 200) return;
    r.consoleErrors.push(clip(firstLines(m.text())));
  });
  page.on("pageerror", (e) => r.exceptions.push(clip(firstLines(e.message || String(e)))));
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url() !== url) r.failedRequests.push(`${res.status()} ${shortUrl(res.url())}`);
  });
  page.on("requestfailed", (req) => {
    const why = req.failure()?.errorText ?? "failed";
    if (!/ERR_ABORTED/.test(why)) r.failedRequests.push(`${why} ${shortUrl(req.url())}`);
  });
  const t0 = Date.now();
  try {
    const res = await page.goto(url, { waitUntil: "load", timeout: 120_000 });
    r.status = res?.status() ?? null;
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(settle);
    // Scroll through the page so lazy content (thumbnails, viewers) renders.
    await page.evaluate(async () => {
      const step = Math.max(200, window.innerHeight * 0.8);
      for (let y = 0; y < document.scrollingElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((ok) => setTimeout(ok, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    Object.assign(r, await page.evaluate(inspectPage, MIN_TAP));
  } catch (err) {
    r.exceptions.push(`audit: ${clip(err.message, 200)}`);
  }
  r.ms = Date.now() - t0;
  await page.close();
  return r;
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

async function statusOf(path) {
  try {
    const res = await fetch(base + path, { redirect: "follow" });
    return res.status;
  } catch (err) {
    return `fetch failed: ${err.message}`;
  }
}

function report(result) {
  const { pages } = result;
  const lines = [];
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const pagesWith = (f) => pages.filter(f);
  const httpErrors = pagesWith((p) => p.status !== p.expect);
  const exceptions = pagesWith((p) => p.exceptions.length);
  const consoleErrors = pagesWith((p) => p.consoleErrors.length);
  const overflow = pagesWith((p) => p.overflowPx > 0);
  const failed = pagesWith((p) => p.failedRequests.length);
  const noAlt = pagesWith((p) => p.imagesWithoutAlt?.length);
  const unlabeled = pagesWith((p) => p.unlabeledControls?.length);

  // Tap targets repeat across pages (shared components): group them.
  const targets = new Map();
  for (const p of pages) {
    for (const t of p.smallTargets ?? []) {
      const key = `${t.el} ${t.w}×${t.h}`;
      const g = targets.get(key) ?? { ...t, pages: [] };
      g.pages.push(p.path);
      targets.set(key, g);
    }
  }
  const groupedTargets = [...targets.values()].sort((a, b) => b.pages.length - a.pages.length);

  const mark = (n) => (n ? "✖" : "✔");
  lines.push(`Mobile audit of ${result.base} — ${plural(pages.length, "page")} at ${VIEWPORT.width}×${VIEWPORT.height} (touch), ${(result.durationMs / 1000).toFixed(0)} s`);
  lines.push(
    `Routes from src/app + ${result.data.source === "api" ? "the JSON API" : "src/ data"}: ${result.data.exercises.length} exercises, ${result.data.muscles.length} muscles, ${result.data.equipment.length} equipment, ${result.data.programs.length} programs`,
  );
  if (result.unaudited.length) lines.push(`⚠ page patterns with no parameter source (not audited — add them to PARAMS): ${result.unaudited.join(", ")}`);
  lines.push("");
  lines.push(`${mark(httpErrors.length)} Unexpected HTTP status: ${plural(httpErrors.length, "page")}`);
  lines.push(`${mark(exceptions.length)} Uncaught exceptions: ${plural(exceptions.length, "page")}`);
  lines.push(`${mark(consoleErrors.length)} Console errors: ${plural(consoleErrors.length, "page")}`);
  lines.push(`${mark(failed.length)} Failed/4xx/5xx requests: ${plural(failed.length, "page")}`);
  lines.push(`${mark(result.brokenLinks.length)} Broken internal links: ${result.brokenLinks.length}`);
  lines.push(`${mark(result.brokenAssets.length)} Broken icons/manifest: ${result.brokenAssets.length}`);
  lines.push(`${mark(overflow.length)} Horizontal overflow: ${plural(overflow.length, "page")}`);
  lines.push(`${mark(groupedTargets.length)} Tap targets < ${MIN_TAP}×${MIN_TAP}px: ${plural(groupedTargets.length, "distinct element")} on ${plural(pagesWith((p) => p.smallTargets?.length).length, "page")}`);
  lines.push(`${mark(noAlt.length)} Images without alt: ${plural(noAlt.length, "page")}`);
  lines.push(`${mark(unlabeled.length)} Controls without an accessible name: ${plural(unlabeled.length, "page")}`);

  const section = (title, rows) => {
    if (!rows.length) return;
    lines.push("", `── ${title} ──`, ...rows);
  };
  const byMessage = (list, key) => {
    const m = new Map();
    for (const p of list) for (const msg of new Set(p[key])) m.set(msg, [...(m.get(msg) ?? []), p.path]);
    return [...m.entries()].map(([msg, paths]) => `  ${msg}\n      on ${paths.length > 3 ? `${paths.slice(0, 3).join(", ")} +${paths.length - 3} more` : paths.join(", ")}`);
  };
  section("Unexpected HTTP status", httpErrors.map((p) => `  ${p.path}: ${p.status} (expected ${p.expect})`));
  section("Uncaught exceptions", byMessage(exceptions, "exceptions"));
  section("Console errors", byMessage(consoleErrors, "consoleErrors"));
  section("Failed requests", byMessage(failed, "failedRequests"));
  section("Broken internal links", result.brokenLinks.map((l) => `  ${l.path} → ${l.status} (linked from ${l.from.slice(0, 3).join(", ")}${l.from.length > 3 ? " …" : ""})`));
  section("Broken icons/manifest", result.brokenAssets.map((a) => `  ${a.path} → ${a.status}`));
  section(
    "Horizontal overflow",
    overflow.map((p) => `  ${p.path}: page is ${p.scrollWidth}px wide in a ${p.viewportWidth}px viewport (+${p.overflowPx}px)${p.overflowOffenders.map((o) => `\n      ${o}`).join("")}`),
  );
  section(
    `Tap targets < ${MIN_TAP}×${MIN_TAP}px`,
    groupedTargets.map((t) => `  ${t.w}×${t.h}  ${t.el}  — ${t.pages.length === pages.length ? "every page" : plural(t.pages.length, "page")} (e.g. ${t.pages[0]})`),
  );
  section("Images without alt", byMessage(noAlt, "imagesWithoutAlt"));
  section("Controls without an accessible name", byMessage(unlabeled, "unlabeledControls"));
  const slow = [...pages].sort((a, b) => b.ms - a.ms).slice(0, 5);
  section("Slowest pages (includes first-hit compile in dev)", slow.map((p) => `  ${(p.ms / 1000).toFixed(1)} s  ${p.path}`));
  return lines.join("\n");
}

async function main() {
  const started = Date.now();
  const data = await loadData();
  const { routes, unaudited } = buildRoutes(data);
  console.log(`Auditing ${routes.length} routes on ${base} (concurrency ${concurrency})…`);

  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  });
  let done = 0;
  const pages = await pool(routes, concurrency, async (route) => {
    const r = await auditPage(context, route);
    done++;
    const flags = [
      r.status !== route.expect && `HTTP ${r.status}`,
      r.exceptions.length && `${r.exceptions.length} exception(s)`,
      r.consoleErrors.length && `${r.consoleErrors.length} console error(s)`,
      r.overflowPx > 0 && `overflow +${r.overflowPx}px`,
      r.smallTargets?.length && `${r.smallTargets.length} small target(s)`,
    ].filter(Boolean);
    console.log(`[${String(done).padStart(3)}/${routes.length}] ${(r.ms / 1000).toFixed(1).padStart(5)}s ${route.path}${flags.length ? `  — ${flags.join(", ")}` : ""}`);
    return r;
  });
  await browser.close();

  // Internal links that point at pages we did not visit.
  const visited = new Set(pages.map((p) => p.path));
  const linkSources = new Map();
  for (const p of pages) for (const l of p.links ?? []) if (!visited.has(l)) linkSources.set(l, [...(linkSources.get(l) ?? []), p.path]);
  const brokenLinks = [];
  for (const [path, from] of linkSources) {
    const status = await statusOf(path);
    if (typeof status !== "number" || status >= 400) brokenLinks.push({ path, status, from });
  }
  const headLinks = [...new Set(pages.flatMap((p) => p.headLinks ?? []))];
  const brokenAssets = [];
  for (const path of headLinks) {
    const status = await statusOf(path);
    if (typeof status !== "number" || status >= 400) brokenAssets.push({ path, status });
  }

  const result = { base, startedAt: new Date(started).toISOString(), durationMs: Date.now() - started, viewport: VIEWPORT, data, unaudited, brokenLinks, brokenAssets, pages };
  const text = report(result);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "audit.json"), JSON.stringify(result, null, 2));
  writeFileSync(join(outDir, "audit.txt"), `${text}\n`);
  console.log(`\n${text}\n\nReport: ${join(outDir, "audit.txt")} (full data: audit.json)`);

  const errors = pages.some((p) => p.status !== p.expect || p.exceptions.length || p.consoleErrors.length || p.overflowPx > 0) || brokenLinks.length || brokenAssets.length;
  process.exitCode = errors ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 2;
});
