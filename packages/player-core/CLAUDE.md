# @rustrak/openshowcase-player-core

Framework-agnostic playback engine used by both adapters and by the extension's editor preview. Plain TypeScript + Tailwind v4, with no UI framework: components are functions built on a small in-house DOM layer (`src/dom/`) over `alien-signals`. The published package depends on nothing but the schema. Keep it that way: the player is embedded in other people's apps, so it must not ship a framework runtime or pull in dependencies.

## Build

- `pnpm build`: Rslib in bundleless mode (`rslib.config.ts`): one readable, unminified ESM file per source module, so a host that imports only the tooltip geometry doesn't get the player. The host app's bundler minifies. Vite is only used by Vitest.
- **No side effects at import time.** `package.json` declares `"sideEffects": ["**/*.css"]`: `dist/app.css` (Tailwind) is the only side-effect import. Components inject their own CSS when they're created (`injectStyles`). Don't add module-level code that touches the DOM or globals.
- **alien-signals is compiled into `dist/`**, not a dependency: it's a `devDependency`, only `src/dom/signals.ts` imports it, and a second, bundled lib in `rslib.config.ts` builds that module (alien-signals included) into `dist/dom/signals.js`. Import signals from `dom/signals`, never from `alien-signals` directly (a Biome `noRestrictedImports` rule enforces it): a direct import would stay in `dist/` as an import of a package the published package doesn't declare.
- Declarations: `tsconfig.build.json` starts them at `src/index.ts`.
- **Keep `exports["."].default` pointing at `./dist/index.js`.**
- `pnpm size` (`.size-limit.mjs`): what a host ships, bundled and minified by esbuild. `Player` (JS + CSS) within 35 KB, and the tooltip geometry alone within 2 KB, which fails if the player stops tree-shaking away.
- `pnpm test`: Vitest projects `unit` (Node, for `core/`) and `component` (covers `__test__/component` + `__test__/integration` in real Chromium via Playwright, not jsdom). Run it with `--browser.headless`.

## Code structure

- `src/core/*.ts`: pure orchestration and timing logic (state machines, clip watching, overlay choreography), unit-tested with fake timers and no DOM.
- `src/dom/`: the DOM layer. `h()`/`svg()` create elements; a function prop or child stays bound to the signals it reads (one effect per binding, nothing re-renders). `show()` is `{#if}` (with an optional exit animation), `each()` is a keyed list, `mount()` owns a scope whose dispose stops every binding. Views created by `show()`/`each()` live in scopes detached from the effect that creates them: alien-signals disposes an effect's child effects on every re-run.
- `src/ui/<Component>/`: one folder per component, `<Component>.ts` (the component) + `<Component>.styles.ts` (its CSS, when it has any), markup + wiring only. Props are `ViewProps<P>`: data as getters, `on*` callbacks as is. Once a component's logic grows past ~100 lines, move the decision-making into `core/` with tests.
- Signal writes apply at once. Group writes that must land together (a step render, the photo/video swap) in `batch()`.
- Tests: `renderView()` (`__test__/render-view.ts`) mounts a component with plain props, each one a signal that `rerender()` sets.

## Styling: the player lives in other people's pages

- `app.css` imports only Tailwind's theme + utilities, **never full `tailwindcss`** (its preflight resets the host page). Required resets are scoped under `.openshowcase-player`.
- Host CSS is unlayered and beats Tailwind's layered utilities, so visuals that must survive any site (hotspot, tooltip, navbar, spotlight) are styled in each component's `*.styles.ts`, unlayered.
- Every selector in a `*.styles.ts` starts with `.openshowcase-player` (so it never leaks onto the host page) and every `@keyframes` name with `openshowcase-`. Class names are global inside the player: don't reuse one across components (`video.media`/`img.media` are told apart by tag).
- Overlay sizes use `--wd-u` (the root is an inline-size container), so they scale with the embed. Every animation has a `prefers-reduced-motion` branch.
- The tooltip box and its tail are **one SVG outline** (`core/bubble-path.ts`). Don't reintroduce a separate arrow element: it can't stay seamless with gradients, borders and shadows.
- Spotlight lights are a managed list with timed removal in `ui/PhotoLayer/PhotoLayer.ts`, not exit animations (a light must leave in place even when the step changes mid-fade).
- The extension editor mirrors the hotspot/tooltip look (`apps/extension/entrypoints/editor/components/stage/player-visuals.css`). Update it when changing visuals here.
