import { blobToWebp, buildDemoBundle } from "@rustrak/openshowcase-exporter";
import {
  type Demo,
  defaultHotspotStyle,
  defaultTheme,
  type Hotspot,
  type PanZoom,
  type Theme,
} from "@rustrak/openshowcase-schema";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { useColorScheme } from "@/hooks/use-color-scheme";
import type { RecordingRecord } from "@/lib/db";
import { ExportDialog } from "./components/ExportDialog";
import { Inspector, type InspectorTab } from "./components/inspector/Inspector";
import type { StepInspectorProps } from "./components/inspector/StepInspector";
import { PreviewStage } from "./components/PreviewStage";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { Sequence } from "./components/sequence/Sequence";
import { Stage } from "./components/stage/Stage";
import { type StageTool, StageToolbar } from "./components/stage/StageToolbar";
import { type EditorMode, TopBar } from "./components/TopBar";
import { MIN_CLIP_SEC } from "./core/sequence-layout";
import * as StepEditor from "./core/step-editor";
import { useClipPlayback } from "./hooks/use-clip-playback";
import { useEditorDocument } from "./hooks/use-editor-document";
import { type Hotkey, useHotkeys } from "./hooks/use-hotkeys";
import { useFrameExtraction } from "./hooks/use-recording";
import {
  DEFAULT_HOTSPOT_LABEL,
  type EditableStep,
  newStepId,
  type PhotoData,
  toSchemaStep,
  type VideoData,
} from "./lib/editable-step";

interface EditorProps {
  recordingId: string;
  recording: RecordingRecord;
  videoUrl: string;
  duration: number;
  aspectRatio: number;
  initialSteps: EditableStep[];
  colorScheme: ReturnType<typeof useColorScheme>;
}

