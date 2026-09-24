# @rustrak/openshowcase-exporter

Builds the exported `demo.zip` in the browser (called from the extension's editor). It is not a Node/CLI tool.

- `buildDemoBundle` produces **pure data only**: `steps.json` + `assets/*.webp` + `assets/recording.webm`. It embeds no player runtime and doesn't depend on player-core. A self-contained HTML export mode was removed deliberately, so check with the maintainer before adding one back.
- Dependencies are only `@rustrak/openshowcase-schema` and `jszip`. Keep it that way (3 KB brotli budget, `pnpm size`).
- `image.ts` uses `OffscreenCanvas`/`createImageBitmap`, so every test runs in real Chromium (Vitest browser mode + Playwright). There is no Node project.
- `optimizeDeps.include: ["jszip"]` in `vitest.config.ts` stays: on-demand optimization mid-run reloads the page and breaks the in-flight test.
