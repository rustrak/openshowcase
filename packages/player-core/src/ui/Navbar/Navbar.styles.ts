// Every selector starts with .openshowcase-player, so these styles never reach the host page.
export const css = `
.openshowcase-player .navbar {
  position: absolute;
  inset: auto 0 0 0;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: calc(var(--wd-u, 14px) * 0.7);
  padding: calc(var(--wd-u, 14px) * 3.4) calc(var(--wd-u, 14px) * 1.1)
    calc(var(--wd-u, 14px) * 0.45);
  /* No box around the controls: this is what keeps them legible over whatever was recorded,
     dark or light, text included. */
  background: linear-gradient(
    to top,
    rgb(9 9 11 / 0.9),
    rgb(9 9 11 / 0.72) 40%,
    rgb(9 9 11 / 0)
  );
  color: #fff;
  opacity: 0;
  translate: 0 4px;
  pointer-events: none;
  /* leaving: unhurried, so it fades rather than blinks out */
  transition:
    opacity 360ms cubic-bezier(0.4, 0, 0.2, 1),
    translate 360ms cubic-bezier(0.4, 0, 0.2, 1);
}
/* :has(:focus-visible), not :focus-within: a clicked segment keeps the focus, and the bar
   would stay up after the pointer has left. */
.openshowcase-player .navbar--visible,
.openshowcase-player .navbar:has(:focus-visible) {
  opacity: 1;
  translate: 0 0;
  pointer-events: auto;
  /* arriving: quick, it answers the pointer */
  transition:
    opacity 180ms var(--wd-ease-out, ease-out),
    translate 180ms var(--wd-ease-out, ease-out);
}

.openshowcase-player .clip {
  flex: none;
  display: flex;
  align-items: center;
  gap: calc(var(--wd-u, 14px) * 0.45);
}
.openshowcase-player .clip-toggle {
  flex: none;
  display: grid;
  place-items: center;
  width: calc(var(--wd-u, 14px) * 2);
  height: calc(var(--wd-u, 14px) * 2);
  margin-left: calc(var(--wd-u, 14px) * -0.45);
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: none;
  color: #fff;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    scale 150ms ease;
}
.openshowcase-player .clip-toggle:hover {
  background: rgb(255 255 255 / 0.16);
}
.openshowcase-player .clip-toggle:active {
  scale: 0.9;
}
.openshowcase-player .clip-toggle:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 1px;
}
.openshowcase-player .clip-toggle svg {
  display: block;
  width: 55%;
  height: 55%;
  fill: currentColor;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.35));
}
.openshowcase-player .clip-time {
  white-space: nowrap;
}

.openshowcase-player .segments {
  display: flex;
  flex: 1;
  align-items: center;
  gap: calc(var(--wd-u, 14px) * 0.2);
  min-width: 0;
}

/* A tall invisible hit row around a bar that thickens on hover. The current step gets more of
   the width, and its color: it's what the viewer is following. */
.openshowcase-player .segment {
  position: relative;
  flex: 1 1 0;
  min-width: 2px;
  height: calc(var(--wd-u, 14px) * 2);
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transition: flex-grow 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.openshowcase-player .segment--active {
  flex-grow: 3;
}
.openshowcase-player .segment-track {
  position: relative;
  width: 100%;
  height: max(3px, calc(var(--wd-u, 14px) * 0.32));
  overflow: hidden;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.3);
  transition:
    height 180ms cubic-bezier(0.2, 0, 0, 1),
    background-color 180ms ease;
}
.openshowcase-player .segment--active .segment-track {
  height: max(4px, calc(var(--wd-u, 14px) * 0.46));
  background: color-mix(in srgb, var(--wd-accent, #fff) 34%, transparent);
}
.openshowcase-player .segment:hover .segment-track {
  height: max(6px, calc(var(--wd-u, 14px) * 0.6));
}
.openshowcase-player .segment:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
  border-radius: 4px;
}
.openshowcase-player .segment-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  border-radius: inherit;
  background-color: var(--wd-accent, #fff);
  /* fills and empties on a step change instead of snapping */
  transition:
    width 260ms cubic-bezier(0.2, 0, 0, 1),
    background-color 200ms ease;
}
/* The playing clip's fill is updated every frame: a short linear glide just smooths it. */
.openshowcase-player .segment--active .segment-fill {
  transition:
    width 120ms linear,
    background-color 200ms ease;
}
.openshowcase-player .segment-fill--done {
  background: rgb(255 255 255 / 0.9);
}

/* Which step a segment is, shown above it on hover. */
.openshowcase-player .segment::after {
  content: attr(data-label);
  position: absolute;
  bottom: 100%;
  left: 50%;
  translate: -50% 4px;
  padding: calc(var(--wd-u, 14px) * 0.2) calc(var(--wd-u, 14px) * 0.45);
  border-radius: 6px;
  background: rgb(9 9 11 / 0.85);
  color: #fff;
  font-size: calc(var(--wd-u, 14px) * 0.7);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 140ms ease,
    translate 140ms var(--wd-ease-out, ease-out);
}
.openshowcase-player .segment:hover::after {
  opacity: 1;
  translate: -50% 0;
}

.openshowcase-player .clip-time,
.openshowcase-player .counter {
  font-size: calc(var(--wd-u, 14px) * 0.8);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.45);
}
.openshowcase-player .counter {
  flex-shrink: 0;
}
.openshowcase-player .counter-total {
  color: rgb(255 255 255 / 0.65);
}

@media (prefers-reduced-motion: reduce) {
  .openshowcase-player .navbar {
    translate: 0 0;
  }
  .openshowcase-player .segment,
  .openshowcase-player .segment-track,
  .openshowcase-player .segment-fill,
  .openshowcase-player .segment::after,
  .openshowcase-player .clip-toggle {
    transition: none;
  }
  .openshowcase-player .segment::after {
    translate: -50% 0;
  }
}
`;
