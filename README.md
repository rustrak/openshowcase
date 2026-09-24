# OpenShowcase

Open source, self-hosted interactive product demos.

Record a flow in your web app with a Chrome extension, edit the steps in the built-in editor, export a self-contained bundle, and embed it in your site with a React or Vue component. There's no SaaS, no account, no telemetry, and your demos stay on your own hosting.

> **Status:** early development. Nothing is published to the Chrome Web Store or npm yet, so build from source.

## How it works

1. **Record.** The extension captures the tab as continuous video plus your clicks, scrolls and typing.
2. **Edit.** When you stop, the editor opens with the recording split into steps: click moments become photo steps with a hotspot, and activity between clicks becomes video clips. Edit tooltips, trim clips, zoom and reorder.
3. **Export.** You get a zip of pure data: `steps.json`, WebP frames and the WebM recording.
4. **Embed.** Serve the bundle anywhere and render it with the player component:

```tsx
import { InteractiveDemo } from "@rustrak/openshowcase-player-react";

<InteractiveDemo src="/demos/my-demo/steps.json" />;
```

## Repository layout

```
apps/
  extension/      # Chrome extension: recorder + editor (WXT + React)
packages/
  schema/         # Demo format: Zod schema + TypeScript types
  player-core/    # Framework-agnostic playback engine
  exporter/       # Builds the exported bundle in the browser
adapters/
  player-react/   # <InteractiveDemo /> for React
  player-vue/     # <InteractiveDemo /> for Vue
```

## Development

Requires Node 22+ and pnpm 12.

```sh
pnpm install
pnpm build
pnpm test
```

Run the extension in dev mode:

```sh
pnpm --filter @rustrak/openshowcase-extension dev
```

Or build it and load `apps/extension/.output/chrome-mv3` as an unpacked extension in `chrome://extensions` (enable Developer mode first).

## License

[MIT](./LICENSE)
