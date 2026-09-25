import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

// ESM library build: what other workspace packages (player-react, the extension, docs)
// import as a normal JS module — and, eventually, what an external npm consumer installs.
// Consuming `@rustrak/openshowcase-player-core`'s raw .svelte source directly would require every
// consumer's own bundler to understand Svelte — the extension's WXT/rolldown build
// doesn't — so this pre-compiled output is what package.json's "exports" points runtime
// consumers at. Inlines Svelte's compiled runtime and every bit of CSS (Tailwind utilities
// + each component's scoped styles, via cssInjectedByJsPlugin) — no separate stylesheet,
// no Svelte/Tailwind runtime dependency for whoever imports it. Type declarations are a
// separate step (see package.json's "build" script): `dts-bundle-generator` walks the
// import graph from `src/index.ts` and emits one `dist/index.d.ts` — test files are never
// reachable from that entry, so they're excluded automatically, no config needed.
export default defineConfig({
  plugins: [tailwindcss(), svelte(), cssInjectedByJsPlugin()],
  build: {
    outDir: "dist",
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    // The schema (and valibot behind it) is a declared dependency, not something to inline:
    // every consumer already has it (the adapters import `parseDemo` from it), so bundling
    // a private copy here only doubled valibot in the host app.
    rollupOptions: {
      external: ["@rustrak/openshowcase-schema"],
    },
  },
});
