import { h, svg, type ViewProps } from "../../dom/h";
import { injectStyles } from "../../dom/styles";
import { css } from "./BrowserChrome.styles";

export interface BrowserChromeProps {
  title: string;
  onReload?: () => void;
}

const icon = (...paths: SVGElement[]) =>
  svg(
    "svg",
    {
      class: "browser-chrome__icon",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2.2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": true,
    },
    paths,
  );

export function BrowserChrome(
  props: ViewProps<BrowserChromeProps>,
): HTMLDivElement {
  injectStyles(document, "browser-chrome", css);
  return h(
    "div",
    { class: "browser-chrome" },
    h(
      "div",
      { class: "browser-chrome__lights" },
      [0, 1, 2].map(() => h("span", { class: "browser-chrome__light" })),
    ),
    h(
      "div",
      { class: "browser-chrome__address" },
      icon(
        svg("rect", {
          x: "4.5",
          y: "11",
          width: "15",
          height: "10",
          rx: "2.2",
        }),
        svg("path", { d: "M8 11V7.5a4 4 0 0 1 8 0V11" }),
      ),
      h("span", { class: "browser-chrome__title" }, () => props.title()),
    ),
    h(
      "button",
      {
        type: "button",
        title: "Back to start",
        class: "browser-chrome__reload",
        onclick: () => props.onReload?.(),
      },
      icon(svg("path", { d: "M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" })),
    ),
  );
}
