import {
  defaultHotspotStyle,
  type Hotspot,
} from "@rustrak/openshowcase-schema";
import "./player-visuals.css";
import {
  bubblePath,
  computeTooltipPlacement,
  type TooltipPlacement,
} from "@rustrak/openshowcase-player-core";
import {
  type RefObject,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { clamp01, pointFromRect } from "../../lib/canvas-geometry";
import { DEFAULT_HOTSPOT_LABEL } from "../../lib/editable-step";
import { startPointerDrag } from "../../lib/pointer-drag";

interface HotspotLayerProps {
  hotspot: Hotspot | undefined;
  stepPosition: { current: number; total: number };
  /** The hotspot layer is the active tool: click to place, drag to move. */
  editable: boolean;
  mediaRef: RefObject<HTMLDivElement | null>;
  mediaSize: { width: number; height: number };
  onChange: (hotspot: Hotspot, coalesceKey?: string) => void;
}

/**
 * The hotspot as the player will draw it (breathing ring + tooltip card), editable
 * in place. Drags are local until release, so a drag is one undo step and doesn't
 * re-render the whole editor on every pointer move.
 */
export function HotspotLayer({
  hotspot,
  stepPosition,
  editable,
  mediaRef,
  mediaSize,
  onChange,
}: HotspotLayerProps) {
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const shown = hotspot && draft ? { ...hotspot, ...draft } : hotspot;
  const dragging = draft !== null;

  function pointFromEvent(e: { clientX: number; clientY: number }) {
    const rect = mediaRef.current?.getBoundingClientRect();
    return rect
      ? pointFromRect(rect, e.clientX, e.clientY)
      : { x: 0.5, y: 0.5 };
  }

  /** `gestureKey` coalesces "place + drag" into a single undo step. */
  function drag(e: React.PointerEvent, base: Hotspot, gestureKey?: string) {
    let last = pointFromEvent(e);
    setDraft(last);
    startPointerDrag(e, {
      onMove: (event) => {
        last = pointFromEvent(event);
        setDraft(last);
      },
      onEnd: () => {
        setDraft(null);
        if (last.x !== base.x || last.y !== base.y)
          onChange({ ...base, ...last }, gestureKey);
      },
    });
  }

  function onSurfacePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const point = pointFromEvent(e);
    const base: Hotspot = hotspot ?? {
      ...point,
      label: DEFAULT_HOTSPOT_LABEL,
      ...defaultHotspotStyle,
    };
    const gestureKey = `hotspot-place-${e.timeStamp}`;
    if (!hotspot) onChange(base, gestureKey);
    drag(e, base, gestureKey);
  }

  function onPinKeyDown(e: React.KeyboardEvent) {
    if (!hotspot) return;
    const step = e.shiftKey ? 0.05 : 0.01;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    onChange(
      {
        ...hotspot,
        x: clamp01(hotspot.x + d[0]),
        y: clamp01(hotspot.y + d[1]),
      },
      "hotspot-nudge",
    );
  }

  const color = shown?.bgColor ?? defaultHotspotStyle.bgColor;

  return (
    <>
      {editable && (
        <div
          onPointerDown={onSurfacePointerDown}
          className="absolute inset-0 z-10 cursor-crosshair"
        />
      )}

      {shown && dragging && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 z-20 w-px bg-primary/70"
            style={{ left: shown.x * mediaSize.width }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 z-20 h-px bg-primary/70"
            style={{ top: shown.y * mediaSize.height }}
          />
          <span
            className="pointer-events-none absolute z-30 rounded-md bg-foreground px-1.5 py-0.5 font-mono text-2xs text-background tabular-nums shadow-float"
            style={{
              left: shown.x * mediaSize.width + 14,
              top: shown.y * mediaSize.height + 14,
            }}
          >
            {Math.round(shown.x * 100)}% · {Math.round(shown.y * 100)}%
          </span>
        </>
      )}

      {shown?.label && !dragging && (
        <TooltipBubble
          hotspot={shown}
          stepPosition={stepPosition}
          mediaSize={mediaSize}
        />
      )}

      {shown && (
        <button
          type="button"
          aria-label="Hotspot — drag to move, arrow keys to nudge"
          disabled={!editable}
          onPointerDown={(e) => {
            if (!hotspot || e.button !== 0) return;
            e.stopPropagation();
            drag(e, hotspot);
          }}
          onKeyDown={onPinKeyDown}
          className={cn(
            "wd-hotspot wd-hotspot--appear",
            dragging && "wd-hotspot--dragging",
            editable
              ? "cursor-grab active:cursor-grabbing"
              : "pointer-events-none",
          )}
          style={
            {
              left: shown.x * mediaSize.width,
              top: shown.y * mediaSize.height,
              "--openshowcase-color": color,
            } as React.CSSProperties
          }
        >
          {/* Same anatomy as the player's hotspot (player-core ui/Hotspot/Hotspot.ts) */}
          <span className="wd-dot">
            <span className="wd-pulse" />
            <span className="wd-ring" />
            <span className="wd-core" />
          </span>
        </button>
      )}
    </>
  );
}

