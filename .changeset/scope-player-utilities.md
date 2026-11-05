---
"@rustrak/openshowcase-player-core": patch
---

Stop the player's Tailwind utilities and theme variables from overriding the host page's. They now carry an `osp` prefix, so classes like `.relative` and `.hidden` no longer leak out of the player.
