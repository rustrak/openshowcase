# @rustrak/openshowcase-extension

## 0.6.2

### Patch Changes

- Updated dependencies [[`848a515`](https://github.com/rustrak/openshowcase/commit/848a51552344c4ec6224c4faf5e32380a7096bfb)]:
  - @rustrak/openshowcase-player-core@0.6.2
  - @rustrak/openshowcase-player-react@0.6.2
  - @rustrak/openshowcase-exporter@0.6.2
  - @rustrak/openshowcase-schema@0.6.2

## 0.6.1

### Patch Changes

- Updated dependencies [[`18b7add`](https://github.com/rustrak/openshowcase/commit/18b7add7c506305226b3a85de5a2ea0b7d8d8c51)]:
  - @rustrak/openshowcase-player-core@0.6.1
  - @rustrak/openshowcase-player-react@0.6.1
  - @rustrak/openshowcase-exporter@0.6.1
  - @rustrak/openshowcase-schema@0.6.1

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

### Patch Changes

- Updated dependencies [[`8391f15`](https://github.com/rustrak/openshowcase/commit/8391f150c16a7160cee5bc9ed265f3a387714237)]:
  - @rustrak/openshowcase-schema@0.6.0
  - @rustrak/openshowcase-player-core@0.6.0
  - @rustrak/openshowcase-player-react@0.6.0
  - @rustrak/openshowcase-exporter@0.6.0

## 0.5.0

### Patch Changes

- Updated dependencies [[`a5d6601`](https://github.com/rustrak/openshowcase/commit/a5d66014b1dc0f8bb09eb842eddd6aab96f2795c)]:
  - @rustrak/openshowcase-player-core@0.5.0
  - @rustrak/openshowcase-player-react@0.5.0
  - @rustrak/openshowcase-exporter@0.5.0
  - @rustrak/openshowcase-schema@0.5.0

## 0.4.1

### Patch Changes

- [`8069753`](https://github.com/rustrak/openshowcase/commit/80697536e660ea790b97d95a783dcef48df541b9) Thanks [@AbianS](https://github.com/AbianS)! - Export video clips at constant quality: motion no longer looks blurrier than still frames.
- Updated dependencies []:
  - @rustrak/openshowcase-player-react@0.4.1
  - @rustrak/openshowcase-exporter@0.4.1
  - @rustrak/openshowcase-player-core@0.4.1
  - @rustrak/openshowcase-schema@0.4.1

## 0.4.0

### Minor Changes

- [#15](https://github.com/rustrak/openshowcase/pull/15) [`9ab55d6`](https://github.com/rustrak/openshowcase/commit/9ab55d6e5d5329db3f1e65774ae06b44570cbe43) Thanks [@AbianS](https://github.com/AbianS)! - A recorder flow can name its demo with `title`: the `.osrec` carries it and the editor opens the demo with that title (shown in the player's browser bar and used for the export's file name). The skill tells the agent to pick a short, descriptive one.

### Patch Changes

- Updated dependencies [[`f63bf1e`](https://github.com/rustrak/openshowcase/commit/f63bf1ee0f7b7e6f59d890b4ea219e41da755dbf), [`f63bf1e`](https://github.com/rustrak/openshowcase/commit/f63bf1ee0f7b7e6f59d890b4ea219e41da755dbf), [`e1c0590`](https://github.com/rustrak/openshowcase/commit/e1c05909d2984d97a885b8e38741dc9222f83de0), [`ebbce8c`](https://github.com/rustrak/openshowcase/commit/ebbce8c3484e6481564d13f09258ca3e1b771d06)]:
  - @rustrak/openshowcase-player-core@0.4.0
  - @rustrak/openshowcase-player-react@0.4.0
  - @rustrak/openshowcase-exporter@0.4.0
  - @rustrak/openshowcase-schema@0.4.0

## 0.3.0

### Minor Changes

- [#13](https://github.com/rustrak/openshowcase/pull/13) [`c0119a5`](https://github.com/rustrak/openshowcase/commit/c0119a58ddd770768d536127e92f8e293773f7a5) Thanks [@AbianS](https://github.com/AbianS)! - AI agents can record demos:
  
  - New `@rustrak/openshowcase-recorder` CLI: plays a JSON flow in headless Chromium while the extension records it, with a cursor that moves like a hand, targets scrolled into view and waits cut out, and writes an `.osrec` file. The flow directs the camera (`zoom`, `hotspot: false`). `inspect` shows where a flow ends up as an accessibility tree, `login` saves a session once, `open` reviews a recording in a separate browser with the editor, `install-skill` adds the Claude Code skill to a project.
  - The extension imports `.osrec` recordings (popup file icon, or the editor's empty screen) and applies their direction: tooltips, zooms, quiet clicks and cuts.

### Patch Changes

- Updated dependencies []:
  - @rustrak/openshowcase-player-react@0.3.0
  - @rustrak/openshowcase-exporter@0.3.0
  - @rustrak/openshowcase-player-core@0.3.0
  - @rustrak/openshowcase-schema@0.3.0

## 0.2.0

### Minor Changes

- [#11](https://github.com/rustrak/openshowcase/pull/11) [`260b195`](https://github.com/rustrak/openshowcase/commit/260b195e22739435751954637855a06deb62abf6) Thanks [@AbianS](https://github.com/AbianS)! - Smaller exports and a playground to test them:
  
  - Photo frames ship as AVIF, encoded at export (the exporter keeps converting anything else to WebP).
  - The video holds only the ranges the steps play, re-encoded as VBR H.264 (VP9 as a fallback).
  - player-core streams single-file `.openshowcase` bundles and exports `readStoredZip` for tools that inspect one.
  - New extension playground: plays an exported bundle with the real player, opened from the export dialog or the popup.

### Patch Changes

- Updated dependencies [[`260b195`](https://github.com/rustrak/openshowcase/commit/260b195e22739435751954637855a06deb62abf6)]:
  - @rustrak/openshowcase-exporter@0.2.0
  - @rustrak/openshowcase-player-core@0.2.0
  - @rustrak/openshowcase-player-react@0.2.0
  - @rustrak/openshowcase-schema@0.2.0

## 0.1.0

### Minor Changes

- [`0f36d08`](https://github.com/rustrak/openshowcase/commit/0f36d086694f858249424fa2e06f30fcf478dbe2) Thanks [@AbianS](https://github.com/AbianS)! - Initial release

### Patch Changes

- Updated dependencies [[`0f36d08`](https://github.com/rustrak/openshowcase/commit/0f36d086694f858249424fa2e06f30fcf478dbe2)]:
  - @rustrak/openshowcase-schema@0.1.0
  - @rustrak/openshowcase-player-core@0.1.0
  - @rustrak/openshowcase-exporter@0.1.0
  - @rustrak/openshowcase-player-react@0.1.0
