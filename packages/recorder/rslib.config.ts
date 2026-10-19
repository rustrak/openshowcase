import { defineConfig } from "@rslib/core";

// A Node CLI: `playwright` and `valibot` stay real imports (autoExternal). The published
// package also carries the built extension (the automated Chromium loads it to record)
// and the agent skill that `install-skill` copies into a project.
export default defineConfig({
  source: {
    tsconfigPath: "./tsconfig.build.json",
    entry: { cli: "./src/bin.ts" },
  },
  lib: [{ format: "esm", syntax: "es2022" }],
  output: {
    target: "node",
    // The extension is copied by the build script instead: rslib would reformat its JS.
    copy: [{ from: "skill", to: "skill" }],
  },
});
