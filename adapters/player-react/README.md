# @rustrak/openshowcase-player-react

React component for playing [OpenShowcase](https://github.com/rustrak/openshowcase) interactive demos.

## Install

```sh
npm install @rustrak/openshowcase-player-react
```

Requires React 18 or newer.

## Usage

Unzip an exported demo into your static assets (e.g. `public/demos/my-demo/`) and point the player at its `steps.json`:

```tsx
import { InteractiveDemo } from "@rustrak/openshowcase-player-react";

export function ProductTour() {
  return <InteractiveDemo src="/demos/my-demo/steps.json" />;
}
```

Asset paths in `steps.json` are resolved relative to its directory. If the bundle is served from another domain, enable CORS on it.

In SSR frameworks (Next.js App Router, etc.) render it from a client component (`"use client"`), because the player needs the DOM.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `src` | `string` | URL of a `steps.json`. Fetched and validated. |
| `demo` | `Demo` | A preloaded demo object, as an alternative to `src`. |
| `assetBaseUrl` | `string` | Overrides the asset base URL inferred from `src`. |
| `aspectRatio` | `number` | Width/height ratio used while the container has no explicit height. Defaults to `16 / 9`. |
| `className` / `style` | | Applied to the container. |
| `onStepChange` | `(index: number, step: Step) => void` | Called on every step change. |

## License

MIT
