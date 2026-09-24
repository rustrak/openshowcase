import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LoadingScreen, MessageScreen } from "./components/Screens";
import { Editor } from "./Editor";
import { useRecording } from "./hooks/use-recording";

const recordingId = new URLSearchParams(window.location.search).get(
  "recordingId",
);

function App() {
  const colorScheme = useColorScheme();
  const state = useRecording(recordingId);

  return (
    <TooltipProvider delay={500}>
      {state.status === "missing-id" && (
        <MessageScreen
          title="No recording selected"
          text="Record a tab from the OpenShowcase toolbar button — the editor opens by itself when you stop."
        />
      )}
      {state.status === "loading" && <LoadingScreen />}
      {state.status === "empty" && (
        <MessageScreen
          title="This recording is empty"
          text="It may have been interrupted before any step was captured. Record the flow again from the toolbar button."
        />
      )}
      {state.status === "ready" && recordingId && (
        <Editor
          recordingId={recordingId}
          recording={state.recording}
          videoUrl={state.videoUrl}
          duration={state.duration}
          aspectRatio={state.aspectRatio}
          initialSteps={state.initialSteps}
          colorScheme={colorScheme}
        />
      )}
      <Toaster
        position="top-center"
        theme={colorScheme.scheme}
        offset={{ top: 56 }}
        toastOptions={{
          classNames: { toast: "!rounded-xl !shadow-float !text-ui" },
        }}
      />
    </TooltipProvider>
  );
}

export default App;
