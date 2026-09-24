import { InteractiveDemo } from "@rustrak/openshowcase-player-react";
import type { Demo } from "@rustrak/openshowcase-schema";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { useElementSize } from "@/hooks/use-element-size";
import { fitStage } from "../core/stage-fit";
import { BROWSER_CHROME_HEIGHT } from "../lib/player-appearance";
import { Hint } from "./controls";

/** Preview mode: the real player, exactly as it will ship, centered on the stage. */
export function PreviewStage({
  demo,
  aspectRatio,
  onExit,
}: {
  demo: Demo;
  aspectRatio: number;
  onExit: () => void;
}) {
  const wellRef = useRef<HTMLDivElement>(null);
  const well = useElementSize(wellRef);
  const [run, setRun] = useState(0);
  const { width } = fitStage(
    {
      width: Math.max(0, well.width - 96),
      height: Math.max(0, well.height - 124),
    },
    aspectRatio,
    demo.theme.wrapper === "browser" ? BROWSER_CHROME_HEIGHT : 0,
  );

  return (
    <div
      ref={wellRef}
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-stage pb-[60px] shadow-card animate-in fade-in-0 duration-300"
    >
      {width > 0 && (
        <InteractiveDemo
          key={run}
          demo={demo}
          aspectRatio={aspectRatio}
          style={{ width }}
        />
      )}
      <div className="absolute inset-x-0 bottom-4 flex justify-center">
        <div className="flex h-11 items-center gap-1 rounded-xl bg-popover p-1 shadow-float">
          <Hint label="Back to editing" shortcut="esc">
            <button
              type="button"
              onClick={onExit}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:translate-y-px [&_svg]:size-4"
            >
              <ArrowLeft /> Edit
            </button>
          </Hint>
          <span aria-hidden className="h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => setRun((n) => n + 1)}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:translate-y-px [&_svg]:size-4"
          >
            <RotateCcw /> Restart
          </button>
        </div>
      </div>
    </div>
  );
}
