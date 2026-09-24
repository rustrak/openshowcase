import { pluginVue } from "@rsbuild/plugin-vue";
import { defineConfig } from "@rslib/core";

// Thin Vue wrapper around @rustrak/openshowcase-player-core — needs .vue SFC compilation only.
// autoExternal (default on) keeps `vue`, `@rustrak/openshowcase-player-core` and `@rustrak/openshowcase-schema` as
// real imports rather than bundling them in, matching a package meant to be published
// standalone (the consumer brings their own Vue and the sibling packages).
//
// dts is off here — Rslib's built-in declaration step falls back to a generic `*.vue`
// module shim (props typed as `Record<string, unknown>`), not real prop types. Real,
// correctly-typed declarations for .vue SFCs need `vue-tsc` specifically, run as a
// separate step in package.json's "build" script.
export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: false,
    },
  ],
  output: {
    target: "web",
  },
  plugins: [pluginVue()],
});
