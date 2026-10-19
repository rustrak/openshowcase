# @rustrak/openshowcase-player-react

`<InteractiveDemo />` for React: a thin lifecycle wrapper over player-core's `Player`. Playback behavior belongs in player-core, never here.

- Two modes, both must keep working: `src` (player-core's `loadDemo`: a `.openshowcase`/`.zip` bundle or a `steps.json`; call its `dispose()` on cleanup) and `demo` (a preloaded object, used by the extension's editor preview).
- `pnpm test`: Vitest in real Chromium (`--browser.headless`). Bundles in tests come from the real exporter, so they cover exporter → adapter → player.
- `react` is a peer dependency (range), never a direct dependency.
- Keep feature parity with `adapters/player-vue`.
