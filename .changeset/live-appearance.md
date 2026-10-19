---
"@rustrak/openshowcase-player-core": minor
"@rustrak/openshowcase-player-react": minor
"@rustrak/openshowcase-player-vue": minor
---

Add an `appearance` option (`"light" | "dark" | "auto"`) that overrides the demo's own, so the player can follow the host site's mode, or with `"auto"` the viewer's `prefers-color-scheme` as it changes. It and `hotspotStyle` now apply live (`Player.setAppearance()` / `setHotspotStyle()`, and prop changes in React/Vue) without remounting or restarting the demo.
