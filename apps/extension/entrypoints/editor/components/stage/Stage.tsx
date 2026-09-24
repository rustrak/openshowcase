import type { Hotspot, PanZoom, Theme } from "@rustrak/openshowcase-schema";
import { LoaderCircle, RotateCw } from "lucide-react";
import { type ReactNode, type RefObject, useRef } from "react";
import { useElementSize } from "@/hooks/use-element-size";
import { cn } from "@/lib/utils";
import { fitStage } from "../../core/stage-fit";
import type { EditableStep } from "../../lib/editable-step";
import {
  BROWSER_CHROME_HEIGHT,
  PLAYER_APPEARANCE,
} from "../../lib/player-appearance";
import { CameraLayer } from "./CameraLayer";
import { HotspotLayer } from "./HotspotLayer";
import type { StageTool } from "./StageToolbar";

interface StageProps {
  step: EditableStep | undefined;
  theme: Theme;
  title: string;
  aspectRatio: number;
  videoUrl: string;
  /** The stage's `<video>` — clip playback and trim previews drive it through this ref. */
  videoRef: RefObject<HTMLVideoElement | null>;
  tool: StageTool;
  onHotspotChange: (hotspot: Hotspot, coalesceKey?: string) => void;
  onPanZoomChange: (panZoom: PanZoom | undefined) => void;
  toolbar: ReactNode;
}

/** Room kept free around the demo, and under it for the floating toolbar. */
const PAD_X = 48;
const PAD_TOP = 40;
const PAD_BOTTOM = 84;

/**
 * The recessed well the demo sits in. The media box is sized exactly (contain-fit) so the
 * hotspot and camera overlays share the pixels' coordinate space, and it's framed exactly
 * like the exported player (wrapper + appearance), so what you edit is what ships.
 */
export function Stage({
  step,
  theme,
  title,
  aspectRatio,
  videoUrl,
  videoRef,
  tool,
  onHotspotChange,
  onPanZoomChange,
  toolbar,
}: StageProps) {
  const wellRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const well = useElementSize(wellRef);
  const browser = theme.wrapper === "browser";
  const colors = PLAYER_APPEARANCE[theme.appearance];
  const media = fitStage(
    {
      width: Math.max(0, well.width - PAD_X * 2),
      height: Math.max(0, well.height - PAD_TOP - PAD_BOTTOM),
    },
    aspectRatio,
    browser ? BROWSER_CHROME_HEIGHT : 0,
  );

  const data = step?.data;
  const hotspot = data?.kind === "photo" ? data.hotspot : undefined;
  const panZoom = data?.panZoom;
  const photoPending = data?.kind === "photo" && !data.imageUrl;

  return (
    <div
      ref={wellRef}
      className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-stage shadow-card"
    >
      {/* dotted backdrop, like a design canvas */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px] opacity-70"
      />

      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top:
            PAD_TOP +
            (well.height -
              PAD_TOP -
              PAD_BOTTOM -
              media.height -
              (browser ? BROWSER_CHROME_HEIGHT : 0)) /
              2,
        }}
      >
        <div
          className={cn(
            "overflow-hidden",
            browser &&
              "rounded-xl shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_24px_60px_-16px_rgb(15_23_42/0.45)]",
            !browser &&
              "shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_16px_40px_-16px_rgb(15_23_42/0.35)]",
          )}
          style={{ background: colors.frame, width: media.width }}
        >
          {browser && (
            <div
              className="flex items-center gap-1.5 border-b px-3.5"
              style={{
                height: BROWSER_CHROME_HEIGHT,
                background: colors.chromeBg,
                borderColor: colors.chromeBorder,
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-2.5 rounded-full"
                  style={{ background: colors.dot }}
                />
              ))}
              <span
                className="mx-auto max-w-[380px] flex-[0_1_380px] truncate rounded-md px-2.5 py-0.5 text-center text-[11.5px]"
                style={{ background: colors.titleBg, color: colors.titleText }}
              >
                {title}
              </span>
              <RotateCw
                className="size-3"
                style={{ color: colors.titleText }}
              />
            </div>
          )}

          <div
            ref={mediaRef}
            className="wd-scope relative select-none overflow-hidden"
            style={{
              width: media.width,
              height: media.height,
              background: colors.stage,
            }}
          >
            {/* Always mounted so clip playback / trim previews can seek it at any time. */}
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              playsInline
              preload="auto"
              className={cn(
                "pointer-events-none absolute inset-0 size-full object-contain",
                data?.kind !== "video" && "invisible",
              )}
            />

            {data?.kind === "photo" && data.imageUrl && (
              <img
                key={data.imageUrl}
                src={data.imageUrl}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 size-full object-contain animate-in fade-in-0 duration-200"
              />
            )}

            {photoPending && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,var(--color-muted),transparent)] bg-size-[200%_100%]" />
                <span className="relative flex items-center gap-2 text-xs text-muted-foreground">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Extracting frame…
                </span>
              </div>
            )}

            {data && !photoPending && (
              <>
                <CameraLayer
                  panZoom={panZoom}
                  active={tool === "camera"}
                  mediaRef={mediaRef}
                  onChange={onPanZoomChange}
                />
                {data.kind === "photo" && hotspot && tool === "hotspot" && (
                  <div
                    aria-hidden
                    // distinct from the HotspotLayer's key below: siblings sharing a key make
                    // React lose track of which is which and leave old layers behind
                    key={`spotlight-${step?.id}`}
                    className="wd-spotlight"
                    style={
                      {
                        "--wd-spot-x": `${hotspot.x * media.width}px`,
                        "--wd-spot-y": `${hotspot.y * media.height}px`,
                      } as React.CSSProperties
                    }
                  />
                )}
                {data.kind === "photo" && (
                  <HotspotLayer
                    key={`hotspot-${step?.id}`}
                    hotspot={hotspot}
                    editable={tool === "hotspot"}
                    mediaRef={mediaRef}
                    mediaSize={media}
                    onChange={onHotspotChange}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <StageHint
        text={
          photoPending
            ? undefined
            : tool === "camera" && !panZoom
              ? "Drag over the image to frame the zoom"
              : tool === "camera"
                ? "Drag to move · corners to resize · drag outside to redraw"
                : data?.kind === "photo" && !hotspot
                  ? "Click the image to place the hotspot"
                  : undefined
        }
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        {toolbar}
      </div>
    </div>
  );
}

function StageHint({ text }: { text: string | undefined }) {
  if (!text) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
      <span
        key={text}
        className="rounded-full bg-foreground/85 px-3 py-1 text-2xs font-medium text-background shadow-float backdrop-blur-sm animate-in fade-in-0 slide-in-from-top-1 duration-200"
      >
        {text}
      </span>
    </div>
  );
}
