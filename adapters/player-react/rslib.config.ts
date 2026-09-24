import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rslib/core";

// Thin React wrapper around @rustrak/openshowcase-player-core — needs JSX/TSX compilation only.
// autoExternal (default on) keeps `react`, `@rustrak/openshowcase-player-core` and `@rustrak/openshowcase-schema` as
// real imports rather than bundling them in, matching a package meant to be published
// standalone (the consumer brings their own React and the sibling packages).
export default defineConfig({
  lib: [
    {
      format: "esm",
      dts: true,
    },
  ],
  output: {
    target: "web",
  },
  plugins: [pluginReact()],
});
