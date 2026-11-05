import {
  type Backdrop,
  defaultBackdrop,
  type Theme,
} from "@rustrak/openshowcase-schema";
import type { CSSProperties } from "react";
import type { FrameSize } from "../core/stage-fit";

/**
 * The fixed wrapper colors `@rustrak/openshowcase-player-core` paints for each
 * `theme.appearance`. The stage mirrors them so what you edit looks exactly like the
 * exported player — these are the demo's colors, not the editor UI theme, which is why
 * they're literal values instead of theme tokens.
 */
export const PLAYER_APPEARANCE = {
  light: {
    frame: "#fff",
    chromeBg: "linear-gradient(180deg, #fdfdfe, #f4f4f6)",
    chromeEdge: "inset 0 0.5px 0 #fff, inset 0 -0.5px 0 rgb(15 23 42 / 0.12)",
    bezelChromeBg: "#fafafb",
    bezelChromeEdge: "inset 0 -0.5px 0 rgb(15 23 42 / 0.1)",
    titleBg: "#fff",
    titleEdge:
      "0 0 0 0.5px rgb(15 23 42 / 0.13), 0 0.5px 1px rgb(15 23 42 / 0.07)",
    bezelTitleBg: "rgb(15 23 42 / 0.05)",
    titleText: "#52525c",
    icon: "#8a8a94",
    stage: "#fafafa",
    ring: "rgb(15 23 42 / 0.1)",
    shadow:
      "0 0 0 0.5px rgb(15 23 42 / 0.1), 0 1px 2px rgb(15 23 42 / 0.06), 0 8px 20px -6px rgb(15 23 42 / 0.12), 0 28px 56px -18px rgb(15 23 42 / 0.24)",
    glass:
      "linear-gradient(180deg, rgb(255 255 255 / 0.75), rgb(255 255 255 / 0.35))",
    glassShadow:
      "0 0 0 0.5px rgb(15 23 42 / 0.12), inset 0 0.5px 0 #fff, 0 10px 24px -8px rgb(15 23 42 / 0.14), 0 36px 70px -22px rgb(15 23 42 / 0.32)",
  },
  dark: {
    frame: "#18181b",
    chromeBg: "linear-gradient(180deg, #2c2c31, #252529)",
    chromeEdge:
      "inset 0 0.5px 0 rgb(255 255 255 / 0.09), inset 0 -0.5px 0 rgb(0 0 0 / 0.6)",
    bezelChromeBg: "#232327",
    bezelChromeEdge: "inset 0 -0.5px 0 rgb(255 255 255 / 0.08)",
    titleBg: "rgb(255 255 255 / 0.07)",
    titleEdge: "inset 0 0 0 0.5px rgb(255 255 255 / 0.09)",
    bezelTitleBg: "rgb(255 255 255 / 0.07)",
    titleText: "#c4c4cc",
    icon: "#80808a",
    stage: "#0f0f10",
    ring: "rgb(255 255 255 / 0.12)",
    shadow:
      "0 0 0 0.5px rgb(255 255 255 / 0.12), 0 1px 2px rgb(0 0 0 / 0.4), 0 28px 56px -18px rgb(0 0 0 / 0.8)",
    glass:
      "linear-gradient(180deg, rgb(255 255 255 / 0.11), rgb(255 255 255 / 0.04))",
    glassShadow:
      "0 0 0 0.5px rgb(255 255 255 / 0.12), inset 0 0.5px 0 rgb(255 255 255 / 0.14), 0 36px 70px -22px #000",
  },
} as const;

export const TRAFFIC_LIGHTS = ["#ff5f57", "#febc2e", "#28c840"] as const;

/**
 * The player scales its bar and bezel with its width (`--wd-u`); these are their sizes at
 * about 770px wide, close enough for the editor's stage and for fitting the player in one.
 */
export const BROWSER_CHROME_HEIGHT = 36;
const BEZEL_INSET = 6;
const WINDOW_RADIUS = 13;

type FrameTheme = Pick<Theme, "wrapper" | "backdrop">;

/** What the theme's frame adds around the media, for `fitStage`. */
export function frameSize({ wrapper, backdrop }: FrameTheme): FrameSize {
  return {
    chrome: wrapper === "none" ? 0 : BROWSER_CHROME_HEIGHT,
    inset: wrapper === "bezel" ? BEZEL_INSET : 0,
    pad: backdrop ? (backdrop.padding ?? defaultBackdrop.padding) / 100 : 0,
  };
}

/** The CSS background of a backdrop, same as the player's `.frame-backdrop` classes. */
export function backdropBackground({ color, fill }: Backdrop): string {
  if (fill === "soft")
    return `linear-gradient(155deg, color-mix(in srgb, ${color} 72%, white), ${color} 55%, color-mix(in srgb, ${color} 82%, black))`;
  if (fill === "glow")
    return `radial-gradient(90% 75% at 50% 112%, color-mix(in srgb, ${color} 45%, white), transparent 72%), ${color}`;
  return color;
}

/** Styles of the frame's three boxes, mirroring player-core's `Player.styles.ts`. */
export function frameStyles(
  theme: Theme,
  outerWidth: number,
): { backdrop: CSSProperties; frame: CSSProperties; window: CSSProperties } {
  const { wrapper, backdrop, appearance } = theme;
  const colors = PLAYER_APPEARANCE[appearance];
  const shadowOnBackdrop =
    backdrop &&
    `0 26px 50px -16px color-mix(in srgb, color-mix(in srgb, ${backdrop.color} 25%, black) 70%, transparent)`;
  const rounded = wrapper !== "none" || backdrop != null;

  return {
    backdrop: backdrop
      ? {
          padding:
            ((backdrop.padding ?? defaultBackdrop.padding) / 100) * outerWidth,
          borderRadius: 18,
          overflow: "hidden",
          background: backdropBackground(backdrop),
        }
      : {},
    frame:
      wrapper === "bezel"
        ? {
            padding: BEZEL_INSET,
            borderRadius: 20,
            background: backdrop
              ? "linear-gradient(180deg, rgb(255 255 255 / 0.42), rgb(255 255 255 / 0.16))"
              : colors.glass,
            boxShadow: backdrop
              ? `0 0 0 0.5px rgb(255 255 255 / 0.35), inset 0 0.5px 0 rgb(255 255 255 / 0.6), ${shadowOnBackdrop}`
              : colors.glassShadow,
          }
        : {
            borderRadius: rounded ? WINDOW_RADIUS : 0,
            boxShadow: backdrop
              ? `0 0 0 0.5px rgb(15 23 42 / 0.16), ${shadowOnBackdrop}`
              : colors.shadow,
          },
    window: {
      overflow: "hidden",
      borderRadius: rounded ? WINDOW_RADIUS : 0,
      background: colors.frame,
      boxShadow: wrapper === "bezel" ? `0 0 0 0.5px ${colors.ring}` : undefined,
    },
  };
}
