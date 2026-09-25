import * as v from "valibot";

// `v.number()` accepts Infinity; the demo format never has an unbounded number
const number = () => v.pipe(v.number(), v.finite());
const positive = () => v.pipe(v.number(), v.finite(), v.gtValue(0));
const frac = v.pipe(v.number(), v.minValue(0), v.maxValue(1));

export const ImageAssetSchema = v.object({
  src: v.string(),
  width: positive(),
  height: positive(),
});
export type ImageAsset = v.InferOutput<typeof ImageAssetSchema>;

export const VideoAssetSchema = v.object({
  src: v.string(),
  width: positive(),
  height: positive(),
  durationSec: positive(),
});
export type VideoAsset = v.InferOutput<typeof VideoAssetSchema>;

export const HotspotPositionSchema = v.picklist([
  "auto",
  "top",
  "bottom",
  "left",
  "right",
]);
export type HotspotPosition = v.InferOutput<typeof HotspotPositionSchema>;

/**
 * Pulsing hotspot: fractional coordinates (0-1) over the image, with its own tooltip
 * (label) and style. The demo pauses until the user clicks it.
 */
export const HotspotSchema = v.object({
  x: frac,
  y: frac,
  label: v.optional(v.string()),
  bgColor: v.optional(v.string()),
  textColor: v.optional(v.string()),
  position: v.optional(HotspotPositionSchema),
});
export type Hotspot = v.InferOutput<typeof HotspotSchema>;

export const defaultHotspotStyle = {
  // Rustrak lime (#C5F11E, the brand OpenShowcase shares) with near-black text on it
  bgColor: "#C5F11E",
  textColor: "#0C0C0C",
  position: "auto",
} as const satisfies Partial<Hotspot>;

/**
 * `x`/`y` are the CENTER (fractions 0-1) of the region left visible after zooming.
 * The player does NOT use it as the CSS `transform-origin` (that would cause an instant jump
 * when going between zooms with different centers) — it applies it as a `translate` before
 * the scale, with the origin always fixed at 50%/50%. That way going from one zoom to another
 * (or to "no zoom") is a single continuous `transform` transition.
 */
export const PanZoomEasingSchema = v.picklist([
  "smooth",
  "cinematic",
  "fast",
  "linear",
]);
export type PanZoomEasing = v.InferOutput<typeof PanZoomEasingSchema>;

export const PanZoomSchema = v.object({
  x: frac,
  y: frac,
  scale: v.pipe(number(), v.minValue(1)),
  /** Transition duration (ms). Defaults to `defaultPanZoomTiming.duration` when unset. */
  duration: v.optional(positive()),
  /** Named easing preset (mapped to a CSS timing function in player-core). Defaults to
   * `defaultPanZoomTiming.easing` when unset. */
  easing: v.optional(PanZoomEasingSchema),
});
export type PanZoom = v.InferOutput<typeof PanZoomSchema>;

export const defaultPanZoomTiming = {
  duration: 1000,
  easing: "cinematic",
} as const satisfies Partial<PanZoom>;

export const ThemeWrapperSchema = v.picklist(["none", "browser"]);
export type ThemeWrapper = v.InferOutput<typeof ThemeWrapperSchema>;

export const ThemeAppearanceSchema = v.picklist(["light", "dark"]);
export type ThemeAppearance = v.InferOutput<typeof ThemeAppearanceSchema>;

export const ThemeSchema = v.object({
  wrapper: ThemeWrapperSchema,
  /** After the last step, restart the demo from the beginning instead of stopping. */
  autoplay: v.boolean(),
  /** Colors of the wrapper and the player controls — to match the light/dark mode of the embedding site. */
  appearance: ThemeAppearanceSchema,
});
export type Theme = v.InferOutput<typeof ThemeSchema>;

export const defaultTheme: Theme = {
  wrapper: "browser",
  autoplay: true,
  appearance: "light",
};

export const PhotoStepSchema = v.object({
  id: v.string(),
  type: v.literal("photo"),
  image: ImageAssetSchema,
  hotspot: v.optional(HotspotSchema),
  panZoom: v.optional(PanZoomSchema),
});
export type PhotoStep = v.InferOutput<typeof PhotoStepSchema>;

/** A trim (in/out in seconds) of the demo's continuous recording (`Demo.video`). */
export const VideoStepSchema = v.object({
  id: v.string(),
  type: v.literal("video"),
  startTime: v.pipe(number(), v.minValue(0)),
  endTime: positive(),
  playbackRate: v.optional(positive()),
  panZoom: v.optional(PanZoomSchema),
});
export type VideoStep = v.InferOutput<typeof VideoStepSchema>;

export const StepSchema = v.variant("type", [PhotoStepSchema, VideoStepSchema]);
export type Step = v.InferOutput<typeof StepSchema>;

export const DemoSchema = v.object({
  id: v.string(),
  title: v.string(),
  video: v.optional(VideoAssetSchema),
  theme: ThemeSchema,
  steps: v.array(StepSchema),
});
export type Demo = v.InferOutput<typeof DemoSchema>;

export interface DemoIssue {
  /** Dot path to the offending value, e.g. `steps.1.hotspot.x` (empty for the root). */
  path: string;
  message: string;
}

/** Thrown by `parseDemo` when the data doesn't match the demo format. */
export class DemoParseError extends Error {
  override readonly name = "DemoParseError";
  readonly issues: DemoIssue[];

  constructor(issues: DemoIssue[]) {
    const lines = issues.map(
      (issue) => `- ${issue.path || "(root)"}: ${issue.message}`,
    );
    super(`Invalid demo:\n${lines.join("\n")}`);
    this.issues = issues;
  }
}

/** Validates untrusted data (e.g. a fetched `steps.json`) as a `Demo`, dropping unknown keys. */
export function parseDemo(data: unknown): Demo {
  const result = v.safeParse(DemoSchema, data);
  if (result.success) return result.output;
  throw new DemoParseError(
    result.issues.map((issue) => ({
      path: v.getDotPath(issue) ?? "",
      message: issue.message,
    })),
  );
}

export const SCHEMA_VERSION = 6 as const;
