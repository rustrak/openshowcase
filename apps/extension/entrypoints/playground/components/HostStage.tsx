import { InteractiveDemo } from "@rustrak/openshowcase-player-react";
import { useRef } from "react";
import { useElementSize } from "@/hooks/use-element-size";
import { fitStage } from "../../editor/core/stage-fit";
import { BROWSER_CHROME_HEIGHT } from "../../editor/lib/player-appearance";

/** Background of the simulated site the demo is embedded in (demo content, not editor UI). */
export const HOST_BACKGROUNDS = { light: "#ffffff", dark: "#0d1117" } as const;
export type HostBackground = keyof typeof HOST_BACKGROUNDS;

const PAGE_PADDING = 24;

/**
 * The bundle played by the real player, loaded from its file like a site would load it
 * (one streaming request), as large as the stage fits, inside a page of the chosen background.
 */
export function HostStage({
  url,
  aspectRatio,
  browserChrome,
  background,
  run,
}: {
  url: string;
  /** Of the demo's media (its frame excluded). */
  aspectRatio: number;
  browserChrome: boolean;
  background: HostBackground;
  /** Bumped to replay the demo from scratch. */
  run: number;
}) {
  const wellRef = useRef<HTMLDivElement>(null);
  const well = useElementSize(wellRef);
  // As big as the stage allows, in both directions, around the page's padding
  const margin = 2 * PAGE_PADDING + 48;
  const { width } = fitStage(
    { width: well.width - margin, height: well.height - margin },
    aspectRatio,
    browserChrome ? BROWSER_CHROME_HEIGHT : 0,
  );

  return (
    <div
      ref={wellRef}
      className="flex min-h-0 flex-1 overflow-auto rounded-xl bg-stage shadow-card animate-in fade-in-0 duration-300"
    >
      {width > 0 && (
        <div
          className="m-auto rounded-xl shadow-float transition-[background-color] duration-300 ease-(--ease-out-strong)"
          style={{
            width: width + 2 * PAGE_PADDING,
            padding: PAGE_PADDING,
            background: HOST_BACKGROUNDS[background],
          }}
        >
          <InteractiveDemo key={`${url}#${run}`} src={url} />
        </div>
      )}
    </div>
  );
}
