import {
  defaultHotspotStyle,
  defaultPanZoomTiming,
  type Hotspot,
  type HotspotPosition,
  type PanZoom,
  type PanZoomEasing,
} from "@rustrak/openshowcase-schema";
import {
  Aperture,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  Crosshair,
  Image,
  Paintbrush,
  ScanSearch,
  Scissors,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatClock, formatSeconds } from "../../core/format";
import type {
  EditableStep,
  PhotoData,
  VideoData,
} from "../../lib/editable-step";
import {
  ColorField,
  Hint,
  IconButton,
  Row,
  Section,
  Segmented,
  ValueSlider,
} from "../controls";

const POSITIONS: {
  value: HotspotPosition;
  icon: React.ReactNode;
  title: string;
}[] = [
  { value: "auto", icon: <Sparkles />, title: "Auto" },
  { value: "top", icon: <ArrowUp />, title: "Above" },
  { value: "right", icon: <ArrowRight />, title: "Right" },
  { value: "bottom", icon: <ArrowDown />, title: "Below" },
  { value: "left", icon: <ArrowLeft />, title: "Left" },
];

const EASINGS: { value: PanZoomEasing; label: string }[] = [
  { value: "smooth", label: "Smooth" },
  { value: "cinematic", label: "Cinematic" },
  { value: "fast", label: "Fast" },
  { value: "linear", label: "Linear" },
];

const RATES = ["0.5", "1", "1.5", "2"] as const;

export interface StepInspectorProps {
  step: EditableStep;
  index: number;
  onPhotoChange: (patch: Partial<PhotoData>, coalesceKey?: string) => void;
  onVideoChange: (patch: Partial<VideoData>, coalesceKey?: string) => void;
  onAddHotspot: () => void;
  onApplyStyleToAll: (hotspot: Hotspot) => void;
  onAddZoom: () => void;
  onEditZoom: () => void;
  onConvert: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSplit: () => void;
  onFreezeFrame: () => void;
}

export function StepInspector(props: StepInspectorProps) {
  const { step, index } = props;
  const data = step.data;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-1">
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
          {data.kind === "video" ? <Video /> : <Image />}
        </span>
        <div className="min-w-0">
          <h2 className="text-ui font-semibold">Step {index + 1}</h2>
          <p className="text-2xs text-muted-foreground">
            {data.kind === "video"
              ? "Video clip · plays on its own"
              : "Photo · waits for a click"}
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {data.kind === "photo" ? (
          <HotspotSection {...props} data={data} />
        ) : (
          <ClipSection {...props} data={data} />
        )}
        <ZoomSection
          panZoom={data.panZoom}
          onAdd={props.onAddZoom}
          onEdit={props.onEditZoom}
          onChange={(panZoom, key) =>
            data.kind === "photo"
              ? props.onPhotoChange({ panZoom }, key)
              : props.onVideoChange({ panZoom }, key)
          }
        />
      </div>

      <div className="mt-auto flex items-center gap-1 border-t border-border/60 px-3 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={props.onConvert}
        >
          {data.kind === "video" ? (
            <Image className="size-3.5" />
          ) : (
            <Video className="size-3.5" />
          )}
          {data.kind === "video" ? "To photo" : "To video"}
        </Button>
        <IconButton
          label="Duplicate step"
          shortcut="mod+d"
          onClick={props.onDuplicate}
          className="ml-auto"
        >
          <Copy />
        </IconButton>
        <IconButton
          label="Delete step"
          shortcut="backspace"
          onClick={props.onDelete}
          className="hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
        </IconButton>
      </div>
    </div>
  );
}

function HotspotSection({
  step,
  data,
  onPhotoChange,
  onAddHotspot,
  onApplyStyleToAll,
}: StepInspectorProps & { data: PhotoData }) {
  const hotspot = data.hotspot;
  const set = (patch: Partial<Hotspot>, key?: string) =>
    hotspot && onPhotoChange({ hotspot: { ...hotspot, ...patch } }, key);

  if (!hotspot) {
    return (
      <Section title="Hotspot">
        <EmptyCard
          icon={<Crosshair />}
          title="No hotspot yet"
          text="Click anywhere on the image to place it, or add one in the middle."
          action={
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={onAddHotspot}
            >
              <Crosshair className="size-3.5" /> Add hotspot
            </Button>
          }
        />
      </Section>
    );
  }

  return (
    <Section
      title="Hotspot"
      action={
        <IconButton
          label="Remove hotspot"
          className="size-6 [&_svg]:size-3.5"
          onClick={() => onPhotoChange({ hotspot: undefined })}
        >
          <X />
        </IconButton>
      }
    >
      <Textarea
        aria-label="Tooltip text"
        value={hotspot.label ?? ""}
        onChange={(e) => set({ label: e.target.value }, `label:${step.id}`)}
        placeholder="Click “Save”…"
        rows={2}
        className="min-h-16 resize-none bg-muted text-ui shadow-none focus-visible:bg-background"
      />
      <Row label="Background">
        <ColorField
          label="Background"
          value={hotspot.bgColor ?? defaultHotspotStyle.bgColor}
          onChange={(bgColor) => set({ bgColor }, `bg:${step.id}`)}
        />
      </Row>
      <Row label="Text">
        <ColorField
          label="Text color"
          value={hotspot.textColor ?? defaultHotspotStyle.textColor}
          onChange={(textColor) => set({ textColor }, `fg:${step.id}`)}
        />
      </Row>
      <Row label="Tooltip">
        <Segmented
          aria-label="Tooltip side"
          size="sm"
          className="w-full"
          value={hotspot.position ?? "auto"}
          onChange={(position) => set({ position })}
          options={POSITIONS.map((p) => ({
            value: p.value,
            label: p.icon,
            title: p.title,
          }))}
        />
      </Row>
      <Button
        variant="ghost"
        size="sm"
        className="-mx-1 justify-start gap-1.5 self-start px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => onApplyStyleToAll(hotspot)}
      >
        <Paintbrush className="size-3.5" /> Apply style to all hotspots
      </Button>
    </Section>
  );
}

