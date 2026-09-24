# @rustrak/openshowcase-player-core

Framework-agnostic playback engine used by both adapters and by the extension's editor preview. Written in Svelte 5 (runes) + Tailwind v4, compiled to plain JS. Consumers never see Svelte.

## Build

- `pnpm build`: Vite (CSS inlined into JS, no `.css` output) + `dts-bundle-generator` for `dist/index.d.ts`.
- **Keep `exports["."].default` pointing at `./dist/index.js`** (only `types` points at `src`). Resolving raw source forces every consumer's bundler to compile `.svelte` files, and the extension's build breaks.
- `@rustrak/openshowcase-schema` stays `external` in `vite.config.ts`. Inlining it bundles a second copy of zod.
- `pnpm size`: 35 KB brotli budget for `dist/index.js`.
- `pnpm test`: Vitest projects `unit` (Node, for `core/`) and `component` (covers `__test__/component` + `__test__/integration` in real Chromium via Playwright, not jsdom).

## Code structure

- `src/core/*.ts`: pure orchestration and timing logic (state machines, clip watching, overlay choreography), unit-tested with fake timers and no DOM.
- `src/components/*.svelte`: markup + wiring only. Once a component's script logic grows past ~100 lines, move the decision-making into `core/` with tests.

## Styling: the player lives in other people's pages

- `app.css` imports only Tailwind's theme + utilities, **never full `tailwindcss`** (its preflight resets the host page). Required resets are scoped under `.openshowcase-player`.
- Host CSS is unlayered and beats Tailwind's layered utilities, so visuals that must survive any site (hotspot, tooltip, navbar, spotlight) are styled in scoped `<style>` blocks.
- Overlay sizes use `--wd-u` (the root is an inline-size container), so they scale with the embed. Every animation has a `prefers-reduced-motion` branch.
- The tooltip box and its tail are **one SVG outline** (`core/bubble-path.ts`). Don't reintroduce a separate arrow element: it can't stay seamless with gradients, borders and shadows.
- Spotlight lights are a managed list with timed removal in `PhotoLayer.svelte`, not Svelte outro transitions (those leave elements behind when the step changes mid-transition).
- The extension editor mirrors the hotspot/tooltip look (`apps/extension/entrypoints/editor/components/stage/player-visuals.css`). Update it when changing visuals here.
