// Every selector starts with .openshowcase-player, so these styles never reach the host page.
export const css = `
.openshowcase-player img.media {
  pointer-events: none;
  will-change: transform;
}
/* the incoming frame stays transparent until decoded, then fades over the previous one */
.openshowcase-player .media--fading {
  animation: openshowcase-media-in 220ms cubic-bezier(0.4, 0, 0.2, 1) both;
}
.openshowcase-player .media--entering {
  opacity: 0;
  animation: none;
}
@keyframes openshowcase-media-in {
  from {
    opacity: 0;
  }
}

/* Dim the frame except a soft pool of light around the hotspot. The falloff is spread
   over many stops (roughly a smoothstep) so there's no visible edge — it reads like light,
   not like a hole cut in a gray sheet. --wd-spot-k (registered in app.css) scales the pool
   during the in/out transitions. */
.openshowcase-player .spotlight {
  /* enter: the room dims while the light gathers onto the hotspot */
  animation: openshowcase-light-in 900ms cubic-bezier(0.33, 1, 0.68, 1) both;
  --wd-spot-r: calc(var(--wd-u, 14px) * 1.5 * var(--wd-spot-k, 1));
  background: radial-gradient(
    circle at var(--wd-spot-x) var(--wd-spot-y),
    rgb(12 14 20 / 0) calc(var(--wd-spot-r) * 1),
    rgb(12 14 20 / 0.015) calc(var(--wd-spot-r) * 1.5),
    rgb(12 14 20 / 0.05) calc(var(--wd-spot-r) * 2.2),
    rgb(12 14 20 / 0.1) calc(var(--wd-spot-r) * 3.2),
    rgb(12 14 20 / 0.16) calc(var(--wd-spot-r) * 4.6),
    rgb(12 14 20 / 0.21) calc(var(--wd-spot-r) * 6.5),
    rgb(12 14 20 / 0.24) calc(var(--wd-spot-r) * 9)
  );
}

/* leave: the light lifts and spreads as it fades — in place, no sliding */
.openshowcase-player .spotlight--leaving {
  animation: openshowcase-light-out 500ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
}
@keyframes openshowcase-light-in {
  from {
    opacity: 0;
    --wd-spot-k: 1.6;
  }
}
@keyframes openshowcase-light-out {
  from {
    opacity: 1;
    --wd-spot-k: 1;
  }
  to {
    opacity: 0;
    --wd-spot-k: 1.35;
  }
}

.openshowcase-player .burst {
  position: absolute;
  z-index: 3;
  width: calc(var(--wd-u, 14px) * 2);
  height: calc(var(--wd-u, 14px) * 2);
  translate: -50% -50%;
  border-radius: 50%;
  border: 2px solid var(--openshowcase-color);
  pointer-events: none;
  animation: openshowcase-hotspot-burst 450ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
}
@keyframes openshowcase-hotspot-burst {
  from {
    scale: 0.4;
    opacity: 0.7;
  }
  to {
    scale: 2.4;
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .openshowcase-player .burst {
    display: none;
  }
  .openshowcase-player .spotlight {
    --wd-spot-k: 1 !important;
  }
}
`;
