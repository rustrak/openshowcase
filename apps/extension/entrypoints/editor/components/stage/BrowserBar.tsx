import type { Theme } from "@rustrak/openshowcase-schema";
import { Lock, RotateCw } from "lucide-react";
import {
  BROWSER_CHROME_HEIGHT,
  PLAYER_APPEARANCE,
  TRAFFIC_LIGHTS,
} from "../../lib/player-appearance";

/** The stage's copy of player-core's `BrowserChrome`. Keep them in sync. */
export function BrowserBar({
  theme,
  title,
  outerWidth,
}: {
  theme: Theme;
  title: string;
  /** Of the whole player: the address bar takes half of it, like the player's. */
  outerWidth: number;
}) {
  const colors = PLAYER_APPEARANCE[theme.appearance];
  const bezel = theme.wrapper === "bezel";
  return (
    <div
      className="grid grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-x-2.5 px-3.5"
      style={{
        height: BROWSER_CHROME_HEIGHT,
        background: bezel ? colors.bezelChromeBg : colors.chromeBg,
        boxShadow: bezel ? colors.bezelChromeEdge : colors.chromeEdge,
      }}
    >
      <div className="flex gap-1.5">
        {TRAFFIC_LIGHTS.map((light) => (
          <span
            key={light}
            className="size-[11px] rounded-full shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.14)]"
            style={{ background: light }}
          />
        ))}
      </div>
      <div
        className="flex min-w-0 max-w-full items-center justify-center gap-1.5 px-2.5 py-1 text-[12.5px] leading-tight font-medium"
        style={{
          width: Math.min(outerWidth / 2, 400),
          borderRadius: bezel ? 99 : 7,
          background: bezel ? colors.bezelTitleBg : colors.titleBg,
          boxShadow: bezel ? undefined : colors.titleEdge,
          color: colors.titleText,
        }}
      >
        <Lock className="size-3 shrink-0" style={{ color: colors.icon }} />
        <span className="truncate">{title}</span>
      </div>
      <RotateCw
        className="size-3 justify-self-end"
        style={{ color: colors.icon }}
      />
    </div>
  );
}
