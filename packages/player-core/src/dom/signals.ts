// The only module that imports alien-signals. The build compiles it into dist/dom/signals.js
// (see rslib.config.ts), so the published package has no runtime dependency on it.
export {
  computed,
  effect,
  effectScope,
  endBatch,
  setActiveSub,
  signal,
  startBatch,
} from "alien-signals";
