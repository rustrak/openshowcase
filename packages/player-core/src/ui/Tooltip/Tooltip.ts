import type { HotspotPosition } from "@rustrak/openshowcase-schema";
import { bubblePath } from "../../core/bubble-path";
import { computeTooltipPlacement, type TooltipSide } from "../../core/geometry";
import { cx, each, h, onCleanup, show, svg, type ViewProps } from "../../dom/h";
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
  /** Where this step is in the demo, for the footer. No footer without it. */
  step?: { current: number; total: number } | undefined;
  onclick?: () => void;
  onhoverchange?: (hovered: boolean) => void;
}

/** Must match the exit transition in Tooltip.styles.ts. */
const EXIT_MS = 150;
/** The font size in --wd-u. Must match Tooltip.styles.ts. */
const FONT_SIZE_U = 0.92;

/** Unique per tooltip — the SVG gradients/clip are referenced by id. */
let nextId = 0;

interface Shown {
  anchor: { left: number; top: number };
  text: string;
  bgColor: string;
  textColor: string;
  position: HotspotPosition | undefined;
  step: { current: number; total: number } | undefined;
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
    step: props.step?.(),
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

  // Words animate in one by one. The spaces stay plain text, so it wraps and reads as ever.
  const tokens = computed(() => {
    let word = 0;
    return shown()
      .text.split(/(\s+)/)
      .filter(Boolean)
      .map((text) => ({
        text,
        word: /\s/.test(text) ? -1 : word++,
      }));
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
      radius: unit * 0.95,
      side,
      tailOffset: arrowOffset,
      tail: { width: unit * 1.2, height: unit * 0.55, tipRadius: 2 },
    });
  });

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
        svg("stop", { offset: "0", class: "fill-top" }),
        svg("stop", { offset: "1", class: "fill-base" }),
      ),
      svg(
        "linearGradient",
        { id: `${uid}-rim`, x1: "0", y1: "0", x2: "0", y2: "1" },
        fixedStop("0", "#fff", "0.45"),
        fixedStop("0.25", "#fff", "0"),
      ),
      svg(
        "clipPath",
        { id: `${uid}-clip` },
        svg("path", { d: () => outline() }),
      ),
    ),
    svg("path", { d: () => outline(), fill: `url(#${uid}-fill)` }),
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
          side === "top" && "tooltip--side-top",
          side === "bottom" && "tooltip--side-bottom",
          side === "left" && "tooltip--side-left",
          side === "right" && "tooltip--side-right",
        );
      },
      onclick: () => props.onclick?.(),
      onkeydown: (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") props.onclick?.();
      },
      onmouseenter: () => props.onhoverchange?.(true),
      onmouseleave: () => props.onhoverchange?.(false),
    },
    body,
    each(
      () => tokens(),
      (token, index) => `${index}:${token.text}`,
      (token) => {
        const { text, word } = token();
        return word < 0
          ? document.createTextNode(text)
          : h("span", { class: "tip-word", style: `--wd-i: ${word}` }, text);
      },
    ),
    show(
      () => shown().step,
      () =>
        h(
          "div",
          { class: "tip-foot", "aria-hidden": "true" },
          h("span", { class: "tip-count" }, () => {
            const step = shown().step;
            return step ? `${step.current}/${step.total}` : "";
          }),
          h(
            "span",
            { class: "tip-bar" },
            h("span", {
              class: "tip-bar-fill",
              style: () => {
                const step = shown().step;
                return `width: ${step ? (step.current / step.total) * 100 : 0}%`;
              },
            }),
          ),
          h(
            "span",
            { class: "tip-go" },
            svg(
              "svg",
              { viewBox: "0 0 16 16" },
              svg("path", { d: "M3.5 8h9M8.5 4l4 4-4 4" }),
            ),
          ),
        ),
    ),
  );

  // Properties, not a style attribute: a demo's colors can't add declarations
  effect(() => {
    const { left, top, arrowOffset } = placement();
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    root.style.setProperty("--wd-arrow", `${arrowOffset}px`);
  });
  effect(() => {
    const { bgColor, textColor } = shown();
    root.style.setProperty("--wd-tip-bg", bgColor);
    root.style.color = textColor;
  });

  // Re-measure whenever what's shown or the stage changes (text changes the rendered size).
  // It needs the element in the page, so it starts once the caller has inserted it.
  const mounted = signal(false);
  queueMicrotask(() => mounted(true));
  effect(() => {
    void shown().text;
    void shown().step;
    const stageSize = props.stageSize();
    if (!mounted() || !root.isConnected) return;
    // --wd-u in px, recovered from the font size it drives — the gap clears the hotspot's
    // ring at every player size.
    const unit =
      Number.parseFloat(getComputedStyle(root).fontSize) / FONT_SIZE_U || 14;
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
