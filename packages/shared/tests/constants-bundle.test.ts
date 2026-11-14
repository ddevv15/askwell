// Proves the zod-free entry stays zod-free, so the widget loader (5 KB budget)
// can import it. Bundles `constants.ts` the way apps/widget/build.mjs does.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const entry = fileURLToPath(new URL("../constants.ts", import.meta.url));

async function bundle(contents: string) {
  const result = await build({
    stdin: { contents, resolveDir: fileURLToPath(new URL("..", import.meta.url)), loader: "ts" },
    bundle: true,
    minify: true,
    format: "iife",
    target: "es2020",
    platform: "browser",
    write: false,
    metafile: true,
    logLevel: "silent",
  });
  return { code: result.outputFiles[0].text, inputs: Object.keys(result.metafile.inputs) };
}

describe("@askwell/shared/constants", () => {
  it("never imports zod (whole entry)", async () => {
    const { code, inputs } = await bundle(`export * from ${JSON.stringify(entry)};`);
    expect(inputs.filter((p) => p.includes("zod"))).toEqual([]);
    expect(inputs.filter((p) => p.includes("schemas"))).toEqual([]);
    expect(code).not.toMatch(/zod/i);
    // The whole constants entry is small; zod alone would be tens of KB.
    expect(code.length).toBeLessThan(3 * 1024);
  });

  it("a widget-style import stays tiny", async () => {
    const { code } = await bundle(
      `import { APP_NAME, DEFAULT_WIDGET_CONFIG, MAX_MESSAGE_LENGTH } from ${JSON.stringify(entry)};
       console.log(APP_NAME, DEFAULT_WIDGET_CONFIG, MAX_MESSAGE_LENGTH);`,
    );
    expect(code).toContain("Askwell");
    expect(code.length).toBeLessThan(1024);
  });

  it("the full entry does pull in zod (sanity check for this test)", async () => {
    const { inputs } = await bundle(
      `export * from ${JSON.stringify(fileURLToPath(new URL("../index.ts", import.meta.url)))};`,
    );
    expect(inputs.some((p) => p.includes("zod"))).toBe(true);
  });
});
