import { Clapperboard } from "lucide-react";
import { MadeByRustrak } from "@/components/brand/made-by-rustrak";
import { OpenShowcaseWordmark } from "@/components/brand/openshowcase-wordmark";

/** Skeleton of the editor layout while the recording loads — no layout shift when it lands. */
export function LoadingScreen() {
  return (
    <div
      className="flex h-full flex-col gap-2 bg-window p-2 pt-0"
      aria-busy="true"
    >
      <div className="flex h-12 items-center px-3">
        <OpenShowcaseWordmark
          still
          className="h-[15px] w-auto text-foreground"
        />
      </div>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Shimmer className="flex-1 rounded-xl" />
          <Shimmer className="h-[128px] rounded-xl" />
        </div>
        <Shimmer className="w-[304px] rounded-xl" />
      </div>
    </div>
  );
}

function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`animate-shimmer bg-[linear-gradient(90deg,var(--color-card),var(--color-muted),var(--color-card))] bg-size-[200%_100%] shadow-card motion-reduce:animate-none ${className}`}
    />
  );
}

export function MessageScreen({
  title,
  text,
}: {
  title: string;
  text: React.ReactNode;
}) {
  return (
    <div className="flex h-full items-center justify-center bg-window p-8">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center animate-in fade-in-0 zoom-in-95 duration-300">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-card">
          <Clapperboard className="size-5" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-base font-semibold">{title}</h1>
          <p className="text-ui leading-relaxed text-muted-foreground">
            {text}
          </p>
        </div>
        <div className="mt-6 flex flex-col items-center gap-2">
          <OpenShowcaseWordmark
            still
            className="h-3.5 w-auto text-foreground"
          />
          <MadeByRustrak />
        </div>
      </div>
    </div>
  );
}
