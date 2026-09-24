import { cn } from "@/lib/utils";
import { RustrakWordmark } from "./rustrak-wordmark";

export const RUSTRAK_URL = "https://rustrak.github.io/rustrak/";

/** "Made by rustrak" credit, linking to the Rustrak project. */
export function MadeByRustrak({ className }: { className?: string }) {
  return (
    <a
      href={RUSTRAK_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group inline-flex items-center gap-1.5 text-2xs text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      Made by
      <RustrakWordmark className="h-[14px] w-auto text-foreground" />
    </a>
  );
}
