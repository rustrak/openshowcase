---
"@rustrak/openshowcase-player-core": patch
---

Fix clicking a navbar segment while a video step plays: the segments re-rendered every frame by detaching and re-inserting their buttons, which dropped the click.
