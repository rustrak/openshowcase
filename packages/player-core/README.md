# @rustrak/openshowcase-player-core

Framework-agnostic playback engine for [OpenShowcase](https://github.com/rustrak/openshowcase) interactive demos. Plain JavaScript with its CSS inlined, so it needs no framework and no stylesheet import.

Most apps should use a framework wrapper instead: [`@rustrak/openshowcase-player-react`](https://github.com/rustrak/openshowcase/tree/main/adapters/player-react) or [`@rustrak/openshowcase-player-vue`](https://github.com/rustrak/openshowcase/tree/main/adapters/player-vue).

## Install

```sh
npm install @rustrak/openshowcase-player-core @rustrak/openshowcase-schema
```

## Usage

```ts
import { Player } from "@rustrak/openshowcase-player-core";
import { parseDemo } from "@rustrak/openshowcase-schema";

const url = "/demos/my-demo/steps.json";
const demo = parseDemo(await (await fetch(url)).json());

const player = new Player({
  container: document.getElementById("demo")!,
  demo,
  assetBaseUrl: "/demos/my-demo", // asset paths in steps.json are relative
  onStepChange: (index, step) => console.log(index, step.type),
});
player.mount();

// later
player.destroy();
```

## API

`new Player(options)`

| Option | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Element the player renders into. |
| `demo` | `Demo` | A validated demo (use `parseDemo` from the schema package). |
| `assetBaseUrl` | `string` | Prefix for relative image/video paths. |
| `onStepChange` | `(index, step) => void` | Called on every step change. |

Methods: `mount()`, `destroy()`, `next()`, `prev()`, `goTo(index)`. Getters: `currentIndex`, `currentStep`.

The player's styles are scoped under `.openshowcase-player` and don't reset the host page.

## License

MIT
