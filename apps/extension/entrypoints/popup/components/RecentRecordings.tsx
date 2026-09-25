import { ChevronRight, Film } from "lucide-react";
import { displayHost, formatElapsed, formatRelativeTime } from "../core/format";
import type { RecentRecording } from "../hooks/use-popup-data";

export function RecentRecordings({
  recordings,
  onOpen,
}: {
  recordings: RecentRecording[];
  onOpen: (id: string) => void;
}) {
  if (recordings.length === 0) return null;
  const now = Date.now();
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-1 text-2xs font-medium text-muted-foreground">
        Recent recordings
      </h2>
      <ul className="-mx-1 flex flex-col">
        {recordings.map((recording) => (
          <li key={recording.id}>
            <button
              type="button"
              onClick={() => onOpen(recording.id)}
              className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground">
                <Film className="size-3.5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium">
                  {displayHost(recording.pageUrl) || "Recording"}
                </span>
                <span className="text-2xs text-muted-foreground tabular-nums">
                  {formatRelativeTime(recording.createdAt, now)}
                  {recording.durationSec != null &&
                    ` · ${formatElapsed(recording.durationSec * 1000)}`}
                </span>
              </span>
              <ChevronRight className="size-3.5 text-muted-foreground opacity-0 transition-[opacity,translate] duration-150 ease-(--ease-out-strong) group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
