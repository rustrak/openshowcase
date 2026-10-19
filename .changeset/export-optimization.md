---
"@rustrak/openshowcase-extension": minor
"@rustrak/openshowcase-exporter": minor
"@rustrak/openshowcase-player-core": minor
---

Smaller exports and a playground to test them:

- Photo frames ship as AVIF, encoded at export (the exporter keeps converting anything else to WebP).
- The video holds only the ranges the steps play, re-encoded as VBR H.264 (VP9 as a fallback).
- player-core streams single-file `.openshowcase` bundles and exports `readStoredZip` for tools that inspect one.
- New extension playground: plays an exported bundle with the real player, opened from the export dialog or the popup.
