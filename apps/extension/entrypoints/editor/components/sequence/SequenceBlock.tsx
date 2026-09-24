import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Film,
  Image,
  MoreHorizontal,
  Trash2,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatSeconds } from "../../core/format";
import {
  MIN_CLIP_WIDTH,
  nearestFrame,
  PHOTO_BLOCK_WIDTH,
  tileTimes,
  trimEdge,
} from "../../core/sequence-layout";
import type { ClipPlayback } from "../../hooks/use-clip-playback";
import type { FilmstripFrame } from "../../hooks/use-recording";
import type { EditableStep, VideoData } from "../../lib/editable-step";
import { startPointerDrag } from "../../lib/pointer-drag";
import { Shortcut } from "../controls";

/** Height of the thumbnail/filmstrip body of a block. */
export const BLOCK_BODY_HEIGHT = 56;

export interface BlockActions {
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onConvert: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onTrim: (id: string, trimStart: number, trimEnd: number) => void;
}

interface BlockProps extends BlockActions {
  step: EditableStep;
  index: number;
  count: number;
  selected: boolean;
  pxPerSec: number;
  duration: number;
  aspectRatio: number;
  filmstrip: FilmstripFrame[];
  playback: ClipPlayback;
}

/** A step in the sequence strip: sortable by its header, selectable/scrubbable by its body. */
export function SequenceBlock(props: BlockProps) {
  const { step } = props;
  const sortable = useSortable({ id: step.id });

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={cn("shrink-0", sortable.isDragging && "opacity-30")}
    >
      {step.data.kind === "video" ? (
        <VideoBlock
          {...props}
          data={step.data}
          handleRef={sortable.setActivatorNodeRef}
          handleProps={{ ...sortable.attributes, ...sortable.listeners }}
        />
      ) : (
        <BlockFrame
          {...props}
          width={PHOTO_BLOCK_WIDTH}
          handleRef={sortable.setActivatorNodeRef}
          handleProps={{ ...sortable.attributes, ...sortable.listeners }}
        >
          <PhotoBody step={step} />
        </BlockFrame>
      )}
    </div>
  );
}

/** Static rendition used for the lifted copy while dragging. */
export function SequenceBlockOverlay(props: BlockProps) {
  const { step, pxPerSec } = props;
  const width =
    step.data.kind === "video"
      ? Math.max(
          MIN_CLIP_WIDTH,
          (step.data.trimEnd - step.data.trimStart) * pxPerSec,
        )
      : PHOTO_BLOCK_WIDTH;
  return (
    <div className="scale-[1.03] rounded-lg shadow-lift">
      <BlockFrame {...props} width={width} selected={false} lifted>
        {step.data.kind === "video" ? (
          <Filmstrip
            frames={props.filmstrip}
            start={step.data.trimStart}
            width={width}
            pxPerSec={width / (step.data.trimEnd - step.data.trimStart)}
            aspectRatio={props.aspectRatio}
          />
        ) : (
          <PhotoBody step={step} />
        )}
      </BlockFrame>
    </div>
  );
}

