// Every selector starts with .openshowcase-player, so these styles never reach the host page.
export const css = `
.openshowcase-player .hotspot {
  position: absolute;
  z-index: 3;
  width: max(44px, calc(var(--wd-u, 14px) * 3));
  height: max(44px, calc(var(--wd-u, 14px) * 3));
  translate: -50% -50%;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  /* travelling between steps: a spring glide, so it reads like a cursor moving over */
  transition:
    left 700ms var(--wd-spring-glide, ease-out),
    top 700ms var(--wd-spring-glide, ease-out);
}
.openshowcase-player .hotspot--still {
  transition: none;
}

.openshowcase-player .dot {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  transition: scale 420ms var(--wd-spring-pop, ease-out);
}
.openshowcase-player .hotspot--appear .dot {
  animation: openshowcase-hotspot-pop 480ms var(--wd-spring-pop, ease-out) both;
}
.openshowcase-player .hotspot--hover .dot {
  scale: 1.15;
}
.openshowcase-player .hotspot:active .dot {
  scale: 0.85;
  transition-duration: 120ms;
}

.openshowcase-player .pulse,
.openshowcase-player .ring,
.openshowcase-player .core {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

/* The dark hairlines keep it legible on light and dark screenshots alike */
.openshowcase-player .ring {
  width: calc(var(--wd-u, 14px) * 1.9);
  height: calc(var(--wd-u, 14px) * 1.9);
  border: 2px solid var(--openshowcase-color);
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.25),
    inset 0 0 0 1px rgb(0 0 0 / 0.18);
  animation: openshowcase-hotspot-ring 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
.openshowcase-player .pulse {
  width: calc(var(--wd-u, 14px) * 1.9);
  height: calc(var(--wd-u, 14px) * 1.9);
  border: 1.5px solid var(--openshowcase-color);
  opacity: 0;
  animation: openshowcase-hotspot-pulse 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.openshowcase-player .core {
  width: calc(var(--wd-u, 14px) * 0.62);
  height: calc(var(--wd-u, 14px) * 0.62);
  background-color: var(--openshowcase-color);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.22);
  transition: scale 160ms ease;
}
.openshowcase-player .hotspot:active .core {
  scale: 0.7;
}
.openshowcase-player .hotspot--hover .ring {
  animation-play-state: paused;
}
.openshowcase-player .hotspot--hover .pulse {
  animation: none;
}

.openshowcase-player .hotspot:focus-visible .ring {
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.25),
    0 0 0 4px color-mix(in srgb, var(--openshowcase-color) 55%, transparent);
}

@keyframes openshowcase-hotspot-pop {
  from {
    scale: 0.4;
    opacity: 0;
  }
  to {
    scale: 1;
    opacity: 1;
  }
}
@keyframes openshowcase-hotspot-ring {
  50% {
    scale: 0.86;
  }
}
@keyframes openshowcase-hotspot-pulse {
  0%,
  20% {
    scale: 1;
    opacity: 0.7;
  }
  100% {
    scale: 2;
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .openshowcase-player .hotspot,
  .openshowcase-player .dot,
  .openshowcase-player .core {
    transition: none;
  }
  .openshowcase-player .hotspot--appear .dot,
  .openshowcase-player .ring,
  .openshowcase-player .pulse {
    animation: none;
  }
}
`;
