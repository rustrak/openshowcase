# @rustrak/openshowcase-exporter

Builds the exportable bundle of an [OpenShowcase](https://github.com/rustrak/openshowcase) demo as a zip, in the browser. The OpenShowcase extension uses it for its **Export** button.

## Install

```sh
npm install @rustrak/openshowcase-exporter
```

Browser only: it uses `OffscreenCanvas` and `createImageBitmap` to encode frames to WebP.

## Usage

```ts
import { buildDemoBundle } from "@rustrak/openshowcase-exporter";

const zip: Blob = await buildDemoBundle({
  demo,                  // a Demo (see @rustrak/openshowcase-schema)
  imageBlobs,            // Map<stepId, Blob> with the frame of each photo step
  videoBlob,             // the continuous recording (webm), only needed for video steps
  imageQuality: 0.85,    // WebP quality, 0–1 (default 0.85)
});
```

## Bundle layout

```
steps.json            # the demo, with asset paths rewritten to be relative
assets/
  step-1.webp         # one frame per photo step
  recording.webm      # only if the demo has video steps
```

The bundle is pure data with no player inside. Render it with [`@rustrak/openshowcase-player-react`](https://github.com/rustrak/openshowcase/tree/main/adapters/player-react) or [`@rustrak/openshowcase-player-vue`](https://github.com/rustrak/openshowcase/tree/main/adapters/player-vue).

## License

MIT
