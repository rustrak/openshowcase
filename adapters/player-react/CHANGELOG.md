# @rustrak/openshowcase-player-react

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
