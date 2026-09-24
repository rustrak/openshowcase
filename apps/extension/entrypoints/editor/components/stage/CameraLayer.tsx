import type { PanZoom } from "@rustrak/openshowcase-schema";
import { X } from "lucide-react";
import { type RefObject, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type Corner,
  frameFromDrag,
  moveFrame,
  resizeFromCorner,
} from "../../core/camera-frame";
import { pointFromRect } from "../../lib/canvas-geometry";
import { startPointerDrag } from "../../lib/pointer-drag";

interface CameraLayerProps {
  panZoom: PanZoom | undefined;
  /** Camera is the active tool: the frame is editable and the rest of the image dims. */
  active: boolean;
  mediaRef: RefObject<HTMLDivElement | null>;
  onChange: (panZoom: PanZoom | undefined) => void;
}

const CORNERS: { corner: Corner; className: string }[] = [
  { corner: "tl", className: "-top-1.5 -left-1.5 cursor-nwse-resize" },
  { corner: "tr", className: "-top-1.5 -right-1.5 cursor-nesw-resize" },
  { corner: "bl", className: "-bottom-1.5 -left-1.5 cursor-nesw-resize" },
  { corner: "br", className: "-right-1.5 -bottom-1.5 cursor-nwse-resize" },
];

/**
 * The camera frame: where the player pans & zooms to on this step. Edited in place while
 * the camera tool is active (draw, move, resize from a corner); otherwise shown as a quiet
 * dashed outline so you always know a step has a zoom. Drafts stay local until release.
 */
export function CameraLayer({
  panZoom,
  active,
  mediaRef,
  onChange,
}: CameraLayerProps) {
  const [draft, setDraft] = useState<PanZoom | null>(null);
  const [drawing, setDrawing] = useState<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  } | null>(null);
  const shown = draft ?? panZoom;

  function pointFromEvent(e: { clientX: number; clientY: number }) {
    const rect = mediaRef.current?.getBoundingClientRect();
    return rect
      ? pointFromRect(rect, e.clientX, e.clientY)
      : { x: 0.5, y: 0.5 };
  }

  function track(
    e: React.PointerEvent,
    next: (point: { x: number; y: number }) => PanZoom,
  ) {
    e.stopPropagation();
    let last: PanZoom | null = null;
    startPointerDrag(e, {
      onMove: (event) => {
        last = next(pointFromEvent(event));
        setDraft(last);
      },
      onEnd: () => {
        setDraft(null);
        if (last) onChange(last);
      },
    });
  }

  function beginDraw(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const from = pointFromEvent(e);
    let to = from;
    setDrawing({ from, to });
    startPointerDrag(e, {
      onMove: (event) => {
        to = pointFromEvent(event);
        setDrawing({ from, to });
      },
      onEnd: () => {
        setDrawing(null);
        const frame = frameFromDrag(from, to);
        if (frame) onChange({ ...panZoom, ...frame });
      },
    });
  }

  function beginMove(e: React.PointerEvent) {
    if (!panZoom || e.button !== 0) return;
    const start = pointFromEvent(e);
    track(e, (p) => moveFrame(panZoom, p.x - start.x, p.y - start.y));
  }

  function beginResize(corner: Corner) {
    return (e: React.PointerEvent) => {
      if (!panZoom || e.button !== 0) return;
      track(e, (p) => resizeFromCorner(panZoom, corner, p));
    };
  }

  const frameStyle = shown && {
    left: `${(shown.x - 0.5 / shown.scale) * 100}%`,
    top: `${(shown.y - 0.5 / shown.scale) * 100}%`,
    width: `${100 / shown.scale}%`,
    height: `${100 / shown.scale}%`,
  };

  if (!active) {
    return frameStyle ? (
      <div
        aria-hidden
        className="pointer-events-none absolute z-[5] rounded-md border border-dashed border-white/80 shadow-[0_0_0_1px_rgb(0_0_0/0.25)]"
        style={frameStyle}
      />
    ) : null;
  }

  const drawStyle = drawing && {
    left: `${Math.min(drawing.from.x, drawing.to.x) * 100}%`,
    top: `${Math.min(drawing.from.y, drawing.to.y) * 100}%`,
    width: `${Math.abs(drawing.to.x - drawing.from.x) * 100}%`,
    height: `${Math.abs(drawing.to.y - drawing.from.y) * 100}%`,
  };

  return (
    <>
      {/* Draw surface: dragging anywhere outside the frame draws a new one. */}
      <div
        onPointerDown={beginDraw}
        className={cn(
          "absolute inset-0 z-10 cursor-crosshair",
          !frameStyle && !drawStyle && "bg-black/10",
        )}
      />

      {drawStyle && (
        <div
          className="pointer-events-none absolute z-20 rounded-md border-2 border-primary bg-primary/10 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]"
          style={drawStyle}
        />
      )}

      {frameStyle && shown && !drawStyle && (
        <div
          onPointerDown={beginMove}
          className="absolute z-20 cursor-move rounded-md border-2 border-primary shadow-[0_0_0_9999px_rgb(0_0_0/0.4)] transition-shadow"
          style={frameStyle}
        >
          <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-md bg-primary px-1.5 py-0.5 font-mono text-2xs font-semibold text-primary-foreground tabular-nums">
            {shown.scale.toFixed(1)}×
          </span>
          <button
            type="button"
            aria-label="Remove zoom"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onChange(undefined)}
            className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-md bg-popover text-popover-foreground shadow-float transition-colors hover:bg-destructive hover:text-white [&_svg]:size-3"
          >
            <X />
          </button>
          {CORNERS.map(({ corner, className }) => (
            <span
              key={corner}
              onPointerDown={beginResize(corner)}
              className={cn(
                "absolute size-3 rounded-full border-2 border-primary bg-white shadow transition-transform hover:scale-125",
                className,
              )}
            />
          ))}
        </div>
      )}
    </>
  );
}
