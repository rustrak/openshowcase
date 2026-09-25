import { cx, each, h, svg, type ViewProps } from "../../dom/h";
import { computed } from "../../dom/signals";
import { injectStyles } from "../../dom/styles";
import { css } from "./Navbar.styles";

export interface NavbarSegment {
  /** Fill progress within the segment, 0-1. */
  progress: number;
  /** The currently playing/paused step — rendered wider than the rest. */
  active: boolean;
  /** A step already passed — fill goes fully white instead of the accent color. */
  done: boolean;
}

export interface NavbarProps {
  segments: NavbarSegment[];
  /** Shown while the viewer is interacting (pointer moving over the player, keyboard focus
   * inside it). Hidden, it doesn't take pointer events — hotspots underneath stay clickable. */
  visible?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onSeek?: (index: number) => void;
}

function icon(d: string): SVGSVGElement {
  return svg(
    "svg",
    { viewBox: "0 0 16 16", "aria-hidden": "true" },
    svg("path", { d }),
  );
}

export function Navbar(props: ViewProps<NavbarProps>): HTMLDivElement {
  injectStyles(document, "navbar", css);
  const activeIndex = computed(() =>
    props.segments().findIndex((segment) => segment.active),
  );

  return h(
    "div",
    { class: () => cx("navbar", props.visible?.() && "navbar--visible") },
    h(
      "button",
      {
        type: "button",
        title: "Previous step",
        "aria-label": "Previous step",
        class: "nav-btn",
        onclick: (event: MouseEvent) => {
          event.stopPropagation();
          props.onPrev?.();
        },
      },
      icon("M10 3.5 5.5 8l4.5 4.5"),
    ),
    h(
      "div",
      { class: "segments" },
      each(
        () => props.segments(),
        (_, index) => index,
        (segment, index) =>
          h(
            "button",
            {
              type: "button",
              title: `Go to step ${index + 1}`,
              class: () =>
                cx(
                  "segment",
                  segment().active && "segment--active",
                  segment().done && "segment--done",
                ),
              onclick: (event: MouseEvent) => {
                event.stopPropagation();
                props.onSeek?.(index);
              },
            },
            h(
              "span",
              { class: "segment-track" },
              h("span", {
                class: () =>
                  cx("segment-fill", segment().done && "segment-fill--done"),
                style: () => `width: ${segment().progress * 100}%`,
              }),
            ),
          ),
      ),
    ),
    h(
      "span",
      { class: "counter", "aria-live": "polite" },
      () => Math.max(0, activeIndex()) + 1,
      h(
        "span",
        { class: "counter-total" },
        () => `/${props.segments().length}`,
      ),
    ),
    h(
      "button",
      {
        type: "button",
        title: "Next step",
        "aria-label": "Next step",
        class: "nav-btn",
        onclick: (event: MouseEvent) => {
          event.stopPropagation();
          props.onNext?.();
        },
      },
      icon("M6 3.5 10.5 8 6 12.5"),
    ),
  );
}
