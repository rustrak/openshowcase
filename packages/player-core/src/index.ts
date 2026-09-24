// Pure placement math, exported so editors can draw the tooltip exactly where the player will.

// The tooltip's box + tail outline as one SVG path — for editors mirroring the player's look.
export { type BubblePathInput, bubblePath } from "./core/bubble-path";
export {
  computeTooltipPlacement,
  TOOLTIP_GAP_PX,
  type TooltipPlacement,
  type TooltipSide,
} from "./core/geometry";
export type { PlayerOptions } from "./mount";
export { Player } from "./mount";