function BlockFrame({
  step,
  index,
  count,
  selected,
  width,
  lifted,
  handleRef,
  handleProps,
  children,
  bodyProps,
  marginLeft,
  onSelect,
  onDuplicate,
  onDelete,
  onConvert,
  onMove,
}: BlockProps & {
  width: number;
  lifted?: boolean;
  handleRef?: (el: HTMLElement | null) => void;
  handleProps?: React.HTMLAttributes<HTMLElement>;
  children: React.ReactNode;
  bodyProps?: React.HTMLAttributes<HTMLDivElement>;
  marginLeft?: number;
}) {
  const data = step.data;
  const label =
    data.kind === "video"
      ? `${formatSeconds((data.trimEnd - data.trimStart) / data.playbackRate)}${data.playbackRate !== 1 ? ` · ${data.playbackRate}×` : ""}`
      : (data.hotspot?.label ?? "No hotspot");

  return (
    <div
      className={cn(
        "group/block relative flex flex-col gap-1",
        lifted && "bg-card rounded-lg p-1",
      )}
      style={{ width, marginLeft }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: dnd-kit drag handle — it wires the keyboard sensor, role and tabindex onto this element */}
      <div
        ref={handleRef}
        role="button"
        tabIndex={lifted ? -1 : 0}
        {...handleProps}
        onFocus={() => !lifted && onSelect(step.id)}
        aria-label={`Step ${index + 1}. Drag to reorder`}
        className={cn(
          "flex h-5 min-w-0 items-center gap-1.5 rounded-md px-1 text-2xs outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/60",
          lifted ? "cursor-grabbing" : "cursor-grab",
          selected ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "flex h-4 min-w-4 shrink-0 items-center justify-center rounded px-1 font-mono text-[10px] font-semibold tabular-nums",
            selected ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          {index + 1}
        </span>
        {data.kind === "video" ? (
          <Film className="size-3 shrink-0" />
        ) : (
          <Image className="size-3 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </div>

      <div
        onPointerDown={(e) => e.button === 0 && onSelect(step.id)}
        {...bodyProps}
        className={cn(
          "relative overflow-hidden rounded-lg bg-muted outline-1 -outline-offset-1 outline-foreground/10 transition-shadow",
          selected
            ? "ring-2 ring-ring ring-offset-2 ring-offset-card dark:ring-primary"
            : "hover:ring-1 hover:ring-foreground/20",
          bodyProps?.className,
        )}
        style={{ height: BLOCK_BODY_HEIGHT }}
      >
        {children}
      </div>

      {!lifted && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Step ${index + 1} actions`}
            className="absolute top-0 right-0 flex size-5 items-center justify-center rounded-md bg-card text-muted-foreground opacity-0 shadow-card transition-opacity outline-none group-hover/block:opacity-100 hover:text-foreground focus-visible:opacity-100 data-popup-open:opacity-100 [&_svg]:size-3.5"
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => onDuplicate(step.id)}>
              <Copy /> Duplicate
              <DropdownMenuShortcut>
                <Shortcut keys="mod+d" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onConvert(step.id)}>
              {data.kind === "video" ? <Image /> : <Video />}
              {data.kind === "video" ? "Convert to photo" : "Convert to video"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={index === 0}
              onClick={() => onMove(step.id, -1)}
            >
              <ArrowLeft /> Move left
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === count - 1}
              onClick={() => onMove(step.id, 1)}
            >
              <ArrowRight /> Move right
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(step.id)}
            >
              <Trash2 /> Delete
              <DropdownMenuShortcut>
                <Shortcut keys="backspace" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function PhotoBody({ step }: { step: EditableStep }) {
  const data = step.data;
  if (data.kind !== "photo") return null;
  if (!data.imageUrl) return <Shimmer />;
  return (
    <>
      <img
        src={data.imageUrl}
        alt=""
        draggable={false}
        className="size-full object-cover animate-in fade-in-0 duration-300"
      />
      {data.hotspot && (
        <span
          aria-hidden
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white shadow"
          style={{
            left: `${data.hotspot.x * 100}%`,
            top: `${data.hotspot.y * 100}%`,
            background: data.hotspot.bgColor,
          }}
        />
      )}
    </>
  );
}

function Shimmer() {
  return (
    <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,var(--color-border),transparent)] bg-size-[200%_100%] motion-reduce:animate-none" />
  );
}

function Filmstrip({
  frames,
  start,
  width,
  pxPerSec,
  aspectRatio,
}: {
  frames: FilmstripFrame[];
  start: number;
  width: number;
  pxPerSec: number;
  aspectRatio: number;
}) {
  if (frames.length === 0) return <Shimmer />;
  const tileWidth = BLOCK_BODY_HEIGHT * aspectRatio;
  return (
    <div className="pointer-events-none absolute inset-0 flex">
      {tileTimes(start, width, tileWidth, pxPerSec).map((time) => {
        const frame = nearestFrame(frames, time);
        return frame ? (
          <img
            key={time}
            src={frame.url}
            alt=""
            draggable={false}
            className="h-full shrink-0 object-cover"
            style={{ width: tileWidth }}
          />
        ) : null;
      })}
    </div>
  );
}

type TrimDraft = { trimStart: number; trimEnd: number };

function VideoBlock({
  data,
  duration,
  pxPerSec,
  selected,
  playback,
  filmstrip,
  aspectRatio,
  onSelect,
  onTrim,
  handleRef,
  handleProps,
  ...rest
}: BlockProps & {
  data: VideoData;
  handleRef: (el: HTMLElement | null) => void;
  handleProps: React.HTMLAttributes<HTMLElement>;
}) {
  const { step } = rest;
  const [draft, setDraft] = useState<TrimDraft | null>(null);
  const shown = draft ?? data;

  // While trimming, the block shows the union of the old and new range (the cut part
  // dimmed), extending left over its neighbour if needed — so content never shifts under
  // the pointer mid-drag. It reflows to the committed length on release.
  const displayStart = Math.min(data.trimStart, shown.trimStart);
  const displayEnd = Math.max(data.trimEnd, shown.trimEnd);
  const width = Math.max(
    MIN_CLIP_WIDTH,
    (displayEnd - displayStart) * pxPerSec,
  );
  const blockPps = width / (displayEnd - displayStart);
  const x = (time: number) => (time - displayStart) * blockPps;
  const marginLeft = draft
    ? -(data.trimStart - displayStart) * blockPps
    : undefined;

  function beginTrim(edge: "start" | "end") {
    return (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      onSelect(step.id);
      const originX = e.clientX;
      const originTime = edge === "start" ? data.trimStart : data.trimEnd;
      const playhead = playback.getTime();
      let last: TrimDraft = data;
      startPointerDrag(e, {
        onMove: (event) => {
          last = trimEdge(
            data,
            edge,
            originTime + (event.clientX - originX) / blockPps,
            {
              duration,
              snapTo: [playhead, data.trimStart, data.trimEnd],
              snapWithin: 6 / blockPps,
            },
          );
          setDraft(last);
          // Live preview: the stage shows the frame under the handle while dragging.
          playback.seek(edge === "start" ? last.trimStart : last.trimEnd);
        },
        onEnd: () => {
          setDraft(null);
          if (
            last.trimStart !== data.trimStart ||
            last.trimEnd !== data.trimEnd
          )
            onTrim(step.id, last.trimStart, last.trimEnd);
          playback.seek(last.trimStart);
        },
      });
    };
  }

  function timeAt(clientX: number, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    const t = displayStart + (clientX - rect.left) / blockPps;
    return Math.min(shown.trimEnd, Math.max(shown.trimStart, t));
  }

  function onBodyPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if (!selected) {
      onSelect(step.id);
      return;
    }
    const target = e.currentTarget;
    playback.pause();
    playback.seek(timeAt(e.clientX, target));
    startPointerDrag(e, {
      onMove: (event) => playback.seek(timeAt(event.clientX, target)),
    });
  }

  const playheadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected) return;
    const write = (time: number) => {
      const el = playheadRef.current;
      if (!el) return;
      const inside =
        time >= shown.trimStart - 0.001 && time <= shown.trimEnd + 0.001;
      el.style.opacity = inside ? "1" : "0";
      el.style.transform = `translateX(${x(time)}px)`;
    };
    write(playback.getTime());
    return playback.subscribe(write);
  });

  const ghostRef = useRef<HTMLDivElement>(null);

  return (
    <BlockFrame
      {...rest}
      step={step}
      selected={selected}
      pxPerSec={pxPerSec}
      duration={duration}
      playback={playback}
      filmstrip={filmstrip}
      aspectRatio={aspectRatio}
      onSelect={onSelect}
      onTrim={onTrim}
      width={width}
      marginLeft={marginLeft}
      handleRef={handleRef}
      handleProps={handleProps}
      bodyProps={{
        onPointerDown: onBodyPointerDown,
        onPointerMove: (e) => {
          const ghost = ghostRef.current;
          if (!ghost || !selected) return;
          const rect = e.currentTarget.getBoundingClientRect();
          ghost.style.opacity = "1";
          ghost.style.transform = `translateX(${e.clientX - rect.left}px)`;
        },
        onPointerLeave: () => {
          if (ghostRef.current) ghostRef.current.style.opacity = "0";
        },
        className: cn(
          selected ? "cursor-text" : "cursor-pointer",
          draft && "z-20",
        ),
      }}
    >
      <Filmstrip
        frames={filmstrip}
        start={displayStart}
        width={width}
        pxPerSec={blockPps}
        aspectRatio={aspectRatio}
      />

      {/* Parts cut away by the in-progress trim */}
      {draft && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 bg-card/75"
            style={{ width: x(shown.trimStart) }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 bg-card/75"
            style={{ width: width - x(shown.trimEnd) }}
          />
        </>
      )}

      {selected && (
        <>
          <div
            ref={ghostRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-px bg-foreground/40 opacity-0"
          />
          <div
            ref={playheadRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-0.5 -ml-px bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)] will-change-transform"
          >
            <span className="absolute -top-px left-1/2 size-2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" />
          </div>
        </>
      )}

      {(["start", "end"] as const).map((edge) => (
        <div
          key={edge}
          onPointerDown={beginTrim(edge)}
          className={cn(
            "group/handle absolute inset-y-0 z-20 flex w-3 cursor-ew-resize items-center justify-center transition-opacity",
            selected || draft
              ? "opacity-100"
              : "opacity-0 group-hover/block:opacity-100",
          )}
          style={{
            left:
              x(edge === "start" ? shown.trimStart : shown.trimEnd) -
              (edge === "start" ? 0 : 12),
          }}
        >
          <span className="h-6 w-1 rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.3),0_1px_3px_rgb(0_0_0/0.3)] transition-[height] group-hover/handle:h-8" />
        </div>
      ))}
    </BlockFrame>
  );
}
