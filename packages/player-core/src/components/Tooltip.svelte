<script lang="ts">
import type { HotspotPosition } from "@rustrak/openshowcase-schema";
import { cubicIn } from "svelte/easing";
import { bubblePath } from "../core/bubble-path";
import { computeTooltipPlacement, type TooltipSide } from "../core/geometry";

interface Props {
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

let {
  anchor,
  stageSize,
  position,
  visible,
  text,
  bgColor = "#C5F11E",
  textColor = "#0C0C0C",
  hovered = false,
  onclick,
  onhoverchange,
}: Props = $props();

/** Unique per tooltip — the SVG gradients/clip below are referenced by id. */
const uid = $props.id();

/** Must match the exit transition in the <style> block below. */
const EXIT_MS = 150;

// What's on screen. While the tooltip fades out it keeps showing the *old* text and
// position — the next step's content only swaps in once it's invisible, so it never jumps
// or changes text mid-fade.
let shown = $state({ anchor, text, bgColor, textColor, position });
$effect(() => {
  const next = { anchor, text, bgColor, textColor, position };
  if (visible) {
    shown = next;
    return;
  }
  const timer = setTimeout(() => {
    shown = next;
  }, EXIT_MS);
  return () => clearTimeout(timer);
});

let rootEl: HTMLDivElement | undefined = $state();
let size = $state({ width: 0, height: 0, unit: 14 });
// placeholder until the first post-mount measurement — the $effect below replaces it
// immediately, before the browser paints the first frame with a visible tooltip
let placement = $state<{
  left: number;
  top: number;
  side: TooltipSide;
  arrowOffset: number;
}>({ left: 0, top: 0, side: "bottom", arrowOffset: 0 });

$effect(() => {
  // re-measure whenever what's shown or the stage changes (text changes the rendered size)
  void shown.text;
  void stageSize;
  const el = rootEl;
  if (!el) return;
  // --wd-u in px, recovered from the font size it drives (0.875u) — the gap clears the
  // hotspot's halo at every player size.
  const unit = Number.parseFloat(getComputedStyle(el).fontSize) / 0.875 || 14;
  size = { width: el.offsetWidth, height: el.offsetHeight, unit };
  placement = computeTooltipPlacement({
    anchor: shown.anchor,
    tooltipSize: { width: el.offsetWidth, height: el.offsetHeight },
    stageSize,
    position: shown.position,
    gap: Math.round(unit * 1.55 + 4),
  });
});

// Box + tail as one outline (see core/bubble-path.ts) — the body the text sits on.
const outline = $derived(
  size.width > 0
    ? bubblePath({
        width: size.width,
        height: size.height,
        radius: size.unit * 0.65,
        side: placement.side,
        tailOffset: placement.arrowOffset,
        tail: {
          width: size.unit * 1.2,
          height: size.unit * 0.55,
          tipRadius: 2,
        },
      })
    : "",
);

/** Exit when the whole overlay unmounts (e.g. switching to a video step). */
function vanish(_node: Element) {
  return {
    duration: EXIT_MS,
    easing: cubicIn,
    css: (t: number) => `opacity: ${t};`,
  };
}
</script>

<div
  bind:this={rootEl}
  role="button"
  tabindex={visible ? 0 : -1}
  aria-hidden={!visible}
  class="tooltip"
  class:tooltip--visible={visible}
  class:tooltip--hover={hovered}
  class:tooltip--side-top={placement.side === 'top'}
  class:tooltip--side-bottom={placement.side === 'bottom'}
  class:tooltip--side-left={placement.side === 'left'}
  class:tooltip--side-right={placement.side === 'right'}
  style="left: {placement.left}px; top: {placement.top}px; --wd-tip-bg: {shown.bgColor}; color: {shown.textColor}; --wd-arrow: {placement.arrowOffset}px;"
  onclick={() => onclick?.()}
  onkeydown={(event) => (event.key === 'Enter' || event.key === ' ') && onclick?.()}
  onmouseenter={() => onhoverchange?.(true)}
  onmouseleave={() => onhoverchange?.(false)}
  out:vanish
><svg class="body" width={size.width} height={size.height} aria-hidden="true"><defs><linearGradient id="{uid}-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color: color-mix(in oklab, {shown.bgColor} 86%, white)" /><stop offset="0.5" style="stop-color: {shown.bgColor}" /><stop offset="1" style="stop-color: color-mix(in oklab, {shown.bgColor} 92%, black)" /></linearGradient><radialGradient id="{uid}-sheen" cx="0.1" cy="-0.35" r="1"><stop offset="0" stop-color="#fff" stop-opacity="0.26" /><stop offset="0.6" stop-color="#fff" stop-opacity="0" /></radialGradient><linearGradient id="{uid}-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.5" /><stop offset="0.4" stop-color="#fff" stop-opacity="0" /><stop offset="0.8" stop-color="#000" stop-opacity="0" /><stop offset="1" stop-color="#000" stop-opacity="0.1" /></linearGradient><clipPath id="{uid}-clip"><path d={outline} /></clipPath></defs><path d={outline} fill="url(#{uid}-fill)" /><path d={outline} fill="url(#{uid}-sheen)" /><path d={outline} class="rim" stroke="url(#{uid}-rim)" clip-path="url(#{uid}-clip)" /><path d={outline} class="edge" /></svg>{shown.text}</div>

<style>
  .tooltip {
    position: absolute;
    z-index: 4;
    width: max-content;
    min-width: calc(var(--wd-u, 14px) * 4);
    max-width: min(calc(var(--wd-u, 14px) * 18), 300px);
    padding: calc(var(--wd-u, 14px) * 0.7) calc(var(--wd-u, 14px) * 0.9);
    border-radius: calc(var(--wd-u, 14px) * 0.65);
    font-size: calc(var(--wd-u, 14px) * 0.875);
    font-weight: 500;
    line-height: 1.45;
    letter-spacing: -0.005em;
    text-align: left;
    text-wrap: pretty;
    overflow-wrap: anywhere;
    cursor: pointer;
    pointer-events: none;
    outline: none;
    /* The visible body is the SVG outline (box + tail as one shape, see .body below); the
       element itself stays transparent and just carries the text. */
    isolation: isolate;
    background: none;

    /* hidden: nudged toward the hotspot, slightly small and soft */
    opacity: 0;
    translate: var(--wd-from, 0 0);
    scale: 0.94;
    filter: blur(3px);
    /* exit: fast, eased in */
    transition:
      opacity 150ms var(--wd-ease-in, ease-in),
      translate 150ms var(--wd-ease-in, ease-in),
      scale 150ms var(--wd-ease-in, ease-in),
      filter 150ms var(--wd-ease-in, ease-in);
  }

