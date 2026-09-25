import type { Demo, Step } from "@rustrak/openshowcase-schema";

export interface InteractiveDemoProps {
  /**
   * URL of an exported demo: a single `.openshowcase` file (or the exported `.zip`), or an
   * unzipped bundle's `steps.json`, whose assets are resolved relative to its directory.
   */
  src?: string;
  /** A pre-loaded Demo object, as an alternative to `src`. */
  demo?: Demo;
  /** Overrides the inferred asset base URL (only relevant when using `src`). */
  assetBaseUrl?: string;
  /** Width/height ratio used while no explicit height is set via `class`/`style`. Defaults to 16/9. */
  aspectRatio?: number;
  onStepChange?: (index: number, step: Step) => void;
}
