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
  imageBlobs,            // Map<stepId, Blob> with the frame of each photo step (AVIF ships as is, anything else becomes WebP)
  videoBlob,             // the video the video steps play (webm or mp4), only needed for video steps
  imageQuality: 0.85,    // WebP quality, 0–1 (default 0.85)
});
```

## Bundle layout

```
steps.json            # the demo, with asset paths rewritten to be relative
assets/
  step-1.avif         # one frame per photo step (.webp when not given as AVIF)
  recording.mp4       # only if the demo has video steps (.webm when the video is WebM)
```

The bundle is pure data with no player inside. Render it with [`@rustrak/openshowcase-player-react`](https://github.com/rustrak/openshowcase/tree/main/adapters/player-react) or [`@rustrak/openshowcase-player-vue`](https://github.com/rustrak/openshowcase/tree/main/adapters/player-vue).

## License

MIT
