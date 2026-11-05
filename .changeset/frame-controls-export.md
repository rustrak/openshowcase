---
"@rustrak/openshowcase-schema": minor
"@rustrak/openshowcase-player-core": minor
"@rustrak/openshowcase-player-react": minor
"@rustrak/openshowcase-player-vue": minor
"@rustrak/openshowcase-extension": minor
"@rustrak/openshowcase-recorder": minor
---

- **Player frame.** New `"bezel"` wrapper and an optional `theme.backdrop` (`color`, `fill`: `solid`, `soft` or `glow`, `padding`), both editable in the editor. New `wrapper` and `backdrop` options/props on the player override the demo's and apply live (`setWrapper`, `setBackdrop`); `backdrop: null` removes it. The browser bar is redesigned: it scales with the player, its title is centered, and the frame's shadow is no longer clipped.
- **Player controls.** Play/pause and the clip's elapsed and total time, shown only during a clip, replace the previous/next buttons (the segments and arrow keys still navigate). The current segment takes the hotspot's color. The bar now shows only with the pointer over the bottom 20% of the stage, stays up while paused, and shows for a moment on a tap.
- **Hotspot and tooltip.** The hotspot is a thin breathing ring that leaves a trail as it glides to its next step. The tooltip is a card in its own color with a footer showing the demo's progress. It enters with a softer spring and its words staggered, and gives only while pressed.
- **Recorder.** New `export <file.osrec> --out <path>` command saves a demo straight to your project, through the real editor's Export, so the file is the same as a manual download. `open` now starts on the editor's Preview. The skill has the agent ask for your verdict, and export only once you approve.
- **Fixed:** a clip starting on the video's last frame restarted the whole recording, without its hotspots, in demos ending on a still screen.
- **Fixed:** the editor's Export could silently ship a demo without the photo steps whose frames weren't extracted yet. Export and the Preview now wait for all of them.
- **Security:** a demo's colors can no longer add styles or load a `url()`.

Upgrade notes: demos using the `browser` wrapper take the new look without re-exporting, and its shadow now extends past the player's box, so a host container with `overflow: hidden` will cut it. Demos using `"bezel"` or `backdrop` need this version of the player: older ones reject `"bezel"` and ignore `backdrop`.
