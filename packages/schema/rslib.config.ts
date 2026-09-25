import { defineConfig } from "@rslib/core";

// Pure TS+valibot library, no framework/CSS to process. autoExternal (default on) keeps `valibot`
// as a real `import` in the output rather than bundling it in — correct for a package meant
// to be published standalone, where the consumer brings their own valibot.
export default defineConfig({
  // Build-only tsconfig: tests live under src/ (so check-types sees them) but must not get
  // emitted declarations in dist/.
  source: { tsconfigPath: "./tsconfig.build.json" },
  lib: [
    {
      format: "esm",
      dts: true,
    },
  ],
});
