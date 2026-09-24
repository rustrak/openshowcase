import type {
  Hotspot as HotspotData,
  HotspotPosition,
} from "@rustrak/openshowcase-schema";
import { defaultHotspotStyle } from "@rustrak/openshowcase-schema";

export interface PhotoHotspotVisual {
  left: number;
  top: number;
  color: string;
  /** Skip the position transition — used for instant repositioning (resize, or first appearance). */
  instant: boolean;
  /** Play the pop-in appear animation instead of "traveling" from a previous position. */
  appear: boolean;
}

export interface PhotoTooltipVisual {
  anchor: { left: number; top: number };
  position?: HotspotPosition;
  visible: boolean;
  text: string;
  bgColor?: string;
  textColor?: string;
}

export interface PhotoOverlayCallbacks {
  setHotspot: (hotspot: PhotoHotspotVisual | undefined) => void;
  setTooltip: (tooltip: PhotoTooltipVisual | undefined) => void;
  showTooltip: () => void;
  hideTooltip: () => void;
}

const TRAVEL_THRESHOLD_PX = 2;
const APPEAR_TOOLTIP_DELAY_MS = 220;
const TRAVEL_TOOLTIP_DELAY_MS = 660;

/**
 * Owns the hotspot/tooltip reveal choreography for photo steps: whether the point "travels"
 * like a cursor from its last position or pops in fresh, and how long the tooltip callout
 * waits before fading in. Framework-agnostic — the caller only supplies callbacks to apply
 * the computed visual state and reports whether a scheduled step is still the current one.
 */
export class PhotoOverlayController {
  private lastAnchor: { left: number; top: number } | undefined;
  private tooltipTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly callbacks: PhotoOverlayCallbacks) {}

  /** Show (or hide) the overlay for a newly revealed photo step. */
  reveal(
    hotspot: HotspotData | undefined,
    anchor: { left: number; top: number } | undefined,
    isStillCurrent: () => boolean,
  ): void {
    clearTimeout(this.tooltipTimer);

    if (!hotspot || !anchor) {
      this.callbacks.setHotspot(undefined);
      this.callbacks.setTooltip(undefined);
      return;
    }

    const bg = hotspot.bgColor ?? defaultHotspotStyle.bgColor;
    const from = this.lastAnchor;
    const travels =
      from != null &&
      (Math.abs(from.left - anchor.left) > TRAVEL_THRESHOLD_PX ||
        Math.abs(from.top - anchor.top) > TRAVEL_THRESHOLD_PX);

    if (travels) {
      // photo → photo: the point travels like a cursor from its last position
      this.callbacks.setHotspot({
        left: from.left,
        top: from.top,
        color: bg,
        instant: true,
        appear: false,
      });
      requestAnimationFrame(() => {
        if (!isStillCurrent()) return;
        this.callbacks.setHotspot({
          left: anchor.left,
          top: anchor.top,
          color: bg,
          instant: false,
          appear: false,
        });
      });
    } else {
      // after a video (or the very first step) the real cursor was already there: pop in
      this.callbacks.setHotspot({
        left: anchor.left,
        top: anchor.top,
        color: bg,
        instant: true,
        appear: !from,
      });
    }
    this.lastAnchor = anchor;

    if (hotspot.label) {
      this.callbacks.setTooltip({
        anchor,
        position: hotspot.position,
        visible: false,
        text: hotspot.label,
        bgColor: bg,
        textColor: hotspot.textColor ?? defaultHotspotStyle.textColor,
      });
      // the callout appears once the point has arrived
      this.tooltipTimer = setTimeout(
        () => {
          if (!isStillCurrent()) return;
          this.callbacks.showTooltip();
        },
        travels ? TRAVEL_TOOLTIP_DELAY_MS : APPEAR_TOOLTIP_DELAY_MS,
      );
    } else {
      this.callbacks.setTooltip(undefined);
    }
  }

  /** Instant repositioning on resize — never retriggers the "travel" animation. */
  reposition(
    currentHotspot: PhotoHotspotVisual,
    currentTooltip: PhotoTooltipVisual | undefined,
    anchor: { left: number; top: number },
  ): void {
    this.lastAnchor = anchor;
    this.callbacks.setHotspot({
      ...currentHotspot,
      left: anchor.left,
      top: anchor.top,
      instant: true,
    });
    if (currentTooltip)
      this.callbacks.setTooltip({ ...currentTooltip, anchor });
  }

  /** Fades the tooltip out without touching the hotspot or the "travel" bookkeeping — used
   * right before a new photo step's image starts decoding. */
  hide(): void {
    clearTimeout(this.tooltipTimer);
    this.callbacks.hideTooltip();
  }

  /** Clears bookkeeping and hides the overlay entirely — used when entering a video step or finishing. */
  reset(): void {
    clearTimeout(this.tooltipTimer);
    this.lastAnchor = undefined;
    this.callbacks.setHotspot(undefined);
    this.callbacks.setTooltip(undefined);
  }

  dispose(): void {
    clearTimeout(this.tooltipTimer);
  }
}
