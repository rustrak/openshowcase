import { Globe } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { displayHost } from "../core/format";
import type { TabInfo } from "../hooks/use-popup-data";

/** The page that is (or would be) recorded: favicon, title and host. */
export function TabCard({
  tab,
  recording = false,
  trailing,
  className,
}: {
  tab: TabInfo | null | undefined;
  recording?: boolean;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl bg-card p-2.5 shadow-card",
        className,
      )}
    >
      <span
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
          recording &&
            "ring-2 ring-destructive/70 ring-offset-2 ring-offset-card",
        )}
      >
        <Favicon src={tab?.favIconUrl} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        {tab === undefined ? (
          <>
            <span className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
            <span className="mt-1.5 h-3 w-1/3 animate-pulse rounded bg-muted" />
          </>
        ) : (
          <>
            <span className="truncate text-ui font-medium">
              {tab?.title || "Untitled page"}
            </span>
            <span className="truncate text-2xs text-muted-foreground">
              {displayHost(tab?.url) || "No page"}
            </span>
          </>
        )}
      </div>
      {trailing}
    </div>
  );
}

function Favicon({ src }: { src: string | undefined }) {
  const [failed, setFailed] = useState(false);
  // chrome:// favicons don't load from an extension page.
  if (!src || failed || !/^(https?|data):/.test(src)) {
    return <Globe className="size-4 text-muted-foreground" />;
  }
  return (
    <img
      src={src}
      alt=""
      className="size-4 rounded-[3px]"
      onError={() => setFailed(true)}
    />
  );
}
