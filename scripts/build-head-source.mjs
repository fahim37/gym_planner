// Extracts the stylised head from the "Male Anatomy Stylized" GLB into
// scripts/body-asset/stylized-head.bin (decimated and relaxed; see body-asset/head-source.ts).
// Run it once per source change, then rebuild the body: node scripts/build-body-asset.mjs
// Usage: node scripts/build-head-source.mjs "<path to Male Anatomy Stylized.glb>"
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(tmpdir(), "ironform-body-asset");
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, "build-head-source.bundle.mjs");
await build({
  entryPoints: [join(root, "scripts", "body-asset", "head-source.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
  logLevel: "error",
});
await import(pathToFileURL(outfile).href);
