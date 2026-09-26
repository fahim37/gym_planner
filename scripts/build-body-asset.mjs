// Builds the sculpted body asset (src/lib/three/body/asset/mh-body.ts) from the
// CC0 MakeHuman assets: downloads them,
// applies the morph targets, fits the mesh onto the rig's bind skeleton, maps
// the skin weights onto our bones and transfers the muscle map from the
// procedural anatomy. Downloads are cached in the OS temp directory.
// Usage: node scripts/build-body-asset.mjs
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(tmpdir(), "ironform-body-asset");
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, "build-body-asset.bundle.mjs");
await build({
  entryPoints: [join(root, "scripts", "body-asset", "build.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
  logLevel: "error",
});
await import(pathToFileURL(outfile).href);
