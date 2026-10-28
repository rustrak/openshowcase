# @rustrak/openshowcase-exporter

## 0.4.1

### Patch Changes

- Updated dependencies []:
  - @rustrak/openshowcase-schema@0.4.1

## 0.4.0

### Patch Changes

- Updated dependencies []:
  - @rustrak/openshowcase-schema@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies []:
  - @rustrak/openshowcase-schema@0.3.0

## 0.2.0

### Minor Changes

- [#11](https://github.com/rustrak/openshowcase/pull/11) [`260b195`](https://github.com/rustrak/openshowcase/commit/260b195e22739435751954637855a06deb62abf6) Thanks [@AbianS](https://github.com/AbianS)! - Smaller exports and a playground to test them:
  
  - Photo frames ship as AVIF, encoded at export (the exporter keeps converting anything else to WebP).
  - The video holds only the ranges the steps play, re-encoded as VBR H.264 (VP9 as a fallback).
  - player-core streams single-file `.openshowcase` bundles and exports `readStoredZip` for tools that inspect one.
  - New extension playground: plays an exported bundle with the real player, opened from the export dialog or the popup.

### Patch Changes

- Updated dependencies []:
  - @rustrak/openshowcase-schema@0.2.0

## 0.1.0

### Minor Changes

- [`0f36d08`](https://github.com/rustrak/openshowcase/commit/0f36d086694f858249424fa2e06f30fcf478dbe2) Thanks [@AbianS](https://github.com/AbianS)! - Initial release

### Patch Changes

- Updated dependencies [[`0f36d08`](https://github.com/rustrak/openshowcase/commit/0f36d086694f858249424fa2e06f30fcf478dbe2)]:
  - @rustrak/openshowcase-schema@0.1.0
