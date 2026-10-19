import { FileUp, LoaderCircle, Moon, RotateCcw, Sun } from "lucide-react";
import { useRef, useState } from "react";
import { OpenShowcaseWordmark } from "@/components/brand/openshowcase-wordmark";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconButton } from "../editor/components/controls";
import { BundlePanel } from "./components/BundlePanel";
import { DropZone } from "./components/DropZone";
import { type HostBackground, HostStage } from "./components/HostStage";
import { useBundleFile } from "./hooks/use-bundle-file";
import { useFileDrop } from "./hooks/use-file-drop";

/**
 * Playground: plays an exported `.openshowcase` (or `.zip`) with the real player, loaded the
 * way a site loads it, on a light or dark site background.
 */
function App() {
  useColorScheme();
  const { state, open } = useBundleFile();
  const [background, setBackground] = useState<HostBackground>("light");
  const [run, setRun] = useState(0);
  const dragging = useFileDrop(open);
  const inputRef = useRef<HTMLInputElement>(null);

  const ready = state.status === "ready" && state.inspected.ok;
  const choose = () => inputRef.current?.click();

  return (
    <TooltipProvider delay={500}>
      <div className="flex h-full flex-col gap-2 bg-window p-2 pt-0">
        <header className="relative grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 px-3">
          <div className="flex min-w-0 items-center gap-3">
            <OpenShowcaseWordmark still className="h-[15px] w-auto shrink-0" />
            <span aria-hidden className="h-4 w-px shrink-0 bg-border" />
            <span className="text-ui font-medium">Playground</span>
          </div>

          <span />

          <div className="flex items-center justify-end gap-1">
            <IconButton
              label={
                background === "light"
                  ? "Dark site background"
                  : "Light site background"
              }
              side="bottom"
              onClick={() =>
                setBackground((b) => (b === "light" ? "dark" : "light"))
              }
            >
              {background === "light" ? <Moon /> : <Sun />}
            </IconButton>
            <IconButton
              label="Replay"
              side="bottom"
              disabled={!ready}
              onClick={() => setRun((n) => n + 1)}
            >
              <RotateCcw />
            </IconButton>
            <span aria-hidden className="mx-1 h-4 w-px bg-border" />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={choose}
            >
              <FileUp className="size-3.5" /> Open file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".openshowcase,.zip"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) open(file);
                e.target.value = "";
              }}
            />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-2">
          <div className="relative flex min-h-0 min-w-0 flex-1">
            {state.status === "ready" && state.inspected.ok ? (
              <HostStage
                url={state.url}
                aspectRatio={state.inspected.width / state.inspected.height}
                browserChrome={state.inspected.browserChrome}
                background={background}
                run={run}
              />
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl bg-stage shadow-card">
                {state.status === "loading" ? (
                  <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
                ) : (
                  <DropZone dragging={dragging} onChoose={choose} />
                )}
              </div>
            )}
            {dragging && ready && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-window/70 text-ui font-medium animate-in fade-in-0 duration-150">
                Drop to open this file
              </div>
            )}
          </div>
          {state.status === "ready" && (
            <BundlePanel name={state.name} inspected={state.inspected} />
          )}
          {state.status === "error" && (
            <BundlePanel
              name={state.name}
              inspected={{ ok: false, error: state.error }}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