export function Editor({
  recordingId,
  recording,
  videoUrl,
  duration,
  aspectRatio,
  initialSteps,
  colorScheme,
}: EditorProps) {
  const { doc, commit, patchAll, undo, redo, canUndo, canRedo } =
    useEditorDocument({
      title: "Untitled demo",
      theme: defaultTheme,
      steps: initialSteps,
    });
  const { steps, theme, title } = doc;

  const [selectedId, setSelectedId] = useState(initialSteps[0]?.id ?? null);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [tool, setTool] = useState<StageTool>("hotspot");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("step");
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // A selection that no longer exists (after undo/delete) falls back to the first step.
  const selectedIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === selectedId),
  );
  const selected = steps[selectedIndex];

  const { filmstrip, extractorRef } = useFrameExtraction(
    videoUrl,
    duration,
    initialSteps,
    useCallback(
      (id: string, imageBlob: Blob, imageUrl: string) =>
        patchAll((d) => ({
          ...d,
          steps: StepEditor.patchPhoto(d.steps, id, { imageBlob, imageUrl }),
        })),
      [patchAll],
    ),
  );

  const clip =
    selected?.data.kind === "video"
      ? {
          id: selected.id,
          start: selected.data.trimStart,
          end: selected.data.trimEnd,
          rate: selected.data.playbackRate,
        }
      : undefined;
  const playback = useClipPlayback(videoRef, clip);

  // ---------------------------------------------------------------- edits --

  const updateSteps = (
    update: (steps: EditableStep[]) => EditableStep[],
    coalesceKey?: string,
  ) => commit((d) => ({ ...d, steps: update(d.steps) }), coalesceKey);

  function select(id: string) {
    if (id === selected?.id) return;
    setSelectedId(id);
    setInspectorTab("step");
    setTool("hotspot");
  }

  function selectRelative(delta: number) {
    const next = steps[selectedIndex + delta];
    if (next) select(next.id);
  }

  const patchPhoto = (id: string, patch: Partial<PhotoData>, key?: string) =>
    updateSteps((s) => StepEditor.patchPhoto(s, id, patch), key);
  const patchVideo = (id: string, patch: Partial<VideoData>, key?: string) =>
    updateSteps((s) => StepEditor.patchVideo(s, id, patch), key);

  function setPanZoom(panZoom: PanZoom | undefined, key?: string) {
    if (!selected) return;
    if (selected.data.kind === "photo")
      patchPhoto(selected.id, { panZoom }, key);
    else patchVideo(selected.id, { panZoom }, key);
    if (!panZoom) setTool("hotspot");
  }

  function addHotspot() {
    if (selected?.data.kind !== "photo") return;
    patchPhoto(selected.id, {
      hotspot: {
        x: 0.5,
        y: 0.5,
        label: DEFAULT_HOTSPOT_LABEL,
        ...defaultHotspotStyle,
      },
    });
    setTool("hotspot");
  }

  function toggleCamera() {
    if (!selected) return;
    if (tool === "camera") {
      setTool("hotspot");
      return;
    }
    if (!selected.data.panZoom) {
      const focus =
        selected.data.kind === "photo" ? selected.data.hotspot : undefined;
      setPanZoom(StepEditor.defaultPanZoom(focus));
    }
    setTool("camera");
  }

  function duplicate(id: string) {
    let copyId: string | undefined;
    updateSteps((s) => {
      const result = StepEditor.duplicateStep(s, id, newStepId);
      copyId = result.newStepId;
      return result.steps;
    });
    if (copyId) select(copyId);
  }

  function remove(id: string) {
    if (steps.length <= 1) {
      toast("A demo needs at least one step");
      return;
    }
    const index = steps.findIndex((s) => s.id === id);
    updateSteps((s) => StepEditor.removeStep(s, id).steps);
    if (id === selected?.id) {
      const neighbour = steps[index + 1] ?? steps[index - 1];
      if (neighbour) setSelectedId(neighbour.id);
    }
    toast(`Step ${index + 1} deleted`, {
      action: { label: "Undo", onClick: () => undo() },
    });
  }

  async function extractAt(
    time: number,
  ): Promise<{ blob: Blob; url: string } | undefined> {
    const extractor = extractorRef.current;
    if (!extractor) return undefined;
    const blob = await extractor.extract(time);
    return { blob, url: URL.createObjectURL(blob) };
  }

  async function convert(id: string) {
    const step = steps.find((s) => s.id === id);
    if (!step) return;
    if (step.data.kind === "photo") {
      updateSteps((s) => StepEditor.convertToVideo(s, id, duration));
      return;
    }
    const playhead = playback.getTime();
    const time =
      id === selected?.id &&
      playhead >= step.data.trimStart &&
      playhead <= step.data.trimEnd
        ? playhead
        : (step.data.trimStart + step.data.trimEnd) / 2;
    const frame = await extractAt(time).catch(() => undefined);
    if (!frame) {
      toast.error("Couldn't grab that frame");
      return;
    }
    updateSteps((s) =>
      StepEditor.applyExtractedPhoto(s, id, time, frame.blob, frame.url),
    );
    setTool("hotspot");
  }

  function split() {
    if (selected?.data.kind !== "video") return;
    const time = playback.getTime();
    const { trimStart, trimEnd } = selected.data;
    if (time < trimStart + MIN_CLIP_SEC || time > trimEnd - MIN_CLIP_SEC) {
      toast("Move the playhead inside the clip to split it");
      return;
    }
    let nextId: string | undefined;
    updateSteps((s) => {
      const result = StepEditor.splitVideo(s, selected.id, time, newStepId);
      nextId = result?.selectedId;
      return result?.steps ?? s;
    });
    if (nextId) select(nextId);
  }

  async function freezeFrame() {
    if (selected?.data.kind !== "video") return;
    const time = playback.getTime();
    const frame = await extractAt(time).catch(() => undefined);
    if (!frame) {
      toast.error("Couldn't grab that frame");
      return;
    }
    const photo: EditableStep = {
      id: newStepId(),
      data: {
        kind: "photo",
        sourceTime: time,
        imageBlob: frame.blob,
        imageUrl: frame.url,
      },
    };
    updateSteps((s) => StepEditor.insertStepAfter(s, selected.id, photo));
    select(photo.id);
    toast("Photo step added after the clip");
  }

  // -------------------------------------------------------------- preview --

  const previewDemo: Demo | undefined = useMemo(() => {
    const width = recording.width ?? 0;
    const height = recording.height ?? 0;
    if (!width || !height) return undefined;
    const ready = steps.filter(
      (s) => s.data.kind !== "photo" || s.data.imageUrl,
    );
    if (ready.length === 0) return undefined;
    return {
      id: recordingId,
      title,
      video: { src: videoUrl, width, height, durationSec: duration },
      theme,
      steps: ready.map((s) => toSchemaStep(s, { width, height })),
    };
  }, [steps, theme, title, recording, videoUrl, duration, recordingId]);

  const hasVideoSteps =
    previewDemo?.steps.some((s) => s.type === "video") ?? false;

  const estimateSize = useCallback(async () => {
    let total = hasVideoSteps ? (recording.videoBlob?.size ?? 0) : 0;
    for (const step of steps) {
      if (step.data.kind !== "photo" || !step.data.imageBlob) continue;
      total += (await blobToWebp(step.data.imageBlob)).size;
    }
    return total;
  }, [steps, hasVideoSteps, recording.videoBlob]);

  async function exportBundle(): Promise<string> {
    if (!previewDemo) throw new Error("Frames are still being extracted");
    const imageBlobs = new Map<string, Blob>();
    for (const step of steps) {
      if (step.data.kind === "photo" && step.data.imageBlob)
        imageBlobs.set(step.id, step.data.imageBlob);
    }
    const blob = await buildDemoBundle({
      demo: previewDemo,
      videoBlob: hasVideoSteps ? (recording.videoBlob ?? undefined) : undefined,
      imageBlobs,
    });
    const file = `${title.trim().replace(/\s+/g, "-").toLowerCase() || "demo"}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return file;
  }

  // ------------------------------------------------------------ shortcuts --

  const editing = mode === "edit";
  const isVideo = selected?.data.kind === "video";
  const hotkeys: Hotkey[] = [
    { key: "z", mod: true, shift: false, run: undo },
    { key: "z", mod: true, shift: true, run: redo },
    { key: "y", mod: true, run: redo },
    { key: "e", mod: true, run: () => previewDemo && setExportOpen(true) },
    { key: "?", shift: true, run: () => setShortcutsOpen(true) },
    {
      key: "p",
      run: () => setMode((m) => (m === "edit" ? "preview" : "edit")),
    },
    {
      key: "Escape",
      run: () => {
        if (mode === "preview") setMode("edit");
        else setTool("hotspot");
      },
    },
  ];
  if (editing && selected) {
    hotkeys.push(
      { key: "ArrowLeft", run: () => selectRelative(-1) },
      { key: "ArrowRight", run: () => selectRelative(1) },
      { key: "ArrowUp", run: () => selectRelative(-1) },
      { key: "ArrowDown", run: () => selectRelative(1) },
      { key: "Backspace", run: () => remove(selected.id) },
      { key: "Delete", run: () => remove(selected.id) },
      { key: "d", mod: true, run: () => duplicate(selected.id) },
      { key: "z", run: toggleCamera },
    );
    if (!isVideo) hotkeys.push({ key: "h", run: () => setTool("hotspot") });
    if (isVideo)
      hotkeys.push(
        { key: " ", run: playback.toggle },
        { key: "s", run: split },
        { key: "f", run: () => void freezeFrame() },
      );
  }
  useHotkeys(hotkeys);

  // ---------------------------------------------------------------- render --

  const stepProps: StepInspectorProps | undefined = selected && {
    step: selected,
    index: selectedIndex,
    onPhotoChange: (patch, key) => patchPhoto(selected.id, patch, key),
    onVideoChange: (patch, key) => patchVideo(selected.id, patch, key),
    onAddHotspot: addHotspot,
    onApplyStyleToAll: (reference: Hotspot) => {
      updateSteps((s) => StepEditor.applyHotspotStyleToAll(s, reference));
      toast("Style applied to every hotspot");
    },
    onAddZoom: toggleCamera,
    onEditZoom: () => setTool("camera"),
    onConvert: () => void convert(selected.id),
    onDuplicate: () => duplicate(selected.id),
    onDelete: () => remove(selected.id),
    onSplit: split,
    onFreezeFrame: () => void freezeFrame(),
  };

  return (
    <div className="flex h-full flex-col bg-window text-foreground">
      <TopBar
        title={title}
        onTitleChange={(next) => commit((d) => ({ ...d, title: next }))}
        mode={mode}
        onModeChange={setMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onShowShortcuts={() => setShortcutsOpen(true)}
        colorScheme={colorScheme.preference}
        onColorSchemeChange={colorScheme.setPreference}
        onExport={() => setExportOpen(true)}
        exportDisabled={!previewDemo}
      />

      <div className="flex min-h-0 flex-1 gap-2 px-2 pb-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {mode === "preview" && previewDemo && (
            <PreviewStage
              demo={previewDemo}
              aspectRatio={aspectRatio}
              onExit={() => setMode("edit")}
            />
          )}
          {/* Kept mounted in preview: it owns the <video> that clip playback drives. */}
          <div className={mode === "edit" ? "contents" : "hidden"}>
            <Stage
              step={selected}
              theme={theme}
              title={title}
              aspectRatio={aspectRatio}
              videoUrl={videoUrl}
              videoRef={videoRef}
              tool={tool}
              onHotspotChange={(hotspot, key) =>
                selected && patchPhoto(selected.id, { hotspot }, key)
              }
              onPanZoomChange={(panZoom) => setPanZoom(panZoom)}
              toolbar={
                selected && (
                  <StageToolbar
                    key={selected.id}
                    kind={selected.data.kind}
                    tool={tool}
                    onToolChange={(next) =>
                      next === "camera" ? toggleCamera() : setTool(next)
                    }
                    hasCamera={Boolean(selected.data.panZoom)}
                    clip={
                      clip && {
                        start: clip.start,
                        end: clip.end,
                        playback,
                        onSplit: split,
                        onFreezeFrame: () => void freezeFrame(),
                      }
                    }
                  />
                )
              }
            />
          </div>
          {editing && (
            <Sequence
              steps={steps}
              selectedId={selected?.id ?? null}
              duration={duration}
              aspectRatio={aspectRatio}
              filmstrip={filmstrip}
              playback={playback}
              onSelect={select}
              onReorder={(id, toIndex) =>
                updateSteps((s) => StepEditor.moveStepTo(s, id, toIndex))
              }
              onMove={(id, dir) =>
                updateSteps((s) => StepEditor.moveStep(s, id, dir))
              }
              onTrim={(id, trimStart, trimEnd) =>
                patchVideo(id, { trimStart, trimEnd })
              }
              onDuplicate={duplicate}
              onDelete={remove}
              onConvert={(id) => void convert(id)}
            />
          )}
        </div>

        {editing && (
          <Inspector
            tab={inspectorTab}
            onTabChange={setInspectorTab}
            stepProps={stepProps}
            theme={theme}
            onThemeChange={(next: Theme) =>
              commit((d) => ({ ...d, theme: next }))
            }
          />
        )}
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        stepCount={steps.length}
        clipCount={steps.filter((s) => s.data.kind === "video").length}
        estimate={estimateSize}
        onExport={exportBundle}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
