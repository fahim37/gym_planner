// Builds the semantic search data (src/lib/search/semantic-data.ts and
// exercise-vectors.ts) with Gemini embeddings. Run once after changing exercises.
// Usage: GEMINI_API_KEY=… node scripts/build-search-vectors.mjs
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(tmpdir(), "ironform-search-vectors");
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, "build-search-vectors.bundle.mjs");
await build({
  entryPoints: [join(root, "scripts", "search-vectors", "build.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
  logLevel: "error",
});
await import(pathToFileURL(outfile).href);
