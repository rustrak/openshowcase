# @rustrak/openshowcase-recorder

## 0.6.1

No changes in this release.

## 0.6.0

### Minor Changes

- [`8391f15`](https://github.com/rustrak/openshowcase/commit/8391f150c16a7160cee5bc9ed265f3a387714237) Thanks [@AbianS](https://github.com/AbianS)! - - **Player frame.** New `"bezel"` wrapper and an optional `theme.backdrop` (`color`, `fill`: `solid`, `soft` or `glow`, `padding`), both editable in the editor. New `wrapper` and `backdrop` options/props on the player override the demo's and apply live (`setWrapper`, `setBackdrop`); `backdrop: null` removes it. The browser bar is redesigned: it scales with the player, its title is centered, and the frame's shadow is no longer clipped.
  - **Player controls.** Play/pause and the clip's elapsed and total time, shown only during a clip, replace the previous/next buttons (the segments and arrow keys still navigate). The current segment takes the hotspot's color. The bar now shows only with the pointer over the bottom 20% of the stage, stays up while paused, and shows for a moment on a tap.
  - **Hotspot and tooltip.** The hotspot is a thin breathing ring that leaves a trail as it glides to its next step. The tooltip is a card in its own color with a footer showing the demo's progress. It enters with a softer spring and its words staggered, and gives only while pressed.
  - **Recorder.** New `export <file.osrec> --out <path>` command saves a demo straight to your project, through the real editor's Export, so the file is the same as a manual download. `open` now starts on the editor's Preview. The skill has the agent ask for your verdict, and export only once you approve.
  - **Fixed:** a clip starting on the video's last frame restarted the whole recording, without its hotspots, in demos ending on a still screen.
  - **Fixed:** the editor's Export could silently ship a demo without the photo steps whose frames weren't extracted yet. Export and the Preview now wait for all of them.
  - **Security:** a demo's colors can no longer add styles or load a `url()`.
  
  Upgrade notes: demos using the `browser` wrapper take the new look without re-exporting, and its shadow now extends past the player's box, so a host container with `overflow: hidden` will cut it. Demos using `"bezel"` or `backdrop` need this version of the player: older ones reject `"bezel"` and ignore `backdrop`.

## 0.5.0

### Patch Changes

- [`a5d6601`](https://github.com/rustrak/openshowcase/commit/a5d66014b1dc0f8bb09eb842eddd6aab96f2795c) Thanks [@AbianS](https://github.com/AbianS)! - - New `startWhenVisible` option/prop on the player: it shows its first step but holds playback (clip, zoom, hotspot) until it is at least half on screen, for demos below the fold or several on one page.
  - Smoother cursor in recordings: mouse moves are paced by the clock instead of a fixed tick, so they no longer drop to 30fps and speed up mid-move while the page is still painting after a click, and the cursor keeps sub-pixel positions.

## 0.4.1

No changes in this release.

## 0.4.0

### Minor Changes

- [#15](https://github.com/rustrak/openshowcase/pull/15) [`9ab55d6`](https://github.com/rustrak/openshowcase/commit/9ab55d6e5d5329db3f1e65774ae06b44570cbe43) Thanks [@AbianS](https://github.com/AbianS)! - A recorder flow can name its demo with `title`: the `.osrec` carries it and the editor opens the demo with that title (shown in the player's browser bar and used for the export's file name). The skill tells the agent to pick a short, descriptive one.

## 0.3.0

### Minor Changes

- [#13](https://github.com/rustrak/openshowcase/pull/13) [`c0119a5`](https://github.com/rustrak/openshowcase/commit/c0119a58ddd770768d536127e92f8e293773f7a5) Thanks [@AbianS](https://github.com/AbianS)! - AI agents can record demos:
  
  - New `@rustrak/openshowcase-recorder` CLI: plays a JSON flow in headless Chromium while the extension records it, with a cursor that moves like a hand, targets scrolled into view and waits cut out, and writes an `.osrec` file. The flow directs the camera (`zoom`, `hotspot: false`). `inspect` shows where a flow ends up as an accessibility tree, `login` saves a session once, `open` reviews a recording in a separate browser with the editor, `install-skill` adds the Claude Code skill to a project.
  - The extension imports `.osrec` recordings (popup file icon, or the editor's empty screen) and applies their direction: tooltips, zooms, quiet clicks and cuts.
