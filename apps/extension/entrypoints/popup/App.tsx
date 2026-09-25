import {
  ArrowUpRight,
  MousePointerClick,
  Square,
  TriangleAlert,
} from "lucide-react";
import { browser } from "wxt/browser";
import { MadeByRustrak } from "@/components/brand/made-by-rustrak";
import { OpenShowcaseWordmark } from "@/components/brand/openshowcase-wordmark";
import { Button } from "@/components/ui/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { sendMessage } from "@/lib/messaging";
import { RecDot } from "./components/RecDot";
import { RecentRecordings } from "./components/RecentRecordings";
import { RecordGlyph } from "./components/RecordGlyph";
import { TabCard } from "./components/TabCard";
import { formatElapsed, isRecordableUrl } from "./core/format";
import {
  useActiveTab,
  useNow,
  useRecentRecordings,
  useRecordingSession,
  useRecordingStart,
  useTab,
} from "./hooks/use-popup-data";

const RECENT_LIMIT = 3;

function App() {
  useColorScheme();
  const session = useRecordingSession();
  const activeTab = useActiveTab();
  const recent = useRecentRecordings(RECENT_LIMIT);

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

  async function openEditor(recordingId: string) {
    await browser.tabs.create({
      url: browser.runtime.getURL(`/editor.html?recordingId=${recordingId}`),
    });
    window.close();
  }

  return (
    <div className="flex w-[320px] flex-col bg-window text-foreground">
      <header className="flex h-11 items-center justify-between px-4">
        <OpenShowcaseWordmark className="h-[14px] w-auto" />
        {session.active && <ElapsedChip recordingId={session.recordingId} />}
      </header>

      <main className="flex flex-col gap-3 px-3 pb-3">
        {session.active ? (
          <RecordingView
            tabId={session.tabId}
            activeTabId={activeTab?.id}
            clickCount={session.clickCount ?? 0}
            onStop={() => send("stopRecording")}
          />
        ) : (
          <IdleView
            tab={activeTab}
            onStart={startRecording}
            recent={
              <RecentRecordings recordings={recent} onOpen={openEditor} />
            }
          />
        )}
      </main>

      <footer className="flex items-center justify-between border-t border-border/60 bg-background px-4 py-2.5">
        <span className="text-2xs text-muted-foreground">
          Open source · self-hosted
        </span>
        <MadeByRustrak />
      </footer>
    </div>
  );
}

function IdleView({
  tab,
  onStart,
  recent,
}: {
  tab: ReturnType<typeof useActiveTab>;
  onStart: () => void;
  recent: React.ReactNode;
}) {
  const loading = tab === undefined;
  const recordable = isRecordableUrl(tab?.url ?? undefined);

  return (
    <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-(--ease-out-strong)">
      <div className="flex flex-col gap-2 rounded-2xl bg-background p-2 shadow-card">
        <TabCard tab={tab} className="shadow-none" />
        {!loading && !recordable ? (
          <p className="flex items-start gap-2 rounded-lg bg-muted px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            Chrome doesn't let extensions record this page. Open a website to
            start.
          </p>
        ) : (
          <p className="flex items-start gap-2 px-2.5 py-1 text-2xs leading-relaxed text-muted-foreground">
            <MousePointerClick className="mt-0.5 size-3.5 shrink-0" />
            Clicks become steps. Scrolling and typing become short clips.
          </p>
        )}
        <Button
          size="lg"
          variant={recordable || loading ? "default" : "secondary"}
          className="h-10 w-full gap-2 rounded-xl text-ui font-semibold tracking-[-0.005em] shadow-card transition-[background-color,scale] duration-150 ease-(--ease-out-strong) hover:bg-primary/90 active:scale-[0.985] disabled:shadow-none"
          disabled={loading || !recordable}
          onClick={onStart}
        >
          <RecordGlyph />
          Record this tab
        </Button>
      </div>
      {recent}
    </div>
  );
}

function RecordingView({
  tabId,
  activeTabId,
  clickCount,
  onStop,
}: {
  tabId: number | undefined;
  activeTabId: number | undefined;
  clickCount: number;
  onStop: () => void;
}) {
  const tab = useTab(tabId);
  const elsewhere =
    tab?.id != null && activeTabId != null && tab.id !== activeTabId;

  async function goToTab() {
    if (tab?.id == null) return;
    await browser.tabs.update(tab.id, { active: true });
    if (tab.windowId != null) {
      await browser.windows.update(tab.windowId, { focused: true });
    }
    window.close();
  }

  return (
    <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-(--ease-out-strong)">
      <div className="flex flex-col gap-2 rounded-2xl bg-background p-2 shadow-card">
        <TabCard
          tab={tab}
          recording
          className="shadow-none"
          trailing={
            elsewhere && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Go to the recorded tab"
                onClick={goToTab}
              >
                <ArrowUpRight />
              </Button>
            )
          }
        />
        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
          <span className="flex items-center gap-2 text-2xs text-muted-foreground">
            <MousePointerClick className="size-3.5" />
            Steps captured
          </span>
          <span
            key={clickCount}
            className="text-ui font-semibold tabular-nums animate-in fade-in-0 zoom-in-90 duration-200"
          >
            {clickCount}
          </span>
        </div>
        <Button
          size="lg"
          className="h-10 w-full gap-2 rounded-xl bg-foreground text-ui font-semibold tracking-[-0.005em] text-background shadow-card transition-[background-color,scale] duration-150 ease-(--ease-out-strong) hover:bg-foreground/85 active:scale-[0.985]"
          onClick={onStop}
        >
          <Square className="size-3 fill-current" /> Stop & edit
        </Button>
      </div>
      <p className="px-1 text-center text-2xs text-muted-foreground">
        The editor opens as soon as you stop.
      </p>
    </div>
  );
}

function ElapsedChip({ recordingId }: { recordingId: string | undefined }) {
  const start = useRecordingStart(recordingId);
  const now = useNow(true);
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 py-0.5 pr-2 pl-1.5 text-2xs font-semibold text-destructive tabular-nums">
      <RecDot className="size-1.5" />
      {start == null ? "REC" : formatElapsed(now - start)}
    </span>
  );
}

export default App;
