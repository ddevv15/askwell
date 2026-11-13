// Bundles src/index.ts into dist/widget.js (minified IIFE) and fails if it is over the size budget.
import { build } from "esbuild";
import { statSync } from "node:fs";

const OUTFILE = "dist/widget.js";
const MAX_BYTES = 5 * 1024; // 5 KB, project.md §3

await build({
  entryPoints: ["src/index.ts"],
  outfile: OUTFILE,
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  platform: "browser",
  legalComments: "none",
});

const size = statSync(OUTFILE).size;
if (size > MAX_BYTES) {
  console.error(`✖ ${OUTFILE} is ${size} bytes, over the ${MAX_BYTES}-byte budget.`);
  process.exit(1);
}
console.log(`✓ ${OUTFILE}: ${size} bytes (budget ${MAX_BYTES})`);
