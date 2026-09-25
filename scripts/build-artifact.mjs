// Bundles the whole app into ONE self-contained HTML file (inline JS + CSS)
// that can be published as a claude.ai Artifact and opened on a phone.
//
// Usage: node scripts/build-artifact.mjs [out.html]
import { build } from "esbuild";
import tailwind from "@tailwindcss/postcss";
import postcss from "postcss";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? join(root, "artifact-dist", "ironform.html"));
mkdirSync(dirname(out), { recursive: true });

// 1. Route table from src/app/**/page.tsx (API routes and dev-only pages excluded).
const appDir = join(root, "src/app");
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (dir === appDir && (name === "api" || name === "dev")) continue;
      walk(p);
    } else if (name === "page.tsx") pages.push(p);
  }
})(appDir);
const routesFile = join(dirname(out), "routes.generated.tsx");
const notFound = join(appDir, "not-found.tsx");
writeFileSync(
  routesFile,
  [
    ...pages.map((p, i) => `import * as P${i} from ${JSON.stringify(p)};`),
    existsSync(notFound)
      ? `import NF from ${JSON.stringify(notFound)};\nexport const NotFoundPage = NF;`
      : "export const NotFoundPage = null;",
    `export const ROUTES = [${pages
      .map((p, i) => {
        const segs = relative(appDir, dirname(p))
          .split("/")
          .filter((s) => s && !/^\(.*\)$/.test(s));
        return `{ pattern: ${JSON.stringify("/" + segs.join("/"))}, mod: P${i} }`;
      })
      .join(", ")}];`,
  ].join("\n"),
);

// 2. JavaScript: the app with next/* swapped for small client-side stand-ins.
const shim = (f) => join(root, "artifact/shims", f);
const js = await build({
  entryPoints: [join(root, "artifact/App.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  platform: "browser",
  jsx: "automatic",
  write: false,
  legalComments: "none",
  tsconfig: join(root, "tsconfig.json"),
  alias: {
    "next/link": shim("next-link.tsx"),
    "next/navigation": shim("next-navigation.ts"),
    "next/font/google": shim("next-font.ts"),
    "next/dynamic": shim("next-dynamic.tsx"),
    "artifact-routes": routesFile,
  },
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".css": "empty" },
  logLevel: "warning",
});
const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

// 3. CSS: Tailwind compiled from the app's globals.css, scanning the project.
const cssPath = join(appDir, "globals.css");
const css = (
  await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(readFileSync(cssPath, "utf8"), {
    from: cssPath,
  })
).css;

// 4. One HTML file. The Artifact host wraps it in <html>/<head>/<body>.
const html = `<title>IronForm Gym Guide</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400..900&family=Geist+Mono:wght@400..700&display=swap">
<style>
:root{--font-geist-sans:"Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--font-geist-mono:"Geist Mono",ui-monospace,SFMono-Regular,Menlo,monospace;color-scheme:dark;background:#09090b}
${css}
</style>
<div id="root"></div>
<script>${script}</script>
`;
writeFileSync(out, html);
console.log(`${relative(process.cwd(), out)}  ${(html.length / 1024).toFixed(0)} KB  (${pages.length} routes)`);
