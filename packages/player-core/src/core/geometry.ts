import type {
  Hotspot,
  HotspotPosition,
  PanZoom,
} from "@rustrak/openshowcase-schema";

// Same function order as `zoomTransform()` (`translate() scale()`) — CSS only interpolates
// `transform` component-wise (guaranteeing a linear path) when both keyframes share the same
// transform-function list shape. A mismatched order here would force matrix-decomposition
// interpolation for every transition to/from "no zoom" instead.
export const IDENTITY_ZOOM_TRANSFORM = "translate(0%, 0%) scale(1)";

/** Default distance (px) from the hotspot's center to the tooltip's edge. Components pass a
 * size-scaled gap instead (the hotspot grows with the player). */
export const TOOLTIP_GAP_PX = 22;
const TOOLTIP_EDGE_MARGIN_PX = 8;
/** The arrow never gets closer than this to a corner — radius + a few px, so it stays on the flat edge. */
const ARROW_MIN_MARGIN_PX = 14;

export interface ContainBox {
  offsetX: number;
  offsetY: number;
  scale: number;
  stageW: number;
  stageH: number;
}

/** "object-fit: contain" box of the video/photo (natural size) inside the stage. */
export function computeContainBox(
  stageW: number,
  stageH: number,
  naturalWidth: number,
  naturalHeight: number,
): ContainBox {
  if (!stageW || !stageH || !naturalWidth || !naturalHeight) {
    return { offsetX: 0, offsetY: 0, scale: 1, stageW, stageH };
  }
  const scale = Math.min(stageW / naturalWidth, stageH / naturalHeight);
  const displayW = naturalWidth * scale;
  const displayH = naturalHeight * scale;
  return {
    offsetX: (stageW - displayW) / 2,
    offsetY: (stageH - displayH) / 2,
    scale,
    stageW,
    stageH,
  };
}

/**
 * `panZoom.x/y` is the CENTER (0-1 fraction) of the region left visible after the zoom.
 * `transform-origin` is ALWAYS kept fixed at 50%/50% — the actual point to "aim" at is
 * achieved via a `translate` applied before the scale, not by moving the origin. That way,
 * going from one zoom to another (different center, different scale, or no zoom at all) is
 * a single continuous `transform` interpolation — no instant jump from moving the origin
 * mid-transition.
 *
 * Composition order matters for HOW that transition interpolates, not just its endpoint.
 * `scale(a) translate(b)` puts a point's screen offset at `a*(p + b)` — since `b` is also
 * being animated independently of `a`, the two interpolate on different curves and the
 * effective path is non-linear (it visibly drifts toward the center before correcting).
 * Composing as `translate(b) scale(a)` instead, with `b` pre-multiplied by the *final* scale
 * so the endpoint still lands on the same point, makes the offset `a*p + b` — affine in both
 * animated values, so every point in the image travels in a straight line for the whole
 * transition (zoom-in and zoom-out alike).
 */
export function zoomTransform(panZoom: PanZoom): string {
  const tx = panZoom.scale * (0.5 - panZoom.x) * 100;
  const ty = panZoom.scale * (0.5 - panZoom.y) * 100;
  return `translate(${tx}%, ${ty}%) scale(${panZoom.scale})`;
}

/** Hotspot anchor point in stage px, already adjusted for the panZoom CSS transform if present. */
export function computeAnchorPoint(
  hotspot: Pick<Hotspot, "x" | "y">,
  box: ContainBox,
  naturalWidth: number,
  naturalHeight: number,
  panZoom?: PanZoom,
): { left: number; top: number } {
  const base = {
    left: box.offsetX + hotspot.x * naturalWidth * box.scale,
    top: box.offsetY + hotspot.y * naturalHeight * box.scale,
  };

  if (!panZoom) return base;

  // Same model as `zoomTransform`: origin fixed at the stage center (50%/50%) and the
  // "where to" is applied as an offset of the crop's center before scaling.
  const { x: cx, y: cy, scale: panScale } = panZoom;
  return {
    left: 0.5 * box.stageW + (base.left - cx * box.stageW) * panScale,
    top: 0.5 * box.stageH + (base.top - cy * box.stageH) * panScale,
  };
}

export type TooltipSide = Exclude<HotspotPosition, "auto">;

export interface TooltipPlacement {
  left: number;
  top: number;
  side: TooltipSide;
  /** Offset (px) of the arrow tip inside the tooltip, on the axis perpendicular to the side. */
  arrowOffset: number;
}

const OPPOSITE: Record<TooltipSide, TooltipSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/** Auto placement preference: below first (reads like a caption under what you click), then above, then the sides. */
const AUTO_ORDER: TooltipSide[] = ["bottom", "top", "right", "left"];

/**
 * Places the callout next to the hotspot. `auto` takes the first side in AUTO_ORDER where the
 * tooltip fits; an explicit side is honored if it fits and flipped to the opposite side if
 * only that one fits (so it never ends up covering the hotspot). The result is then clamped
 * to the stage, with the arrow offset still pointing at the anchor.
 */
export function computeTooltipPlacement(params: {
  anchor: { left: number; top: number };
  tooltipSize: { width: number; height: number };
  stageSize: { width: number; height: number };
  position?: HotspotPosition;
  gap?: number;
}): TooltipPlacement {
  const { anchor, tooltipSize, stageSize, gap = TOOLTIP_GAP_PX } = params;
  const { width, height } = tooltipSize;
  const { width: stageW, height: stageH } = stageSize;
  const m = TOOLTIP_EDGE_MARGIN_PX;

  const origin = (side: TooltipSide): { left: number; top: number } => {
    switch (side) {
      case "top":
        return {
          left: anchor.left - width / 2,
          top: anchor.top - gap - height,
        };
      case "bottom":
        return { left: anchor.left - width / 2, top: anchor.top + gap };
      case "left":
        return {
          left: anchor.left - gap - width,
          top: anchor.top - height / 2,
        };
      case "right":
        return { left: anchor.left + gap, top: anchor.top - height / 2 };
    }
  };
  // Only the main axis must fit — the cross axis is fixed by clamping below.
  const fits = (side: TooltipSide): boolean => {
    const o = origin(side);
    return side === "top" || side === "bottom"
      ? o.top >= m && o.top + height <= stageH - m
      : o.left >= m && o.left + width <= stageW - m;
  };

  const requested = params.position ?? "auto";
  let side: TooltipSide;
  if (requested === "auto") {
    side = AUTO_ORDER.find(fits) ?? "bottom";
  } else {
    side =
      fits(requested) || !fits(OPPOSITE[requested])
        ? requested
        : OPPOSITE[requested];
  }

  const o = origin(side);
  const left = Math.min(Math.max(o.left, m), Math.max(m, stageW - width - m));
  const top = Math.min(Math.max(o.top, m), Math.max(m, stageH - height - m));

  const arrowOffset =
    side === "top" || side === "bottom"
      ? Math.min(
          Math.max(anchor.left - left, ARROW_MIN_MARGIN_PX),
          width - ARROW_MIN_MARGIN_PX,
        )
      : Math.min(
          Math.max(anchor.top - top, ARROW_MIN_MARGIN_PX),
          height - ARROW_MIN_MARGIN_PX,
        );

  return { left, top, side, arrowOffset };
}
