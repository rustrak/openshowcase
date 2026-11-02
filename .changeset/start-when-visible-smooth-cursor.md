---
"@rustrak/openshowcase-player-core": minor
"@rustrak/openshowcase-player-react": minor
"@rustrak/openshowcase-player-vue": minor
"@rustrak/openshowcase-recorder": patch
---

- New `startWhenVisible` option/prop on the player: it shows its first step but holds playback (clip, zoom, hotspot) until it is at least half on screen, for demos below the fold or several on one page.
- Smoother cursor in recordings: mouse moves are paced by the clock instead of a fixed tick, so they no longer drop to 30fps and speed up mid-move while the page is still painting after a click, and the cursor keeps sub-pixel positions.
