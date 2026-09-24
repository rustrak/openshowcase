import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useElementSize } from "@/hooks/use-element-size";
import { cn } from "@/lib/utils";
import { formatSeconds } from "../../core/format";
import {
  BLOCK_GAP,
  fitPxPerSec,
  MAX_PX_PER_SEC,
  MIN_PX_PER_SEC,
  type SequenceItem,
} from "../../core/sequence-layout";
import type { ClipPlayback } from "../../hooks/use-clip-playback";
import type { FilmstripFrame } from "../../hooks/use-recording";
import type { EditableStep } from "../../lib/editable-step";
import { IconButton } from "../controls";
import {
  type BlockActions,
  SequenceBlock,
  SequenceBlockOverlay,
} from "./SequenceBlock";

interface SequenceProps extends BlockActions {
  steps: EditableStep[];
  selectedId: string | null;
  duration: number;
  aspectRatio: number;
  filmstrip: FilmstripFrame[];
  playback: ClipPlayback;
  onReorder: (id: string, toIndex: number) => void;
}

const PAD = 16;
const ZOOM_STEP = 1.5;

/**
 * The whole demo as a strip of blocks, left to right: photos as fixed tiles, clips sized
 * by duration with trim handles. Drag a block's header to reorder; zoom like a timeline.
 */
export function Sequence({
  steps,
  selectedId,
  duration,
  aspectRatio,
  filmstrip,
  playback,
  onReorder,
  ...actions
}: SequenceProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(scrollerRef);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [activeId, setActiveId] = useState<string | null>(null);

  const items: SequenceItem[] = useMemo(
    () =>
      steps.map((s) =>
        s.data.kind === "video"
          ? { kind: "video", seconds: s.data.trimEnd - s.data.trimStart }
          : { kind: "photo" },
      ),
    [steps],
  );
  const fitPps = fitPxPerSec(items, Math.max(0, width - PAD * 2));
  const pps = zoom === "fit" ? fitPps : zoom;
  const hasVideo = items.some((i) => i.kind === "video");

  const playbackSeconds = steps.reduce(
    (sum, s) =>
      s.data.kind === "video"
        ? sum + (s.data.trimEnd - s.data.trimStart) / s.data.playbackRate
        : sum,
    0,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    actions.onSelect(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over || e.active.id === e.over.id) return;
    const toIndex = steps.findIndex((s) => s.id === e.over?.id);
    if (toIndex >= 0) onReorder(String(e.active.id), toIndex);
  }

  function zoomBy(factor: number) {
    setZoom(Math.min(MAX_PX_PER_SEC, Math.max(MIN_PX_PER_SEC, pps * factor)));
  }

  const activeIndex = steps.findIndex((s) => s.id === activeId);
  const activeStep = steps[activeIndex];

  return (
    <section
      aria-label="Sequence"
      className="flex shrink-0 flex-col rounded-xl bg-card shadow-card"
    >
      <header className="flex h-10 items-center gap-3 border-b border-border/60 px-4">
        <h2 className="text-xs font-semibold">Sequence</h2>
        <span className="text-2xs text-muted-foreground tabular-nums">
          {steps.length} steps
          {playbackSeconds > 0 &&
            ` · ${formatSeconds(playbackSeconds)} of video`}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton
            label="Zoom out"
            disabled={!hasVideo}
            onClick={() => zoomBy(1 / ZOOM_STEP)}
          >
            <ZoomOut />
          </IconButton>
          <IconButton
            label="Zoom in"
            disabled={!hasVideo}
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <ZoomIn />
          </IconButton>
          <IconButton
            label="Fit to width"
            active={zoom === "fit"}
            disabled={!hasVideo}
            onClick={() => setZoom("fit")}
          >
            <Maximize2 />
          </IconButton>
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="overflow-x-auto overflow-y-hidden overscroll-x-contain"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div
              className={cn("flex w-max items-end py-3")}
              style={{ gap: BLOCK_GAP, paddingInline: PAD }}
            >
              {steps.map((step, index) => (
                <SequenceBlock
                  key={step.id}
                  step={step}
                  index={index}
                  count={steps.length}
                  selected={step.id === selectedId}
                  pxPerSec={pps}
                  duration={duration}
                  aspectRatio={aspectRatio}
                  filmstrip={filmstrip}
                  playback={playback}
                  {...actions}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay
            dropAnimation={{
              duration: 200,
              easing: "cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            {activeStep && (
              <SequenceBlockOverlay
                step={activeStep}
                index={activeIndex}
                count={steps.length}
                selected
                pxPerSec={pps}
                duration={duration}
                aspectRatio={aspectRatio}
                filmstrip={filmstrip}
                playback={playback}
                {...actions}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </section>
  );
}
