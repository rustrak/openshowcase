import {
  defaultHotspotStyle,
  type Hotspot,
  type PanZoom,
  type Step,
} from "@rustrak/openshowcase-schema";
import type { MarkerRecord } from "@/lib/db";
import type { StepPlan } from "@/lib/segments";

export interface PhotoData {
  kind: "photo";
  /** Moment of the recording the frame comes from (to re-extract it if needed). */
  sourceTime: number;
  imageBlob?: Blob;
  imageUrl?: string;
  hotspot?: Hotspot;
  panZoom?: PanZoom;
}

export interface VideoData {
  kind: "video";
  trimStart: number;
  trimEnd: number;
  playbackRate: number;
  panZoom?: PanZoom;
}

export type StepData = PhotoData | VideoData;

export interface EditableStep {
  id: string;
  data: StepData;
}

export const DEFAULT_HOTSPOT_LABEL = "Click here";

export function autoTooltipLabel(marker: MarkerRecord): string {
  if (marker.elementText) return `Click “${marker.elementText}”`;
  return DEFAULT_HOTSPOT_LABEL;
}

let nextId = 0;
export function newStepId(): string {
  nextId += 1;
  return `step-${Date.now().toString(36)}-${nextId}`;
}

export function stepsFromPlan(plan: StepPlan[]): EditableStep[] {
  return plan.map((item) => {
    if (item.kind === "photo") {
      const hotspot: Hotspot | undefined =
        item.marker.xFrac != null && item.marker.yFrac != null
          ? {
              x: item.marker.xFrac,
              y: item.marker.yFrac,
              label: autoTooltipLabel(item.marker),
              ...defaultHotspotStyle,
            }
          : undefined;
      return {
        id: newStepId(),
        data: {
          kind: "photo",
          sourceTime: item.time,
          hotspot,
        } satisfies PhotoData,
      };
    }
    return {
      id: newStepId(),
      data: {
        kind: "video",
        trimStart: item.startTime,
        trimEnd: item.endTime,
        playbackRate: item.playbackRate,
      } satisfies VideoData,
    };
  });
}

export function toSchemaStep(
  step: EditableStep,
  imageSize: { width: number; height: number },
): Step {
  const { data } = step;
  if (data.kind === "video") {
    return {
      id: step.id,
      type: "video",
      startTime: data.trimStart,
      endTime: data.trimEnd,
      playbackRate: data.playbackRate === 1 ? undefined : data.playbackRate,
      panZoom: data.panZoom,
    };
  }
  return {
    id: step.id,
    type: "photo",
    image: {
      src: data.imageUrl ?? "",
      width: imageSize.width,
      height: imageSize.height,
    },
    hotspot: data.hotspot,
    panZoom: data.panZoom,
  };
}
