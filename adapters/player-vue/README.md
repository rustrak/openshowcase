# @rustrak/openshowcase-player-vue

Vue component for playing [OpenShowcase](https://github.com/rustrak/openshowcase) interactive demos.

## Install

```sh
npm install @rustrak/openshowcase-player-vue
```

Requires Vue 3.3 or newer.

## Usage

Put an exported `.openshowcase` file in your static assets (e.g. `public/demos/`) and point the player at it:

```vue
<script setup lang="ts">
import { InteractiveDemo } from "@rustrak/openshowcase-player-vue";
</script>

<template>
  <InteractiveDemo src="/demos/my-demo.openshowcase" />
</template>
```

The file downloads in one request and each step shows as soon as its bytes arrive. You can also unzip the exported `.zip` and point `src` at its `steps.json`: asset paths are then resolved relative to its directory. If the demo is served from another domain, enable CORS on it.

In SSR frameworks (Nuxt, etc.) render it client-side only (e.g. `<ClientOnly>`), because the player needs the DOM.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `src` | `string` | URL of a `.openshowcase` file (or the exported `.zip`), or of an unzipped `steps.json`. Fetched and validated. |
| `demo` | `Demo` | A preloaded demo object, as an alternative to `src`. |
| `assetBaseUrl` | `string` | Overrides the asset base URL inferred from `src`. |
| `aspectRatio` | `number` | Width/height ratio used while the container has no explicit height. Defaults to `16 / 9`. |
| `appearance` | `"light" \| "dark" \| "auto"` | Overrides the demo's light/dark appearance (browser frame, background, controls), e.g. to follow your site's mode; `"auto"` follows the viewer's `prefers-color-scheme`. Changes apply live, without restarting the demo. |
| `hotspotStyle` | `{ bgColor?: string; textColor?: string }` | Overrides every step's hotspot/tooltip colors, e.g. to force your brand color whatever the demo was recorded with. Changes apply live. |
| `onStepChange` | `(index: number, step: Step) => void` | Called on every step change (also usable as `@step-change`). |

## License

MIT
