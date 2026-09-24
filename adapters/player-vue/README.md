# @rustrak/openshowcase-player-vue

Vue component for playing [OpenShowcase](https://github.com/rustrak/openshowcase) interactive demos.

## Install

```sh
npm install @rustrak/openshowcase-player-vue
```

Requires Vue 3.3 or newer.

## Usage

Unzip an exported demo into your static assets (e.g. `public/demos/my-demo/`) and point the player at its `steps.json`:

```vue
<script setup lang="ts">
import { InteractiveDemo } from "@rustrak/openshowcase-player-vue";
</script>

<template>
  <InteractiveDemo src="/demos/my-demo/steps.json" />
</template>
```

Asset paths in `steps.json` are resolved relative to its directory. If the bundle is served from another domain, enable CORS on it.

In SSR frameworks (Nuxt, etc.) render it client-side only (e.g. `<ClientOnly>`), because the player needs the DOM.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `src` | `string` | URL of a `steps.json`. Fetched and validated. |
| `demo` | `Demo` | A preloaded demo object, as an alternative to `src`. |
| `assetBaseUrl` | `string` | Overrides the asset base URL inferred from `src`. |
| `aspectRatio` | `number` | Width/height ratio used while the container has no explicit height. Defaults to `16 / 9`. |
| `onStepChange` | `(index: number, step: Step) => void` | Called on every step change (also usable as `@step-change`). |

## License

MIT
