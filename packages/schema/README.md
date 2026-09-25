# @rustrak/openshowcase-schema

The [OpenShowcase](https://github.com/rustrak/openshowcase) demo format (`steps.json`): a [Valibot](https://valibot.dev) schema and TypeScript types.

## Install

```sh
npm install @rustrak/openshowcase-schema
```

## Usage

```ts
import { parseDemo, type Demo } from "@rustrak/openshowcase-schema";

const demo: Demo = parseDemo(await (await fetch("/demos/my-demo/steps.json")).json());
```

`parseDemo` throws a `DemoParseError` if the data doesn't match the schema. Its `issues` list each problem with the dot path to the offending value:

```ts
import { DemoParseError, parseDemo } from "@rustrak/openshowcase-schema";

try {
  parseDemo(json);
} catch (error) {
  if (error instanceof DemoParseError) {
    console.error(error.issues); // [{ path: "steps.1.hotspot.x", message: "..." }]
  }
}
```

## Format overview

A `Demo` has an `id`, a `title`, an optional continuous `video` recording, a `theme` (`wrapper`, `autoplay`, `appearance`) and a list of `steps`:

- **Photo step** (`type: "photo"`): a still frame with an optional `hotspot` (position as 0–1 fractions, tooltip label, colors) and an optional `panZoom`. Playback waits until the viewer clicks the hotspot.
- **Video step** (`type: "video"`): a `startTime`–`endTime` clip of the demo's recording that plays and advances on its own.

The full definition lives in [`src/index.ts`](./src/index.ts). `SCHEMA_VERSION` is bumped on breaking changes.

## License

MIT
