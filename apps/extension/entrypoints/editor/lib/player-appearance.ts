/**
 * The fixed wrapper colors `@rustrak/openshowcase-player-core` paints for each
 * `theme.appearance`. The stage mirrors them so what you edit looks exactly like the
 * exported player — these are the demo's colors, not the editor UI theme, which is why
 * they're literal values instead of theme tokens.
 */
export const PLAYER_APPEARANCE = {
  light: {
    frame: "#fff",
    chromeBg: "#f4f4f5",
    chromeBorder: "#e4e4e7",
    dot: "#d4d4d8",
    titleBg: "#e9e9eb",
    titleText: "#71717a",
    stage: "#fafafa",
  },
  dark: {
    frame: "#18181b",
    chromeBg: "#27272a",
    chromeBorder: "#3f3f46",
    dot: "#52525b",
    titleBg: "#3f3f46",
    titleText: "#a1a1aa",
    stage: "#0f0f10",
  },
} as const;

/** Height of the browser-chrome bar, same as the player's. */
export const BROWSER_CHROME_HEIGHT = 36;