function TooltipBubble({
  hotspot,
  stepPosition,
  mediaSize,
}: {
  hotspot: Hotspot;
  stepPosition: { current: number; total: number };
  mediaSize: { width: number; height: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const [layout, setLayout] = useState<{
    placement: TooltipPlacement;
    width: number;
    height: number;
    unit: number;
  }>();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Same placement rules and gap as the player (--wd-u recovered from the font size it drives).
    const unit = Number.parseFloat(getComputedStyle(el).fontSize) / 0.92 || 14;
    setLayout({
      width: el.offsetWidth,
      height: el.offsetHeight,
      unit,
      placement: computeTooltipPlacement({
        anchor: {
          left: hotspot.x * mediaSize.width,
          top: hotspot.y * mediaSize.height,
        },
        tooltipSize: { width: el.offsetWidth, height: el.offsetHeight },
        stageSize: mediaSize,
        position: hotspot.position,
        gap: Math.round(unit * 1.55 + 4),
      }),
    });
  }, [hotspot, mediaSize]);

  const bg = hotspot.bgColor ?? defaultHotspotStyle.bgColor;
  const placement = layout?.placement;
  // Box + tail as one outline — identical to the player's tooltip (player-core ui/Tooltip/Tooltip.ts).
  const d = layout
    ? bubblePath({
        width: layout.width,
        height: layout.height,
        radius: layout.unit * 0.95,
        side: layout.placement.side,
        tailOffset: layout.placement.arrowOffset,
        tail: {
          width: layout.unit * 1.2,
          height: layout.unit * 0.55,
          tipRadius: 2,
        },
      })
    : "";

  return (
    <div
      ref={ref}
      className={cn(
        "wd-tooltip",
        placement && `wd-tooltip--side-${placement.side}`,
      )}
      style={
        {
          color: hotspot.textColor ?? defaultHotspotStyle.textColor,
          "--wd-tip-bg": bg,
          left: placement?.left ?? 0,
          top: placement?.top ?? 0,
          visibility: placement ? "visible" : "hidden",
          "--wd-arrow": `${placement?.arrowOffset ?? 0}px`,
        } as React.CSSProperties
      }
    >
      {layout && (
        <svg
          className="wd-body"
          width={layout.width}
          height={layout.height}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0"
                style={{ stopColor: `color-mix(in oklab, ${bg} 94%, white)` }}
              />
              <stop offset="1" style={{ stopColor: bg }} />
            </linearGradient>
            <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
              <stop offset="0.25" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`${uid}-clip`}>
              <path d={d} />
            </clipPath>
          </defs>
          <path d={d} fill={`url(#${uid}-fill)`} />
          <path
            d={d}
            className="wd-rim"
            stroke={`url(#${uid}-rim)`}
            clipPath={`url(#${uid}-clip)`}
          />
          <path d={d} className="wd-edge" />
        </svg>
      )}
      {hotspot.label}
      <div className="wd-tip-foot">
        <span className="wd-tip-count">
          {stepPosition.current}/{stepPosition.total}
        </span>
        <span className="wd-tip-bar">
          <span
            className="wd-tip-bar-fill"
            style={{
              width: `${(stepPosition.current / stepPosition.total) * 100}%`,
            }}
          />
        </span>
        <span className="wd-tip-go">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 8h9M8.5 4l4 4-4 4" />
          </svg>
        </span>
      </div>
    </div>
  );
}
