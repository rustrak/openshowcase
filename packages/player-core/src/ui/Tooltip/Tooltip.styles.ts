// Every selector starts with .openshowcase-player, so these styles never reach the host page.
export const css = `
.openshowcase-player .tooltip {
  position: absolute;
  z-index: 4;
  width: max-content;
  min-width: calc(var(--wd-u, 14px) * 14);
  max-width: min(calc(var(--wd-u, 14px) * 19), 74cqw);
  padding: calc(var(--wd-u, 14px) * 0.78) calc(var(--wd-u, 14px) * 0.95)
    calc(var(--wd-u, 14px) * 0.62);
  border-radius: calc(var(--wd-u, 14px) * 0.95);
  /* Tooltip.ts recovers --wd-u from this: keep FONT_SIZE_U in sync */
  font-size: calc(var(--wd-u, 14px) * 0.92);
  font-weight: 500;
  line-height: 1.38;
  letter-spacing: -0.006em;
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

  /* hidden: pulled in toward the hotspot, small */
  opacity: 0;
  translate: var(--wd-from, 0 0);
  scale: 0.82;
  /* exit: fast, eased in */
  transition:
    opacity 150ms var(--wd-ease-in, ease-in),
    translate 150ms var(--wd-ease-in, ease-in),
    scale 150ms var(--wd-ease-in, ease-in);
}

/* grows out of the arrow tip */
.openshowcase-player .tooltip--side-top {
  --wd-from: 0 10px;
  transform-origin: var(--wd-arrow) 100%;
}
.openshowcase-player .tooltip--side-bottom {
  --wd-from: 0 -10px;
  transform-origin: var(--wd-arrow) 0;
}
.openshowcase-player .tooltip--side-left {
  --wd-from: 10px 0;
  transform-origin: 100% var(--wd-arrow);
}
.openshowcase-player .tooltip--side-right {
  --wd-from: -10px 0;
  transform-origin: 0 var(--wd-arrow);
}

.openshowcase-player .tooltip--visible {
  pointer-events: auto;
  opacity: 1;
  translate: 0 0;
  scale: 1;
  /* enter: the box springs out softly, then its words settle in one after another */
  transition:
    opacity 140ms var(--wd-ease-out, ease-out),
    translate 620ms var(--wd-spring-tip, ease-out),
    scale 620ms var(--wd-spring-tip, ease-out);
}

.openshowcase-player .tip-word {
  display: inline-block;
}
/* The cap keeps a long label from taking its time: past it, words arrive together */
.openshowcase-player .tooltip--visible .tip-word {
  animation: openshowcase-tip-word 360ms var(--wd-ease-out, ease-out) both;
  animation-delay: calc(min(var(--wd-i), 18) * 24ms + 70ms);
}
.openshowcase-player .tooltip--visible .tip-foot {
  animation: openshowcase-tip-word 360ms var(--wd-ease-out, ease-out) 140ms both;
}
@keyframes openshowcase-tip-word {
  from {
    opacity: 0;
    translate: 0 0.35em;
  }
}

/* Only being pressed moves it: it gives under the pointer, and sits closer to the page */
.openshowcase-player .tooltip--visible:active {
  scale: 0.96;
  transition: scale 90ms var(--wd-ease-out, ease-out);
}
.openshowcase-player .tooltip--visible:active .body {
  filter: drop-shadow(0 1px 3px rgb(0 0 0 / 0.18));
  transition-duration: 90ms;
}

.openshowcase-player .tooltip:focus-visible .edge {
  stroke: rgb(255 255 255 / 0.95);
  stroke-width: 3px;
}

/* The body: its color with a touch of light from above, a light hairline along the top, and a
   darker edge, all following box and tail as one outline. The shadow is on the SVG so it
   follows the tail too, and takes the tooltip's color so it sits in the page. */
.openshowcase-player .body {
  position: absolute;
  inset: 0 auto auto 0;
  z-index: -1;
  overflow: visible;
  pointer-events: none;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.12))
    drop-shadow(
      0 14px 18px
        color-mix(in srgb, color-mix(in srgb, var(--wd-tip-bg) 45%, black) 60%, transparent)
    );
  transition: filter 200ms ease;
}
.openshowcase-player .fill-top {
  stop-color: color-mix(in oklab, var(--wd-tip-bg) 94%, white);
}
.openshowcase-player .fill-base {
  stop-color: var(--wd-tip-bg);
}
.openshowcase-player .rim {
  fill: none;
  stroke-width: 2px;
}
.openshowcase-player .edge {
  fill: none;
  stroke: color-mix(in srgb, var(--wd-tip-bg) 60%, black);
  stroke-width: 0.75px;
}

/* The footer: how far into the demo this is, and where clicking leads */
.openshowcase-player .tip-foot {
  display: flex;
  align-items: center;
  gap: calc(var(--wd-u, 14px) * 0.55);
  margin-top: calc(var(--wd-u, 14px) * 0.55);
  padding-top: calc(var(--wd-u, 14px) * 0.5);
  box-shadow: inset 0 0.5px 0 color-mix(in srgb, currentColor 14%, transparent);
}
.openshowcase-player .tip-count {
  flex: none;
  font-size: 0.76em;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  color: color-mix(in srgb, currentColor 62%, transparent);
}
.openshowcase-player .tip-bar {
  flex: 1;
  height: calc(var(--wd-u, 14px) * 0.24);
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 16%, transparent);
}
.openshowcase-player .tip-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: currentColor;
  transition: width 420ms var(--wd-ease-out, ease-out);
}
.openshowcase-player .tip-go {
  flex: none;
  display: grid;
  place-items: center;
  width: calc(var(--wd-u, 14px) * 1.55);
  height: calc(var(--wd-u, 14px) * 1.55);
  border-radius: 50%;
  background: currentColor;
}
.openshowcase-player .tip-go svg {
  display: block;
  width: 56%;
  height: 56%;
  fill: none;
  color: var(--wd-tip-bg);
  stroke: currentColor;
  stroke-width: 2.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (prefers-reduced-motion: reduce) {
  .openshowcase-player .tooltip,
  .openshowcase-player .tooltip--visible {
    translate: 0 0;
    scale: 1;
    transition: opacity 150ms ease;
  }
  .openshowcase-player .tooltip--visible .tip-word,
  .openshowcase-player .tooltip--visible .tip-foot {
    animation: none;
  }
  .openshowcase-player .tip-bar-fill {
    transition: none;
  }
}
`;
