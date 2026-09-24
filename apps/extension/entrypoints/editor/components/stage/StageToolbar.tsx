import {
  Aperture,
  Crosshair,
  Pause,
  Play,
  ScanSearch,
  Scissors,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatClock } from "../../core/format";
import type { ClipPlayback } from "../../hooks/use-clip-playback";
import { Hint, IconButton } from "../controls";

/** The layer the pointer edits. On video steps "hotspot" just means "nothing" (no layer). */
export type StageTool = "hotspot" | "camera";

interface StageToolbarProps {
  kind: "photo" | "video";
  tool: StageTool;
  onToolChange: (tool: StageTool) => void;
  hasCamera: boolean;
  /** Present for video steps. */
  clip?: {
    start: number;
    end: number;
    playback: ClipPlayback;
    onSplit: () => void;
    onFreezeFrame: () => void;
  };
}

/** Floating pill under the stage: which layer you're editing, plus clip transport. */
export function StageToolbar({
  kind,
  tool,
  onToolChange,
  hasCamera,
  clip,
}: StageToolbarProps) {
  return (
    <div className="pointer-events-auto flex h-11 items-center gap-0.5 rounded-xl bg-popover p-1 shadow-float animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
      {kind === "photo" && (
        <ToolButton
          label="Hotspot"
          shortcut="h"
          active={tool === "hotspot"}
          onClick={() => onToolChange("hotspot")}
          icon={<Crosshair />}
        />
      )}
      <ToolButton
        label={hasCamera ? "Zoom" : "Add zoom"}
        shortcut="z"
        active={tool === "camera"}
        onClick={() => onToolChange(tool === "camera" ? "hotspot" : "camera")}
        icon={<ScanSearch />}
        badge={hasCamera}
      />

      {clip && (
        <>
          <span aria-hidden className="mx-1 h-5 w-px bg-border" />
          <Hint
            label={clip.playback.playing ? "Pause" : "Play clip"}
            shortcut="space"
          >
            <button
              type="button"
              aria-label={clip.playback.playing ? "Pause" : "Play clip"}
              onClick={clip.playback.toggle}
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-[background-color,scale] hover:bg-primary/85 active:scale-95 [&_svg]:size-3.5 [&_svg]:fill-current"
            >
              {clip.playback.playing ? (
                <Pause />
              ) : (
                <Play className="translate-x-px" />
              )}
            </button>
          </Hint>
          <Timecode
            start={clip.start}
            end={clip.end}
            playback={clip.playback}
          />
          <IconButton
            label="Split at playhead"
            shortcut="s"
            onClick={clip.onSplit}
          >
            <Scissors />
          </IconButton>
          <IconButton
            label="Freeze frame as photo step"
            shortcut="f"
            onClick={clip.onFreezeFrame}
          >
            <Aperture />
          </IconButton>
        </>
      )}
    </div>
  );
}

function ToolButton({
  label,
  shortcut,
  active,
  onClick,
  icon,
  badge,
}: {
  label: string;
  shortcut: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: boolean;
}) {
  return (
    <Hint label={label} shortcut={shortcut}>
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "relative flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors active:translate-y-px [&_svg]:size-4",
          active
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {icon}
        {label}
        {badge && !active && (
          <span aria-hidden className="size-1.5 rounded-full bg-brand-text" />
        )}
      </button>
    </Hint>
  );
}

/** Clip-relative time, updated by direct DOM writes while playing (no React re-render). */
function Timecode({
  start,
  end,
  playback,
}: {
  start: number;
  end: number;
  playback: ClipPlayback;
}) {
  const currentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const write = (time: number) => {
      if (currentRef.current)
        currentRef.current.textContent = formatClock(
          Math.min(end, Math.max(start, time)) - start,
        );
    };
    write(playback.getTime());
    return playback.subscribe(write);
  }, [playback, start, end]);

  return (
    <span className="px-2 font-mono text-2xs text-muted-foreground tabular-nums">
      <span ref={currentRef} className="text-foreground">
        {formatClock(0)}
      </span>
      {" / "}
      {formatClock(end - start)}
    </span>
  );
}
