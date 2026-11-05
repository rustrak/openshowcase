# @rustrak/openshowcase-player-react

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

## 0.5.0

### Minor Changes

- [`a5d6601`](https://github.com/rustrak/openshowcase/commit/a5d66014b1dc0f8bb09eb842eddd6aab96f2795c) Thanks [@AbianS](https://github.com/AbianS)! - - New `startWhenVisible` option/prop on the player: it shows its first step but holds playback (clip, zoom, hotspot) until it is at least half on screen, for demos below the fold or several on one page.
  - Smoother cursor in recordings: mouse moves are paced by the clock instead of a fixed tick, so they no longer drop to 30fps and speed up mid-move while the page is still painting after a click, and the cursor keeps sub-pixel positions.

### Patch Changes

- Updated dependencies [[`a5d6601`](https://github.com/rustrak/openshowcase/commit/a5d66014b1dc0f8bb09eb842eddd6aab96f2795c)]:
  - @rustrak/openshowcase-player-core@0.5.0
  - @rustrak/openshowcase-schema@0.5.0

## 0.4.1

### Patch Changes

- Updated dependencies []:
  - @rustrak/openshowcase-player-core@0.4.1
  - @rustrak/openshowcase-schema@0.4.1

## 0.4.0

### Minor Changes

- [#15](https://github.com/rustrak/openshowcase/pull/15) [`f63bf1e`](https://github.com/rustrak/openshowcase/commit/f63bf1ee0f7b7e6f59d890b4ea219e41da755dbf) Thanks [@AbianS](https://github.com/AbianS)! - Add a `hotspotStyle` option (`{ bgColor, textColor }`) to the player and the React/Vue `InteractiveDemo` that overrides every step's hotspot and tooltip colors, so a host app can force its brand color whatever the demo was recorded with.

- [#15](https://github.com/rustrak/openshowcase/pull/15) [`f63bf1e`](https://github.com/rustrak/openshowcase/commit/f63bf1ee0f7b7e6f59d890b4ea219e41da755dbf) Thanks [@AbianS](https://github.com/AbianS)! - Add an `appearance` option (`"light" | "dark" | "auto"`) that overrides the demo's own, so the player can follow the host site's mode, or with `"auto"` the viewer's `prefers-color-scheme` as it changes. It and `hotspotStyle` now apply live (`Player.setAppearance()` / `setHotspotStyle()`, and prop changes in React/Vue) without remounting or restarting the demo.

### Patch Changes

- Updated dependencies [[`f63bf1e`](https://github.com/rustrak/openshowcase/commit/f63bf1ee0f7b7e6f59d890b4ea219e41da755dbf), [`f63bf1e`](https://github.com/rustrak/openshowcase/commit/f63bf1ee0f7b7e6f59d890b4ea219e41da755dbf), [`e1c0590`](https://github.com/rustrak/openshowcase/commit/e1c05909d2984d97a885b8e38741dc9222f83de0), [`ebbce8c`](https://github.com/rustrak/openshowcase/commit/ebbce8c3484e6481564d13f09258ca3e1b771d06)]:
  - @rustrak/openshowcase-player-core@0.4.0
  - @rustrak/openshowcase-schema@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies []:
  - @rustrak/openshowcase-player-core@0.3.0
  - @rustrak/openshowcase-schema@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [[`260b195`](https://github.com/rustrak/openshowcase/commit/260b195e22739435751954637855a06deb62abf6)]:
  - @rustrak/openshowcase-player-core@0.2.0
  - @rustrak/openshowcase-schema@0.2.0

## 0.1.0

### Minor Changes

- [`0f36d08`](https://github.com/rustrak/openshowcase/commit/0f36d086694f858249424fa2e06f30fcf478dbe2) Thanks [@AbianS](https://github.com/AbianS)! - Initial release

### Patch Changes

- Updated dependencies [[`0f36d08`](https://github.com/rustrak/openshowcase/commit/0f36d086694f858249424fa2e06f30fcf478dbe2)]:
  - @rustrak/openshowcase-schema@0.1.0
  - @rustrak/openshowcase-player-core@0.1.0
