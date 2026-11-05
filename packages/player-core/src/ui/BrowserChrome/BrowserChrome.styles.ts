// Every selector starts with .openshowcase-player, so these styles never reach the host page.
export const css = `
.openshowcase-player .browser-chrome {
  flex: none;
  display: grid;
  grid-template-columns: 1fr minmax(0, auto) 1fr;
  align-items: center;
  column-gap: calc(var(--wd-u, 14px) * 0.7);
  height: calc(var(--wd-u, 14px) * 2.6);
  padding: 0 calc(var(--wd-u, 14px) * 0.95);
  background: linear-gradient(180deg, #fdfdfe, #f4f4f6);
  box-shadow:
    inset 0 0.5px 0 #fff,
    inset 0 -0.5px 0 rgb(15 23 42 / 0.12);
}
.openshowcase-player--dark .browser-chrome {
  background: linear-gradient(180deg, #2c2c31, #252529);
  box-shadow:
    inset 0 0.5px 0 rgb(255 255 255 / 0.09),
    inset 0 -0.5px 0 rgb(0 0 0 / 0.6);
}
.openshowcase-player .browser-chrome__lights {
  display: flex;
  gap: calc(var(--wd-u, 14px) * 0.46);
}
.openshowcase-player .browser-chrome__light {
  width: calc(var(--wd-u, 14px) * 0.78);
  height: calc(var(--wd-u, 14px) * 0.78);
  border-radius: 50%;
  box-shadow: inset 0 0 0 0.5px rgb(0 0 0 / 0.14);
}
.openshowcase-player .browser-chrome__light:nth-child(1) { background: #ff5f57; }
.openshowcase-player .browser-chrome__light:nth-child(2) { background: #febc2e; }
.openshowcase-player .browser-chrome__light:nth-child(3) { background: #28c840; }
.openshowcase-player .browser-chrome__address {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--wd-u, 14px) * 0.38);
  min-width: 0;
  width: min(50cqw, 400px);
  max-width: 100%;
  padding: calc(var(--wd-u, 14px) * 0.3) calc(var(--wd-u, 14px) * 0.7);
  border-radius: calc(var(--wd-u, 14px) * 0.5);
  background: #fff;
  box-shadow:
    0 0 0 0.5px rgb(15 23 42 / 0.13),
    0 0.5px 1px rgb(15 23 42 / 0.07);
  color: #52525c;
  font-size: calc(var(--wd-u, 14px) * 0.9);
  font-weight: 500;
  line-height: 1.2;
}
.openshowcase-player--dark .browser-chrome__address {
  background: rgb(255 255 255 / 0.07);
  box-shadow: inset 0 0 0 0.5px rgb(255 255 255 / 0.09);
  color: #c4c4cc;
}
.openshowcase-player .browser-chrome__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.openshowcase-player .browser-chrome__icon {
  flex: none;
  display: block;
  width: calc(var(--wd-u, 14px) * 0.88);
  height: calc(var(--wd-u, 14px) * 0.88);
  color: #8a8a94;
}
.openshowcase-player--dark .browser-chrome__icon {
  color: #80808a;
}
.openshowcase-player .browser-chrome__reload {
  justify-self: end;
  display: grid;
  place-items: center;
  padding: calc(var(--wd-u, 14px) * 0.3);
  margin-right: calc(var(--wd-u, 14px) * -0.3);
  border: 0;
  border-radius: calc(var(--wd-u, 14px) * 0.4);
  background: transparent;
  cursor: pointer;
}
.openshowcase-player .browser-chrome__reload:hover {
  background: rgb(15 23 42 / 0.07);
}
.openshowcase-player--dark .browser-chrome__reload:hover {
  background: rgb(255 255 255 / 0.1);
}

/* Inside the bezel the glass already frames the window: a quieter bar with a pill address */
.openshowcase-player .frame--bezel .browser-chrome {
  background: #fafafb;
  box-shadow: inset 0 -0.5px 0 rgb(15 23 42 / 0.1);
}
.openshowcase-player.openshowcase-player--dark .frame--bezel .browser-chrome {
  background: #232327;
  box-shadow: inset 0 -0.5px 0 rgb(255 255 255 / 0.08);
}
.openshowcase-player .frame--bezel .browser-chrome__address {
  border-radius: 99px;
  background: rgb(15 23 42 / 0.05);
  box-shadow: none;
}
.openshowcase-player.openshowcase-player--dark .frame--bezel .browser-chrome__address {
  background: rgb(255 255 255 / 0.07);
}
`;
