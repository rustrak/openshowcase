import { defineConfig } from "@rslib/core";

// Pure TS+zod library, no framework/CSS to process. autoExternal (default on) keeps `zod`
// as a real `import` in the output rather than bundling it in — correct for a package meant
// to be published standalone, where the consumer brings their own zod.
export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
    },
  ],
});
