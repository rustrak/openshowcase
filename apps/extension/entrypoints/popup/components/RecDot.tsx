import { cn } from "@/lib/utils";

export function RecDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2 shrink-0", className)}>
      <span className="absolute inset-0 animate-ping rounded-full bg-destructive opacity-60 motion-reduce:hidden" />
      <span className="relative size-full rounded-full bg-destructive" />
    </span>
  );
}
