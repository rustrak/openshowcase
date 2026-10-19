# @rustrak/openshowcase-player-react

React component for playing [OpenShowcase](https://github.com/rustrak/openshowcase) interactive demos.

## Install

```sh
npm install @rustrak/openshowcase-player-react
```

Requires React 18 or newer.

## Usage

Put an exported `.openshowcase` file in your static assets (e.g. `public/demos/`) and point the player at it:

```tsx
import { InteractiveDemo } from "@rustrak/openshowcase-player-react";

export function ProductTour() {
  return <InteractiveDemo src="/demos/my-demo.openshowcase" />;
}
```

The file downloads in one request and each step shows as soon as its bytes arrive. You can also unzip the exported `.zip` and point `src` at its `steps.json`: asset paths are then resolved relative to its directory. If the demo is served from another domain, enable CORS on it.

In SSR frameworks (Next.js App Router, etc.) render it from a client component (`"use client"`), because the player needs the DOM.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `src` | `string` | URL of a `.openshowcase` file (or the exported `.zip`), or of an unzipped `steps.json`. Fetched and validated. |
| `demo` | `Demo` | A preloaded demo object, as an alternative to `src`. |
| `assetBaseUrl` | `string` | Overrides the asset base URL inferred from `src`. |
| `aspectRatio` | `number` | Width/height ratio used while the container has no explicit height. Defaults to `16 / 9`. |
| `className` / `style` | | Applied to the container. |
| `onStepChange` | `(index: number, step: Step) => void` | Called on every step change. |

## License

MIT
