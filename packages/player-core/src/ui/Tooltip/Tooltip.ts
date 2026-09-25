import type { HotspotPosition } from "@rustrak/openshowcase-schema";
import { bubblePath } from "../../core/bubble-path";
import { computeTooltipPlacement, type TooltipSide } from "../../core/geometry";
import { cx, h, onCleanup, svg, type ViewProps } from "../../dom/h";
import { computed, effect, signal } from "../../dom/signals";
import { injectStyles } from "../../dom/styles";
import { css } from "./Tooltip.styles";

export interface TooltipProps {
  /** The hotspot's anchor point in stage px — the tooltip measures itself and places
   * itself relative to this, flipped/clamped to stageSize. */
  anchor: { left: number; top: number };
  stageSize: { width: number; height: number };
  position?: HotspotPosition;
  visible: boolean;
  text: string;
  bgColor?: string;
  textColor?: string;
  /** Hover is shared visually with the Hotspot point, so it's controlled by the parent
   * rather than tracked internally — hovering either one highlights both. */
  hovered?: boolean;
  onclick?: () => void;
  onhoverchange?: (hovered: boolean) => void;
}

/** Must match the exit transition in Tooltip.styles.ts. */
const EXIT_MS = 150;

/** Unique per tooltip — the SVG gradients/clip are referenced by id. */
let nextId = 0;

interface Shown {
  anchor: { left: number; top: number };
  text: string;
  bgColor: string;
  textColor: string;
  position: HotspotPosition | undefined;
}

export function Tooltip(props: ViewProps<TooltipProps>): HTMLDivElement {
  injectStyles(document, "tooltip", css);
  const uid = `tip${++nextId}`;
  const current = (): Shown => ({
    anchor: props.anchor(),
    text: props.text(),
    bgColor: props.bgColor?.() ?? "#C5F11E",
    textColor: props.textColor?.() ?? "#0C0C0C",
    position: props.position?.(),
  });

  // What's on screen. While the tooltip fades out it keeps showing the *old* text and
  // position — the next step's content only swaps in once it's invisible, so it never jumps
  // or changes text mid-fade.
  const shown = signal(current());
  effect(() => {
    const next = current();
    if (props.visible()) {
      shown(next);
      return;
    }
    const timer = setTimeout(() => shown(next), EXIT_MS);
    return () => clearTimeout(timer);
  });

  const size = signal({ width: 0, height: 0, unit: 14 });
  const placement = signal<{
    left: number;
    top: number;
    side: TooltipSide;
    arrowOffset: number;
  }>({ left: 0, top: 0, side: "bottom", arrowOffset: 0 });

  // Box + tail as one outline (see core/bubble-path.ts) — the body the text sits on.
  const outline = computed(() => {
    const { width, height, unit } = size();
    if (width <= 0) return "";
    const { side, arrowOffset } = placement();
    return bubblePath({
      width,
      height,
      radius: unit * 0.65,
      side,
      tailOffset: arrowOffset,
      tail: { width: unit * 1.2, height: unit * 0.55, tipRadius: 2 },
    });
  });

  const stop = (offset: string, style: () => string) =>
    svg("stop", { offset, style });
  const fixedStop = (offset: string, color: string, opacity: string) =>
    svg("stop", {
      offset,
      "stop-color": color,
      "stop-opacity": opacity,
    });

  const body = svg(
    "svg",
    {
      class: "body",
      width: () => size().width,
      height: () => size().height,
      "aria-hidden": "true",
    },
    svg(
      "defs",
      null,
      svg(
        "linearGradient",
        { id: `${uid}-fill`, x1: "0", y1: "0", x2: "0", y2: "1" },
        stop(
          "0",
          () =>
            `stop-color: color-mix(in oklab, ${shown().bgColor} 86%, white)`,
        ),
        stop("0.5", () => `stop-color: ${shown().bgColor}`),
        stop(
          "1",
          () =>
            `stop-color: color-mix(in oklab, ${shown().bgColor} 92%, black)`,
        ),
      ),
      svg(
        "radialGradient",
        { id: `${uid}-sheen`, cx: "0.1", cy: "-0.35", r: "1" },
        fixedStop("0", "#fff", "0.26"),
        fixedStop("0.6", "#fff", "0"),
      ),
      svg(
        "linearGradient",
        { id: `${uid}-rim`, x1: "0", y1: "0", x2: "0", y2: "1" },
        fixedStop("0", "#fff", "0.5"),
        fixedStop("0.4", "#fff", "0"),
        fixedStop("0.8", "#000", "0"),
        fixedStop("1", "#000", "0.1"),
      ),
      svg(
        "clipPath",
        { id: `${uid}-clip` },
        svg("path", { d: () => outline() }),
      ),
    ),
    svg("path", { d: () => outline(), fill: `url(#${uid}-fill)` }),
    svg("path", { d: () => outline(), fill: `url(#${uid}-sheen)` }),
    svg("path", {
      d: () => outline(),
      class: "rim",
      stroke: `url(#${uid}-rim)`,
      "clip-path": `url(#${uid}-clip)`,
    }),
    svg("path", { d: () => outline(), class: "edge" }),
  );

  const root = h(
    "div",
    {
      role: "button",
      tabindex: () => (props.visible() ? 0 : -1),
      "aria-hidden": () => !props.visible(),
      class: () => {
        const side = placement().side;
        return cx(
          "tooltip",
          props.visible() && "tooltip--visible",
          props.hovered?.() && "tooltip--hover",
          side === "top" && "tooltip--side-top",
          side === "bottom" && "tooltip--side-bottom",
          side === "left" && "tooltip--side-left",
          side === "right" && "tooltip--side-right",
        );
      },
      style: () =>
        `left: ${placement().left}px; top: ${placement().top}px; --wd-tip-bg: ${shown().bgColor}; color: ${shown().textColor}; --wd-arrow: ${placement().arrowOffset}px;`,
      onclick: () => props.onclick?.(),
      onkeydown: (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") props.onclick?.();
      },
      onmouseenter: () => props.onhoverchange?.(true),
      onmouseleave: () => props.onhoverchange?.(false),
    },
    body,
    () => shown().text,
  );

  // Re-measure whenever what's shown or the stage changes (text changes the rendered size).
  // It needs the element in the page, so it starts once the caller has inserted it.
  const mounted = signal(false);
  queueMicrotask(() => mounted(true));
  effect(() => {
    void shown().text;
    const stageSize = props.stageSize();
    if (!mounted() || !root.isConnected) return;
    // --wd-u in px, recovered from the font size it drives (0.875u) — the gap clears the
    // hotspot's halo at every player size.
    const unit =
      Number.parseFloat(getComputedStyle(root).fontSize) / 0.875 || 14;
    size({ width: root.offsetWidth, height: root.offsetHeight, unit });
    placement(
      computeTooltipPlacement({
        anchor: shown().anchor,
        tooltipSize: { width: root.offsetWidth, height: root.offsetHeight },
        stageSize,
        position: shown().position,
        gap: Math.round(unit * 1.55 + 4),
      }),
    );
  });
  onCleanup(() => mounted(false));

  return root;
}

/** Exit when the whole overlay unmounts (e.g. switching to a video step). Resolves when done. */
export function vanishTooltip(el: Element): Promise<void> {
  const animation = el.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: EXIT_MS,
    // ease-in cubic, same curve as Svelte's `cubicIn`
    easing: "cubic-bezier(0.32, 0, 0.67, 0)",
    fill: "forwards",
  });
  return animation.finished.then(() => undefined);
}
