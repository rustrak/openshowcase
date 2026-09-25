import { cx, h, type ViewProps } from "../../dom/h";
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
 * - .halo: a soft static disc of the brand color
 * - .ripple ×2: sonar rings, offset by half a period
 * - .core: the solid dot — white inner ring + dark hairline outline, so it reads on light
 *   and dark screenshots alike, with a slight top-light gradient and lift
 */
export function Hotspot(props: ViewProps<HotspotProps>): HTMLButtonElement {
  injectStyles(document, "hotspot", css);
  return h(
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
      style: () =>
        `left: ${props.left()}px; top: ${props.top()}px; --openshowcase-color: ${props.color?.() ?? DEFAULT_COLOR};`,
      onclick: () => props.onclick?.(),
      onmouseenter: () => props.onhoverchange?.(true),
      onmouseleave: () => props.onhoverchange?.(false),
    },
    h(
      "span",
      { class: "dot" },
      h("span", { class: "halo" }),
      h("span", { class: "ripple" }),
      h("span", { class: "ripple ripple--late" }),
      h("span", { class: "core" }),
    ),
  );
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
