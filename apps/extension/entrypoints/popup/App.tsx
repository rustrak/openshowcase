import { ArrowUpRight, Circle, MousePointerClick, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { MadeByRustrak } from "@/components/brand/made-by-rustrak";
import { OpenShowcaseWordmark } from "@/components/brand/openshowcase-wordmark";
import { Button } from "@/components/ui/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  defaultRecordingSessionState,
  type RecordingSessionState,
  sendMessage,
} from "@/lib/messaging";
import { recordingSession } from "@/lib/recording-storage";

function App() {
  useColorScheme();
  const [state, setState] = useState<RecordingSessionState>(
    defaultRecordingSessionState,
  );

  useEffect(() => {
    recordingSession.getValue().then(setState);
    return recordingSession.watch((newState) => setState(newState));
  }, []);

  async function send(type: "startRecording" | "stopRecording") {
    await sendMessage(type, undefined).catch((error) => {
      console.error("[openshowcase:popup] message failed", error);
    });
  }

  async function startRecording() {
    await send("startRecording");
    // Get out of the way: the page being recorded is what matters now.
    window.close();
  }

  async function openEditor() {
    if (!state.recordingId) return;
    await browser.tabs.create({
      url: browser.runtime.getURL(
        `/editor.html?recordingId=${state.recordingId}`,
      ),
    });
  }

  const hasFinishedRecording = !state.active && Boolean(state.recordingId);

  return (
    <div className="flex w-[300px] flex-col gap-4 bg-background p-4 text-foreground">
      <header className="flex h-6 items-center justify-between">
        <OpenShowcaseWordmark className="h-[14px] w-auto" />
        {state.active && (
          <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-2xs font-semibold tracking-wide text-destructive">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-destructive opacity-60 motion-reduce:hidden" />
              <span className="relative size-1.5 rounded-full bg-destructive" />
            </span>
            REC
          </span>
        )}
      </header>

      {state.active ? (
        <div className="flex flex-col gap-3 animate-in fade-in-0 duration-200">
          <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-background text-foreground shadow-card">
              <MousePointerClick className="size-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-ui font-semibold tabular-nums">
                {state.clickCount ?? 0}{" "}
                {state.clickCount === 1 ? "step" : "steps"}
              </span>
              <span className="text-2xs text-muted-foreground">
                Every click becomes a step
              </span>
            </div>
          </div>
          <Button
            className="h-10 w-full gap-2 bg-foreground text-background hover:bg-foreground/85"
            onClick={() => send("stopRecording")}
          >
            <Square className="size-3 fill-current" /> Stop & edit
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 animate-in fade-in-0 duration-200">
          <p className="text-ui leading-relaxed text-muted-foreground">
            Use this tab normally. Clicks become steps, scrolling and typing
            become short clips — the editor opens when you stop.
          </p>
          <Button className="h-10 w-full gap-2" onClick={startRecording}>
            <Circle className="size-3 fill-destructive text-destructive" />{" "}
            Record this tab
          </Button>
          {hasFinishedRecording && (
            <Button
              variant="ghost"
              className="h-9 w-full justify-between text-xs text-muted-foreground"
              onClick={openEditor}
            >
              Open last recording
              <ArrowUpRight className="size-3.5" />
            </Button>
          )}
        </div>
      )}

      <footer className="-mx-4 -mb-4 flex items-center justify-between border-t border-border/60 px-4 py-2.5">
        <span className="text-2xs text-muted-foreground">
          Open source · self-hosted
        </span>
        <MadeByRustrak />
      </footer>
    </div>
  );
}

export default App;
