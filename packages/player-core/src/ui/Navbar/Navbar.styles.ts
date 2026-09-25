// Every selector starts with .openshowcase-player, so these styles never reach the host page.
export const css = `
.openshowcase-player .navbar {
  position: absolute;
  inset: auto 0 0 0;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: calc(var(--wd-u, 14px) * 0.5);
  padding: calc(var(--wd-u, 14px) * 2) calc(var(--wd-u, 14px) * 0.75)
    calc(var(--wd-u, 14px) * 0.6);
  background: linear-gradient(to top, rgb(9 9 11 / 0.55), rgb(9 9 11 / 0));
  color: #fff;
  opacity: 0;
  translate: 0 4px;
  pointer-events: none;
  transition:
    opacity 220ms var(--wd-ease-out, ease-out),
    translate 220ms var(--wd-ease-out, ease-out);
}
.openshowcase-player .navbar--visible,
.openshowcase-player .navbar:focus-within {
  opacity: 1;
  translate: 0 0;
  pointer-events: auto;
}

.openshowcase-player .nav-btn {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: calc(var(--wd-u, 14px) * 2);
  height: calc(var(--wd-u, 14px) * 2);
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.14);
  color: #fff;
  cursor: pointer;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  transition:
    background-color 150ms ease,
    scale 150ms ease;
}
.openshowcase-player .nav-btn:hover {
  background: rgb(255 255 255 / 0.26);
}
.openshowcase-player .nav-btn:active {
  scale: 0.92;
}
.openshowcase-player .nav-btn:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.openshowcase-player .nav-btn svg {
  width: 55%;
  height: 55%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.openshowcase-player .segments {
  display: flex;
  flex: 1;
  align-items: center;
  gap: calc(var(--wd-u, 14px) * 0.3);
  min-width: 0;
}

/* A tall invisible hit row around a thin bar that thickens on hover. */
.openshowcase-player .segment {
  flex: 1 1 0;
  min-width: 6px;
  height: calc(var(--wd-u, 14px) * 1.5);
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transition: flex-grow 260ms cubic-bezier(0.6, 0.6, 0, 1);
}
.openshowcase-player .segment--active {
  flex-grow: 3;
}
.openshowcase-player .segment-track {
  position: relative;
  width: 100%;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.32);
  transition: height 200ms cubic-bezier(0.6, 0.6, 0, 1);
}
.openshowcase-player .segment:hover .segment-track,
.openshowcase-player .segment--active .segment-track {
  height: 6px;
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
  background: #fff;
}
.openshowcase-player .segment-fill--done {
  background: rgb(255 255 255 / 0.85);
}

.openshowcase-player .counter {
  flex-shrink: 0;
  font-size: calc(var(--wd-u, 14px) * 0.8);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
}
.openshowcase-player .counter-total {
  color: rgb(255 255 255 / 0.6);
}

@media (prefers-reduced-motion: reduce) {
  .openshowcase-player .navbar {
    translate: 0 0;
  }
}
`;
