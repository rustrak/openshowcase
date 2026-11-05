import { cx, h, type ViewProps } from "../../dom/h";
import { effect } from "../../dom/signals";
import { injectStyles } from "../../dom/styles";
import { css } from "./Hotspot.styles";

export interface HotspotProps {
  left: number;
  top: number;
  color?: string;
  /** Skip the left/top glide — used for instant repositioning (e.g. on resize). */
  instant?: boolean;
  /** Play the pop-in appear animation (first time this hotspot shows up with no "travel" origin). */
  appear?: boolean;
  /** Hover is shared visually with the Tooltip callout, so it's controlled by the parent
   * rather than tracked internally — hovering either one highlights both. */
  hovered?: boolean;
  onclick?: () => void;
  onhoverchange?: (hovered: boolean) => void;
}

const DEFAULT_COLOR = "#C5F11E";

/*
 * Anatomy (all sized in --wd-u, so it scales with the player):
 * - the button is an invisible ≥44px hit box, centered on the anchor
 * - .ring: a thin breathing ring, open so it doesn't cover what it points at
 * - .pulse: a fainter ring leaving it, once per breath
 * - .core: the small solid center
 */
export function Hotspot(props: ViewProps<HotspotProps>): HTMLButtonElement {
  injectStyles(document, "hotspot", css);
  const element = h(
    "button",
    {
      type: "button",
      "aria-label": "Hotspot",
      class: () =>
        cx(
          "hotspot",
          props.instant?.() && "hotspot--still",
          props.appear?.() && "hotspot--appear",
          props.hovered?.() && "hotspot--hover",
        ),
      onclick: () => props.onclick?.(),
      onmouseenter: () => props.onhoverchange?.(true),
      onmouseleave: () => props.onhoverchange?.(false),
    },
    h(
      "span",
      { class: "dot" },
      h("span", { class: "pulse" }),
      h("span", { class: "ring" }),
      h("span", { class: "core" }),
    ),
  );
  // Properties, not a style attribute: a demo's color can't add declarations
  effect(() => {
    element.style.left = `${props.left()}px`;
    element.style.top = `${props.top()}px`;
    element.style.setProperty(
      "--openshowcase-color",
      props.color?.() ?? DEFAULT_COLOR,
    );
  });
  return element;
}

/** Exit: a quick shrink + fade, eased in — it's leaving, it shouldn't linger. Resolves when done. */
export function vanish(el: Element): Promise<void> {
  const animation = el.animate(
    [
      { opacity: 1, scale: 1 },
      { opacity: 0, scale: 0.8 },
    ],
    // ease-in cubic, same curve as Svelte's `cubicIn`
    {
      duration: 160,
      easing: "cubic-bezier(0.32, 0, 0.67, 0)",
      fill: "forwards",
    },
  );
  return animation.finished.then(() => undefined);
}