  /* grows out of the arrow tip */
  .tooltip--side-top {
    --wd-from: 0 6px;
    transform-origin: var(--wd-arrow) 100%;
  }
  .tooltip--side-bottom {
    --wd-from: 0 -6px;
    transform-origin: var(--wd-arrow) 0;
  }
  .tooltip--side-left {
    --wd-from: 6px 0;
    transform-origin: 100% var(--wd-arrow);
  }
  .tooltip--side-right {
    --wd-from: -6px 0;
    transform-origin: 0 var(--wd-arrow);
  }

  .tooltip--visible {
    pointer-events: auto;
    opacity: 1;
    translate: 0 0;
    scale: 1;
    filter: blur(0);
    /* enter: a soft spring */
    transition:
      opacity 200ms var(--wd-ease-out, ease-out),
      translate 440ms var(--wd-spring-tip, ease-out),
      scale 440ms var(--wd-spring-tip, ease-out),
      filter 240ms var(--wd-ease-out, ease-out);
  }

  .tooltip--hover {
    scale: 1.02;
  }

  .tooltip:focus-visible .edge {
    stroke: rgb(255 255 255 / 0.95);
    stroke-width: 3px;
  }

  /* The body: fill (a subtle top-lit gradient of the brand color) + a specular sheen + an
     inner rim (light along the top, a faint shade at the bottom, clipped inside the shape so
     it reads as a bevel) + a 1px dark edge — all following box and tail as one outline. The
     layered drop-shadow is on the SVG so it follows the tail too. */
  .body {
    position: absolute;
    inset: 0 auto auto 0;
    z-index: -1;
    overflow: visible;
    pointer-events: none;
    filter: drop-shadow(0 1px 1px rgb(17 24 39 / 0.1))
      drop-shadow(0 4px 8px rgb(17 24 39 / 0.1))
      drop-shadow(0 14px 28px rgb(17 24 39 / 0.14));
    transition: filter 200ms ease;
  }
  .tooltip--hover .body {
    filter: drop-shadow(0 1px 1px rgb(17 24 39 / 0.12))
      drop-shadow(0 6px 12px rgb(17 24 39 / 0.14))
      drop-shadow(0 18px 36px rgb(17 24 39 / 0.18));
  }
  .rim {
    fill: none;
    stroke-width: 2px;
  }
  .edge {
    fill: none;
    stroke: rgb(0 0 0 / 0.16);
    stroke-width: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    .tooltip,
    .tooltip--visible {
      translate: 0 0;
      scale: 1;
      transition: opacity 150ms ease;
    }
  }
</style>