function ClipSection({
  step,
  data,
  onVideoChange,
  onSplit,
  onFreezeFrame,
}: StepInspectorProps & { data: VideoData }) {
  const length = data.trimEnd - data.trimStart;
  return (
    <Section title="Clip">
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="In" value={formatClock(data.trimStart)} />
        <Stat label="Out" value={formatClock(data.trimEnd)} />
        <Stat label="Plays" value={formatSeconds(length / data.playbackRate)} />
      </div>
      <Row label="Speed">
        <Segmented
          aria-label="Playback speed"
          size="sm"
          className="w-full"
          value={String(data.playbackRate)}
          onChange={(rate) =>
            onVideoChange({ playbackRate: Number(rate) }, `rate:${step.id}`)
          }
          options={(RATES.includes(
            String(data.playbackRate) as (typeof RATES)[number],
          )
            ? RATES
            : [...RATES, String(data.playbackRate)]
          ).map((r) => ({ value: r, label: `${r}×` }))}
        />
      </Row>
      <div className="grid grid-cols-2 gap-1.5">
        <Hint label="Split at the playhead" shortcut="s">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onSplit}
          >
            <Scissors className="size-3.5" /> Split
          </Button>
        </Hint>
        <Hint label="New photo step from the playhead frame" shortcut="f">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onFreezeFrame}
          >
            <Aperture className="size-3.5" /> Freeze frame
          </Button>
        </Hint>
      </div>
      <p className="text-2xs leading-relaxed text-muted-foreground">
        Trim with the handles on the clip in the sequence below.
      </p>
    </Section>
  );
}

function ZoomSection({
  panZoom,
  onAdd,
  onEdit,
  onChange,
}: {
  panZoom: PanZoom | undefined;
  onAdd: () => void;
  onEdit: () => void;
  onChange: (panZoom: PanZoom | undefined, coalesceKey?: string) => void;
}) {
  if (!panZoom) {
    return (
      <Section title="Zoom">
        <EmptyCard
          icon={<ScanSearch />}
          title="No zoom"
          text="Pan & zoom into part of the screen to draw attention to it."
          action={
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={onAdd}
            >
              <ScanSearch className="size-3.5" /> Add zoom
            </Button>
          }
        />
      </Section>
    );
  }

  return (
    <Section
      title="Zoom"
      action={
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="xs"
            className="text-2xs text-muted-foreground"
            onClick={onEdit}
          >
            Edit frame
          </Button>
          <IconButton
            label="Remove zoom"
            className="size-6 [&_svg]:size-3.5"
            onClick={() => onChange(undefined)}
          >
            <X />
          </IconButton>
        </div>
      }
    >
      <ValueSlider
        label="Zoom"
        value={panZoom.scale}
        min={1.1}
        max={4}
        step={0.1}
        format={(v) => `${v.toFixed(1)}×`}
        onChange={(scale) => {
          const half = 0.5 / scale;
          const clampC = (c: number) => Math.min(1 - half, Math.max(half, c));
          onChange(
            { ...panZoom, scale, x: clampC(panZoom.x), y: clampC(panZoom.y) },
            "zoom-scale",
          );
        }}
      />
      <ValueSlider
        label="Transition"
        value={panZoom.duration ?? defaultPanZoomTiming.duration}
        min={300}
        max={2500}
        step={50}
        format={(v) => `${(v / 1000).toFixed(2)}s`}
        onChange={(duration) =>
          onChange({ ...panZoom, duration }, "zoom-duration")
        }
      />
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Easing</span>
        <Segmented
          aria-label="Easing"
          size="sm"
          value={panZoom.easing ?? defaultPanZoomTiming.easing}
          onChange={(easing) => onChange({ ...panZoom, easing })}
          options={EASINGS}
        />
      </div>
    </Section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-muted px-2 py-1.5">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-mono text-2xs text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

function EmptyCard({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2.5 rounded-lg border border-dashed border-border p-3">
      <div className="flex items-center gap-2 text-xs font-medium [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
        {icon}
        {title}
      </div>
      <p className="text-2xs leading-relaxed text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}
