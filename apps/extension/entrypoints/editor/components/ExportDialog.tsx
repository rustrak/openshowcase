import {
  Check,
  Copy,
  Download,
  LoaderCircle,
  PackageCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatBytes } from "@/lib/utils";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepCount: number;
  clipCount: number;
  /** Estimated zip size in bytes — computed when the dialog opens. */
  estimate: () => Promise<number>;
  /** Builds and downloads the bundle; resolves to the downloaded file name. */
  onExport: () => Promise<string>;
}

type Phase =
  | { kind: "idle" }
  | { kind: "exporting" }
  | { kind: "done"; file: string };

const SNIPPET = `import { InteractiveDemo } from "@rustrak/openshowcase-player-react";

<InteractiveDemo src="/demos/my-demo/steps.json" />`;

export function ExportDialog({
  open,
  onOpenChange,
  stepCount,
  clipCount,
  estimate,
  onExport,
}: ExportDialogProps) {
  const [bytes, setBytes] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase({ kind: "idle" });
    setBytes(null);
    estimate()
      .then((value) => !cancelled && setBytes(value))
      .catch(() => !cancelled && setBytes(-1));
    return () => {
      cancelled = true;
    };
  }, [open, estimate]);

  async function run() {
    setPhase({ kind: "exporting" });
    try {
      const file = await onExport();
      setPhase({ kind: "done", file });
    } catch (error) {
      setPhase({ kind: "idle" });
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 rounded-2xl p-6 sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-base">Export demo</DialogTitle>
          <DialogDescription className="text-xs">
            A self-contained bundle:{" "}
            <code className="font-mono">steps.json</code> plus its frames and
            recording. Host it anywhere and embed it with the player.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-2">
          <Stat label="Steps" value={String(stepCount)} />
          <Stat label="Video clips" value={String(clipCount)} />
          <Stat
            label="Size"
            value={
              bytes === null ? (
                <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />
              ) : bytes < 0 ? (
                "—"
              ) : (
                `≈ ${formatBytes(bytes)}`
              )
            }
          />
        </dl>

        {phase.kind === "done" ? (
          // min-w-0: without it the snippet's longest line widens the dialog's grid column
          // past the dialog instead of scrolling inside the <pre>
          <div className="flex min-w-0 flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            <div className="flex items-center gap-2.5 rounded-lg bg-primary/15 px-3 py-2.5 text-xs text-foreground">
              <PackageCheck className="size-4 text-brand-text" />
              <span>
                Downloaded <span className="font-mono">{phase.file}</span>.
                Unzip it into your site and embed it:
              </span>
            </div>
            <CodeBlock code={SNIPPET} />
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {phase.kind === "done" ? "Done" : "Cancel"}
          </Button>
          {phase.kind !== "done" && (
            <Button
              onClick={run}
              disabled={phase.kind === "exporting"}
              className="min-w-36 gap-1.5"
            >
              {phase.kind === "exporting" ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" /> Packaging…
                </>
              ) : (
                <>
                  <Download className="size-3.5" /> Download .zip
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2.5">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="flex h-5 items-center text-ui font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg bg-foreground text-background">
      <pre className="overflow-x-auto p-3 pr-10 font-mono text-2xs leading-relaxed">
        {code}
      </pre>
      <button
        type="button"
        aria-label="Copy snippet"
        onClick={() => {
          void navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className={cn(
          "absolute top-2 right-2 flex size-7 items-center justify-center rounded-md transition-colors hover:bg-background/15 [&_svg]:size-3.5",
          copied && "text-primary",
        )}
      >
        {copied ? <Check /> : <Copy />}
      </button>
    </div>
  );
}
