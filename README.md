<div align="center">

<img width="2000" height="1100" alt="hero" src="https://github.com/user-attachments/assets/41b630da-6a1b-498b-a149-dff5942fd5fb" />


[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-early%20development-orange)

</div>

OpenShowcase turns a flow you click through in your web app into an interactive
demo you host yourself. There is no account and no service in the middle: the
export is a folder of plain files, and a React or Vue component plays it. It
powers the interactive demos in the [Rustrak docs](https://rustrak.github.io/rustrak/).

> **Status:** early development. Nothing is published to the Chrome Web Store or
> npm yet, so build from source.

## How it works

<img width="2000" height="900" alt="edit" src="https://github.com/user-attachments/assets/d340b260-3378-4bfc-9204-1fe535007b83" />


1. **Record.** The Chrome extension captures the tab as video and marks your
   clicks, scrolls and typing.
2. **Edit.** Each click becomes a photo step with a hotspot, and activity between
   clicks becomes a video clip. Write tooltips, trim clips, zoom and reorder.
3. **Export.** You get a zip with `steps.json`, WebP frames and the WebM
   recording.

<img width="2000" height="640" alt="pixels" src="https://github.com/user-attachments/assets/13744b3e-9933-491e-90ed-75868ab2fde2" />

<img width="2000" height="1000" alt="export" src="https://github.com/user-attachments/assets/e93fa6a5-1197-462e-ad87-e28adbb459de" />

## Embed a demo

Unzip the bundle into your site and point the player at it:

```tsx
import { InteractiveDemo } from "@rustrak/openshowcase-player-react";

<InteractiveDemo src="/demos/my-demo/steps.json" />;
```

The Vue component, `@rustrak/openshowcase-player-vue`, takes the same props.
Asset paths resolve relative to `steps.json`, so the bundle works from any
folder. The React player is about 55 KB gzipped, React excluded.

<img width="2000" height="900" alt="embed" src="https://github.com/user-attachments/assets/52b8bed2-7fa6-43e7-a4ea-a7c06b0f919b" />

## Development

Requires Node 22+ and pnpm 12.

```sh
pnpm install
pnpm build
pnpm test
pnpm --filter @rustrak/openshowcase-extension dev
```

To load a build yourself, open `chrome://extensions`, enable Developer mode and
load `apps/extension/.output/chrome-mv3` unpacked.

```
apps/extension/        Chrome extension: recorder + editor (WXT + React)
packages/schema/       Demo format: Zod schema + TypeScript types
packages/player-core/  Framework-agnostic playback engine
packages/exporter/     Builds the exported bundle in the browser
adapters/player-react/ <InteractiveDemo /> for React
adapters/player-vue/   <InteractiveDemo /> for Vue
```

## License

[MIT](./LICENSE). Made by the [Rustrak](https://github.com/rustrak/rustrak) team.
