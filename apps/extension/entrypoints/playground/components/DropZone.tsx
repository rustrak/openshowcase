import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Empty stage: where to drop an exported demo, or pick one. */
export function DropZone({
  dragging,
  onChoose,
}: {
  dragging: boolean;
  onChoose: () => void;
}) {
  return (
    <div
      className={cn(
        "flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-10 py-12 text-center transition-colors animate-in fade-in-0 zoom-in-95 duration-300",
        dragging && "border-primary bg-primary/10",
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-card">
        <FileUp className="size-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-base font-semibold">Test an exported demo</h1>
        <p className="text-ui leading-relaxed text-muted-foreground">
          Drop a <code className="font-mono">.openshowcase</code> or{" "}
          <code className="font-mono">.zip</code> file here to play it exactly
          as your site will.
        </p>
      </div>
      <Button onClick={onChoose} className="gap-1.5">
        <FileUp className="size-3.5" /> Choose file
      </Button>
    </div>
  );
}
