// Every selector starts with .openshowcase-player, so these styles never reach the host page.
export const css = `
.openshowcase-player .frame--browser,
.openshowcase-player .frame--browser .frame-window,
.openshowcase-player .frame--bezel .frame-window,
.openshowcase-player .frame-backdrop--on .frame,
.openshowcase-player .frame-backdrop--on .frame-window {
  border-radius: calc(var(--wd-u, 14px) * 0.95);
}
.openshowcase-player .frame--browser {
  box-shadow:
    0 0 0 0.5px rgb(15 23 42 / 0.1),
    0 1px 2px rgb(15 23 42 / 0.06),
    0 8px 20px -6px rgb(15 23 42 / 0.12),
    0 28px 56px -18px rgb(15 23 42 / 0.24);
}
.openshowcase-player--dark .frame--browser {
  box-shadow:
    0 0 0 0.5px rgb(255 255 255 / 0.12),
    0 1px 2px rgb(0 0 0 / 0.4),
    0 28px 56px -18px rgb(0 0 0 / 0.8);
}

.openshowcase-player .frame.frame--bezel {
  padding: calc(var(--wd-u, 14px) * 0.45);
  border-radius: calc(var(--wd-u, 14px) * 1.4);
  background: linear-gradient(180deg, rgb(255 255 255 / 0.75), rgb(255 255 255 / 0.35));
  box-shadow:
    0 0 0 0.5px rgb(15 23 42 / 0.12),
    inset 0 0.5px 0 #fff,
    0 10px 24px -8px rgb(15 23 42 / 0.14),
    0 36px 70px -22px rgb(15 23 42 / 0.32);
}
.openshowcase-player.openshowcase-player--dark .frame--bezel {
  background: linear-gradient(180deg, rgb(255 255 255 / 0.11), rgb(255 255 255 / 0.04));
  box-shadow:
    0 0 0 0.5px rgb(255 255 255 / 0.12),
    inset 0 0.5px 0 rgb(255 255 255 / 0.14),
    0 36px 70px -22px #000;
}
.openshowcase-player .frame--bezel .frame-window {
  box-shadow: 0 0 0 0.5px rgb(15 23 42 / 0.1);
}
.openshowcase-player--dark .frame--bezel .frame-window {
  box-shadow: 0 0 0 0.5px rgb(255 255 255 / 0.12);
}

/* The color only ever reaches color properties (never a whole background shorthand), so a
   demo's value can't make the player load a url(). */
.openshowcase-player .frame-backdrop--on {
  --wd-backdrop-shadow: color-mix(
    in srgb,
    color-mix(in srgb, var(--wd-backdrop) 25%, black) 70%,
    transparent
  );
  padding: calc(var(--wd-backdrop-padding) * 1cqw);
  overflow: hidden;
  border-radius: calc(var(--wd-u, 14px) * 1.3);
  background-color: var(--wd-backdrop);
}
.openshowcase-player .frame-backdrop--soft {
  background-image: linear-gradient(
    155deg,
    color-mix(in srgb, var(--wd-backdrop) 72%, white),
    var(--wd-backdrop) 55%,
    color-mix(in srgb, var(--wd-backdrop) 82%, black)
  );
}
.openshowcase-player .frame-backdrop--glow {
  background-image: radial-gradient(
    90% 75% at 50% 112%,
    color-mix(in srgb, var(--wd-backdrop) 45%, white),
    transparent 72%
  );
}
.openshowcase-player .frame-backdrop--on .frame {
  box-shadow:
    0 0 0 0.5px rgb(15 23 42 / 0.16),
    0 26px 50px -16px var(--wd-backdrop-shadow);
}
/* Glass picks up the backdrop's color, in either appearance */
.openshowcase-player.openshowcase-player .frame-backdrop--on .frame--bezel {
  background: linear-gradient(180deg, rgb(255 255 255 / 0.42), rgb(255 255 255 / 0.16));
  box-shadow:
    0 0 0 0.5px rgb(255 255 255 / 0.35),
    inset 0 0.5px 0 rgb(255 255 255 / 0.6),
    0 26px 50px -16px var(--wd-backdrop-shadow);
}
`;
