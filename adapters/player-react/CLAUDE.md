# @rustrak/openshowcase-player-react

`<InteractiveDemo />` for React: a thin lifecycle wrapper over player-core's `Player`. Playback behavior belongs in player-core, never here.

- Two modes, both must keep working: `src` (fetch + `parseDemo`, asset base inferred from the URL's directory) and `demo` (a preloaded object, used by the extension's editor preview).
- `react` is a peer dependency (range), never a direct dependency.
- Keep feature parity with `adapters/player-vue`.
