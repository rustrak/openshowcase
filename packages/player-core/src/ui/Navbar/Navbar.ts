import { formatClipTime } from "../../core/clip-time";
import { cx, each, h, show, svg, type ViewProps } from "../../dom/h";
import { computed, effect } from "../../dom/signals";
import { injectStyles } from "../../dom/styles";
import { css } from "./Navbar.styles";

export interface NavbarSegment {
  /** Fill progress within the segment, 0-1. */
  progress: number;
  /** The currently playing/paused step — rendered wider than the rest, in the accent color. */
  active: boolean;
  /** A step already passed — fill goes fully white instead of the accent color. */
  done: boolean;
}

export interface NavbarProps {
  segments: NavbarSegment[];
  /** The current step's color. Defaults to white. */
  accent?: string;
  /** The clip playing, in seconds of playback. A photo step has none, so no play/pause or time. */
  clip?: { elapsed: number; total: number } | undefined;
  paused?: boolean;
  /** Hidden, it doesn't take pointer events — hotspots underneath stay clickable. */
  visible?: boolean;
  onTogglePlay?: () => void;
  onSeek?: (index: number) => void;
}

const PLAY =
  "M5 3.2c0-.8.9-1.3 1.6-.9l6.3 4c.7.4.7 1.4 0 1.8l-6.3 4c-.7.4-1.6-.1-1.6-.9z";
const PAUSE =
  "M3.5 3.6c0-.6.5-1.1 1.1-1.1h1c.6 0 1.1.5 1.1 1.1v8.8c0 .6-.5 1.1-1.1 1.1h-1c-.6 0-1.1-.5-1.1-1.1zm5.8 0c0-.6.5-1.1 1.1-1.1h1c.6 0 1.1.5 1.1 1.1v8.8c0 .6-.5 1.1-1.1 1.1h-1c-.6 0-1.1-.5-1.1-1.1z";

export function Navbar(props: ViewProps<NavbarProps>): HTMLDivElement {
  injectStyles(document, "navbar", css);
  const activeIndex = computed(() =>
    props.segments().findIndex((segment) => segment.active),
  );

  const element = h(
    "div",
    { class: () => cx("navbar", props.visible?.() && "navbar--visible") },
    show(
      () => props.clip?.() != null,
      () =>
        h(
          "div",
          { class: "clip" },
          h(
            "button",
            {
              type: "button",
              class: "clip-toggle",
              title: () => (props.paused?.() ? "Play" : "Pause"),
              "aria-label": () => (props.paused?.() ? "Play" : "Pause"),
              onclick: (event: MouseEvent) => {
                event.stopPropagation();
                props.onTogglePlay?.();
              },
            },
            svg(
              "svg",
              { viewBox: "0 0 16 16", "aria-hidden": "true" },
              svg("path", { d: () => (props.paused?.() ? PLAY : PAUSE) }),
            ),
          ),
          h("span", { class: "clip-time" }, () => {
            const clip = props.clip?.();
            return clip ? formatClipTime(clip.elapsed, clip.total) : "";
          }),
        ),
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
              "aria-label": `Go to step ${index + 1}`,
              "data-label": `${index + 1}`,
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
      {
        class: "counter",
        "aria-live": "polite",
        // as wide as the longest count ("12/12"), so it doesn't shift going from 9 to 10
        style: () =>
          `min-width: ${String(props.segments().length).length * 2 + 1}ch;`,
      },
      () => Math.max(0, activeIndex()) + 1,
      h(
        "span",
        { class: "counter-total" },
        () => `/${props.segments().length}`,
      ),
    ),
  );
  // A custom property, not a style attribute: a demo's color can't add declarations
  effect(() => {
    const accent = props.accent?.();
    if (accent) element.style.setProperty("--wd-accent", accent);
    else element.style.removeProperty("--wd-accent");
  });
  return element;
}
