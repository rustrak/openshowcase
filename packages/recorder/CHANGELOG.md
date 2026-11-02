# @rustrak/openshowcase-recorder

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
