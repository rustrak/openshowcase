// Pure placement math, exported so editors can draw the tooltip exactly where the player will.

// The tooltip's box + tail outline as one SVG path — for editors mirroring the player's look.
export { type BubblePathInput, bubblePath } from "./core/bubble-path";
export {
  computeTooltipPlacement,
  TOOLTIP_GAP_PX,
  type TooltipPlacement,
  type TooltipSide,
} from "./core/geometry";
export {
  type AssetResolver,
  type LoadDemoOptions,
  type LoadedDemo,
  loadDemo,
} from "./core/load-demo";
// The single-file bundle reader, for tools that inspect a bundle (e.g. the extension's playground)
export type { HotspotStyle } from "./core/photo-overlay";
export { readStoredZip, type ZipEntry } from "./core/stored-zip";
export type { PlayerOptions } from "./mount";
export { Player } from "./mount";
export type { PlayerAppearance } from "./ui/Player/Player";
