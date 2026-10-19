# @rustrak/openshowcase-extension

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
