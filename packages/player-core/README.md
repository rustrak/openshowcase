# @rustrak/openshowcase-player-core

Framework-agnostic playback engine for [OpenShowcase](https://github.com/rustrak/openshowcase) interactive demos. Plain JavaScript with its CSS inlined, so it needs no framework and no stylesheet import.

Most apps should use a framework wrapper instead: [`@rustrak/openshowcase-player-react`](https://github.com/rustrak/openshowcase/tree/main/adapters/player-react) or [`@rustrak/openshowcase-player-vue`](https://github.com/rustrak/openshowcase/tree/main/adapters/player-vue).

## Install

```sh
npm install @rustrak/openshowcase-player-core @rustrak/openshowcase-schema
```

## Usage

```ts
import { loadDemo, Player } from "@rustrak/openshowcase-player-core";

// A .openshowcase file (or the exported .zip), or an unzipped bundle's steps.json
const loaded = await loadDemo("/demos/my-demo.openshowcase");

const player = new Player({
  container: document.getElementById("demo")!,
  demo: loaded.demo,
  assetBaseUrl: loaded.assetBaseUrl,
  resolveAsset: loaded.resolveAsset,
  onStepChange: (index, step) => console.log(index, step.type),
});
player.mount();

// later
player.destroy();
loaded.dispose(); // stops the download and frees the bundle's asset URLs
```

## API

`new Player(options)`

| Option | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Element the player renders into. |
| `demo` | `Demo` | A validated demo (use `parseDemo` from the schema package). |
| `assetBaseUrl` | `string` | Prefix for relative image/video paths. |
| `resolveAsset` | `(src) => string \| Promise<string>` | Serves asset URLs instead of `assetBaseUrl` (pass `loadDemo()`'s for a bundle). |
| `onStepChange` | `(index, step) => void` | Called on every step change. |

`readStoredZip(stream)` yields a bundle's files as they arrive, for tools that inspect a bundle.

`loadDemo(src, { assetBaseUrl?, signal? })` fetches a demo and tells a bundle from a `steps.json` by its first bytes. It resolves as soon as the demo is known; a bundle's assets keep downloading in the one request, each served as soon as it arrives.

Methods: `mount()`, `destroy()`, `next()`, `prev()`, `goTo(index)`. Getters: `currentIndex`, `currentStep`.

The player's styles are scoped under `.openshowcase-player` and don't reset the host page.

## License

MIT
