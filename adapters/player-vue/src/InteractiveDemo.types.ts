import type {
  HotspotStyle,
  PlayerAppearance,
} from "@rustrak/openshowcase-player-core";
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
  /** Overrides every step's hotspot/tooltip colors, e.g. to force your brand color. */
  hotspotStyle?: HotspotStyle;
  /** Overrides the demo's light/dark appearance, e.g. to follow your site's mode,
   * or `"auto"` for the viewer's `prefers-color-scheme`. Changes apply live. */
  appearance?: PlayerAppearance;
  onStepChange?: (index: number, step: Step) => void;
}
