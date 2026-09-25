// Every selector starts with .openshowcase-player, so these styles never reach the host page.
export const css = `
.openshowcase-player .tooltip {
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
.openshowcase-player .tooltip--side-top {
  --wd-from: 0 6px;
  transform-origin: var(--wd-arrow) 100%;
}
.openshowcase-player .tooltip--side-bottom {
  --wd-from: 0 -6px;
  transform-origin: var(--wd-arrow) 0;
}
.openshowcase-player .tooltip--side-left {
  --wd-from: 6px 0;
  transform-origin: 100% var(--wd-arrow);
}
.openshowcase-player .tooltip--side-right {
  --wd-from: -6px 0;
  transform-origin: 0 var(--wd-arrow);
}

.openshowcase-player .tooltip--visible {
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

.openshowcase-player .tooltip--hover {
  scale: 1.02;
}

.openshowcase-player .tooltip:focus-visible .edge {
  stroke: rgb(255 255 255 / 0.95);
  stroke-width: 3px;
}

/* The body: fill (a subtle top-lit gradient of the brand color) + a specular sheen + an
   inner rim (light along the top, a faint shade at the bottom, clipped inside the shape so
   it reads as a bevel) + a 1px dark edge — all following box and tail as one outline. The
   layered drop-shadow is on the SVG so it follows the tail too. */
.openshowcase-player .body {
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
.openshowcase-player .tooltip--hover .body {
  filter: drop-shadow(0 1px 1px rgb(17 24 39 / 0.12))
    drop-shadow(0 6px 12px rgb(17 24 39 / 0.14))
    drop-shadow(0 18px 36px rgb(17 24 39 / 0.18));
}
.openshowcase-player .rim {
  fill: none;
  stroke-width: 2px;
}
.openshowcase-player .edge {
  fill: none;
  stroke: rgb(0 0 0 / 0.16);
  stroke-width: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .openshowcase-player .tooltip,
.openshowcase-player .tooltip--visible {
    translate: 0 0;
    scale: 1;
    transition: opacity 150ms ease;
  }
}
`;
