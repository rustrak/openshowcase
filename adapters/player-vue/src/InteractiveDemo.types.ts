import type { Demo, Step } from "@rustrak/openshowcase-schema";

export interface InteractiveDemoProps {
  /** URL to a `steps.json` produced by the OpenShowcase exporter. Assets are resolved relative to its directory. */
  src?: string;
  /** A pre-loaded Demo object, as an alternative to `src`. */
  demo?: Demo;
  /** Overrides the inferred asset base URL (only relevant when using `src`). */
  assetBaseUrl?: string;
  /** Width/height ratio used while no explicit height is set via `class`/`style`. Defaults to 16/9. */
  aspectRatio?: number;
  onStepChange?: (index: number, step: Step) => void;
}
