import { defineConfig } from "@rslib/core";
import tailwindcss from "@tailwindcss/postcss";

export default defineConfig({
  lib: [
    // Bundleless: one readable ESM file per source module, not minified (the host app's
    // bundler minifies), so a host that only imports the tooltip geometry gets just that.
    {
      format: "esm",
      bundle: false,
      source: {
        entry: {
          index: ["./src/**", "!./src/**/__test__/**", "!./src/dom/signals.ts"],
        },
      },
      // tsconfig.build.json limits declarations to what `src/index.ts` reaches
      dts: true,
    },
    // dom/signals with alien-signals compiled in (a devDependency, so it's bundled rather
    // than left as an import): the published package has no runtime dependency on it.
    {
      format: "esm",
      bundle: true,
      source: { entry: { signals: "./src/dom/signals.ts" } },
      output: { distPath: { root: "dist/dom" } },
      dts: false,
    },
  ],
  source: {
    tsconfigPath: "./tsconfig.build.json",
  },
  output: {
    target: "web",
  },
  tools: {
    postcss: (_, { addPlugins }) => addPlugins(tailwindcss()),
  },
});
