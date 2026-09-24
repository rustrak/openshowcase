# @rustrak/openshowcase-player-vue

`<InteractiveDemo />` for Vue: a thin lifecycle wrapper over player-core's `Player`, with the same `src` / `demo` modes as `adapters/player-react`. Keep feature parity between the two. Playback behavior belongs in player-core.

- **The `vue-tsc` step in the `build` script is required.** Don't replace it with `dts: true` in `rslib.config.ts`: Rslib silently emits a generic `DefineComponent<Record<string, unknown>>` for `.vue` files. If the types look generic, inspect `dist/InteractiveDemo.vue.d.ts`, since a passing build proves nothing.
- `--noEmit false` in that step overrides `tsconfig.json`'s `noEmit: true` (which `check-types` needs).
- `vue` is a peer dependency (range), never a direct dependency.
