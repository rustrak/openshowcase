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

.openshowcase-player .halo,
.openshowcase-player .ripple,
.openshowcase-player .core {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.openshowcase-player .halo {
  width: calc(var(--wd-u, 14px) * 2);
  height: calc(var(--wd-u, 14px) * 2);
  background: color-mix(in srgb, var(--openshowcase-color) 22%, transparent);
  transition:
    background-color 250ms ease,
    scale 420ms var(--wd-spring-pop, ease-out);
}
.openshowcase-player .hotspot--hover .halo {
  background: color-mix(in srgb, var(--openshowcase-color) 32%, transparent);
  scale: 1.1;
}

.openshowcase-player .ripple {
  width: calc(var(--wd-u, 14px) * 2.25);
  height: calc(var(--wd-u, 14px) * 2.25);
  border: 1.5px solid color-mix(in srgb, var(--openshowcase-color) 70%, transparent);
  background: radial-gradient(
    circle,
    transparent 40%,
    color-mix(in srgb, var(--openshowcase-color) 30%, transparent) 100%
  );
  opacity: 0;
  animation: openshowcase-hotspot-ripple 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.openshowcase-player .ripple--late {
  animation-delay: 0.9s;
}
.openshowcase-player .hotspot--hover .ripple {
  animation-play-state: paused;
  opacity: 0;
  transition: opacity 150ms ease;
}

.openshowcase-player .core {
  width: calc(var(--wd-u, 14px) * 1.125);
  height: calc(var(--wd-u, 14px) * 1.125);
  /* same relief language as the tooltip: a small specular glint top-left over a
     top-lit gradient */
  background:
    radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.55), transparent 42%),
    linear-gradient(
      180deg,
      color-mix(in oklab, var(--openshowcase-color) 85%, white),
      var(--openshowcase-color) 55%,
      color-mix(in oklab, var(--openshowcase-color) 90%, black)
    );
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 3px rgb(0 0 0 / 0.22),
    0 2px 6px rgb(0 0 0 / 0.28);
  animation: openshowcase-hotspot-breathe 1.8s ease-in-out infinite;
}
.openshowcase-player .hotspot--hover .core {
  animation-play-state: paused;
}

.openshowcase-player .hotspot:focus-visible .core {
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 3px rgb(0 0 0 / 0.22),
    0 0 0 6px color-mix(in srgb, var(--openshowcase-color) 55%, transparent),
    0 2px 6px rgb(0 0 0 / 0.28);
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
@keyframes openshowcase-hotspot-ripple {
  0% {
    scale: 0.5;
    opacity: 0;
  }
  15% {
    opacity: 0.6;
  }
  100% {
    scale: 1.7;
    opacity: 0;
  }
}
@keyframes openshowcase-hotspot-breathe {
  0%,
  100% {
    scale: 1;
  }
  50% {
    scale: 0.88;
  }
}

@media (prefers-reduced-motion: reduce) {
  .openshowcase-player .hotspot,
.openshowcase-player .dot,
.openshowcase-player .halo {
    transition: none;
  }
  .openshowcase-player .hotspot--appear .dot,
.openshowcase-player .core {
    animation: none;
  }
  .openshowcase-player .ripple {
    animation: none;
    opacity: 0;
  }
  .openshowcase-player .halo {
    background: color-mix(in srgb, var(--openshowcase-color) 35%, transparent);
  }
}
`;
