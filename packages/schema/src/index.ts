import { z } from "zod";

const frac = z.number().min(0).max(1);

export const ImageAssetSchema = z.object({
  src: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type ImageAsset = z.infer<typeof ImageAssetSchema>;

export const VideoAssetSchema = z.object({
  src: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  durationSec: z.number().positive(),
});
export type VideoAsset = z.infer<typeof VideoAssetSchema>;

export const HotspotPositionSchema = z.enum([
  "auto",
  "top",
  "bottom",
  "left",
  "right",
]);
export type HotspotPosition = z.infer<typeof HotspotPositionSchema>;

/**
 * Pulsing hotspot: fractional coordinates (0-1) over the image, with its own tooltip
 * (label) and style. The demo pauses until the user clicks it.
 */
export const HotspotSchema = z.object({
  x: frac,
  y: frac,
  label: z.string().optional(),
  bgColor: z.string().optional(),
  textColor: z.string().optional(),
  position: HotspotPositionSchema.optional(),
});
export type Hotspot = z.infer<typeof HotspotSchema>;

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
export const PanZoomEasingSchema = z.enum([
  "smooth",
  "cinematic",
  "fast",
  "linear",
]);
export type PanZoomEasing = z.infer<typeof PanZoomEasingSchema>;

export const PanZoomSchema = z.object({
  x: frac,
  y: frac,
  scale: z.number().min(1),
  /** Transition duration (ms). Defaults to `defaultPanZoomTiming.duration` when unset. */
  duration: z.number().positive().optional(),
  /** Named easing preset (mapped to a CSS timing function in player-core). Defaults to
   * `defaultPanZoomTiming.easing` when unset. */
  easing: PanZoomEasingSchema.optional(),
});
export type PanZoom = z.infer<typeof PanZoomSchema>;

export const defaultPanZoomTiming = {
  duration: 1000,
  easing: "cinematic",
} as const satisfies Partial<PanZoom>;

export const ThemeWrapperSchema = z.enum(["none", "browser"]);
export type ThemeWrapper = z.infer<typeof ThemeWrapperSchema>;

export const ThemeAppearanceSchema = z.enum(["light", "dark"]);
export type ThemeAppearance = z.infer<typeof ThemeAppearanceSchema>;

export const ThemeSchema = z.object({
  wrapper: ThemeWrapperSchema,
  /** After the last step, restart the demo from the beginning instead of stopping. */
  autoplay: z.boolean(),
  /** Colors of the wrapper and the player controls — to match the light/dark mode of the embedding site. */
  appearance: ThemeAppearanceSchema,
});
export type Theme = z.infer<typeof ThemeSchema>;

export const defaultTheme: Theme = {
  wrapper: "browser",
  autoplay: true,
  appearance: "light",
};

export const PhotoStepSchema = z.object({
  id: z.string(),
  type: z.literal("photo"),
  image: ImageAssetSchema,
  hotspot: HotspotSchema.optional(),
  panZoom: PanZoomSchema.optional(),
});
export type PhotoStep = z.infer<typeof PhotoStepSchema>;

/** A trim (in/out in seconds) of the demo's continuous recording (`Demo.video`). */
export const VideoStepSchema = z.object({
  id: z.string(),
  type: z.literal("video"),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  playbackRate: z.number().positive().optional(),
  panZoom: PanZoomSchema.optional(),
});
export type VideoStep = z.infer<typeof VideoStepSchema>;

export const StepSchema = z.discriminatedUnion("type", [
  PhotoStepSchema,
  VideoStepSchema,
]);
export type Step = z.infer<typeof StepSchema>;

export const DemoSchema = z.object({
  id: z.string(),
  title: z.string(),
  video: VideoAssetSchema.optional(),
  theme: ThemeSchema,
  steps: z.array(StepSchema),
});
export type Demo = z.infer<typeof DemoSchema>;

export function parseDemo(data: unknown): Demo {
  return DemoSchema.parse(data);
}

export const SCHEMA_VERSION = 6 as const;
