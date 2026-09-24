import { defineConfig } from "@rslib/core";

// Pure TS library, no framework/CSS to process. autoExternal (default on) keeps `jszip` and
// `@rustrak/openshowcase-schema` as real `import`s in the output rather than bundling them in — correct
// for a package meant to be published standalone, where the consumer brings their own deps.
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
