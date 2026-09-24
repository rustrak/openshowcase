import type { Hotspot, PanZoom } from "@rustrak/openshowcase-schema";
import type { EditableStep, PhotoData, VideoData } from "../lib/editable-step";

export function patchStep(
  steps: EditableStep[],
  id: string,
  patch: (step: EditableStep) => EditableStep,
): EditableStep[] {
  return steps.map((s) => (s.id === id ? patch(s) : s));
}

export function patchPhoto(
  steps: EditableStep[],
  id: string,
  patch: Partial<PhotoData>,
): EditableStep[] {
  return patchStep(steps, id, (s) =>
    s.data.kind === "photo" ? { ...s, data: { ...s.data, ...patch } } : s,
  );
}

export function patchVideo(
  steps: EditableStep[],
  id: string,
  patch: Partial<VideoData>,
): EditableStep[] {
  return patchStep(steps, id, (s) =>
    s.data.kind === "video" ? { ...s, data: { ...s.data, ...patch } } : s,
  );
}

export function moveStep(
  steps: EditableStep[],
  id: string,
  dir: -1 | 1,
): EditableStep[] {
  const index = steps.findIndex((s) => s.id === id);
  const target = index + dir;
  if (index < 0 || target < 0 || target >= steps.length) return steps;
  const next = [...steps];
  const a = next[index];
  const b = next[target];
  if (!a || !b) return steps;
  next[index] = b;
  next[target] = a;
  return next;
}

export interface DuplicateStepResult {
  steps: EditableStep[];
  newStepId: string | undefined;
}

export function duplicateStep(
  steps: EditableStep[],
  id: string,
  createId: () => string,
): DuplicateStepResult {
  const index = steps.findIndex((s) => s.id === id);
  const original = steps[index];
  if (!original) return { steps, newStepId: undefined };
  const copy: EditableStep = { id: createId(), data: { ...original.data } };
  const next = [...steps];
  next.splice(index + 1, 0, copy);
  return { steps: next, newStepId: copy.id };
}

export interface RemoveStepResult {
  steps: EditableStep[];
  removedIndex: number;
}

export function removeStep(
  steps: EditableStep[],
  id: string,
): RemoveStepResult {
  const removedIndex = steps.findIndex((s) => s.id === id);
  return { steps: steps.filter((s) => s.id !== id), removedIndex };
}

export function convertToVideo(
  steps: EditableStep[],
  id: string,
  duration: number,
): EditableStep[] {
  const step = steps.find((s) => s.id === id);
  if (!step || step.data.kind !== "photo") return steps;
  const source = step.data.sourceTime;
  return patchStep(steps, id, (s) => ({
    ...s,
    data: {
      kind: "video",
      trimStart: Math.max(0, source - 3),
      trimEnd: Math.min(duration, source + 1) || duration,
      playbackRate: 1,
    },
  }));
}

export interface SplitVideoResult {
  steps: EditableStep[];
  selectedId: string;
}

export function splitVideo(
  steps: EditableStep[],
  id: string,
  time: number,
  createId: () => string,
): SplitVideoResult | undefined {
  const index = steps.findIndex((s) => s.id === id);
  const step = steps[index];
  if (!step || step.data.kind !== "video") return undefined;
  const first: EditableStep = {
    id: createId(),
    data: { ...step.data, trimEnd: time },
  };
  const second: EditableStep = {
    id: createId(),
    data: { ...step.data, trimStart: time },
  };
  const next = [...steps];
  next.splice(index, 1, first, second);
  return { steps: next, selectedId: second.id };
}

export function applyExtractedPhoto(
  steps: EditableStep[],
  id: string,
  time: number,
  imageBlob: Blob,
  imageUrl: string,
): EditableStep[] {
  return patchStep(steps, id, (s) => ({
    ...s,
    data: {
      kind: "photo",
      sourceTime: time,
      imageBlob,
      imageUrl,
      hotspot: undefined,
      panZoom: undefined,
    },
  }));
}

export function applyHotspotStyleToAll(
  steps: EditableStep[],
  reference: Hotspot,
): EditableStep[] {
  return steps.map((s) =>
    s.data.kind === "photo" && s.data.hotspot
      ? {
          ...s,
          data: {
            ...s.data,
            hotspot: {
              ...s.data.hotspot,
              bgColor: reference.bgColor,
              textColor: reference.textColor,
              position: reference.position,
            },
          },
        }
      : s,
  );
}

/** Moves step `id` to position `toIndex` (drag-to-reorder), shifting the steps in between. */
export function moveStepTo(
  steps: EditableStep[],
  id: string,
  toIndex: number,
): EditableStep[] {
  const from = steps.findIndex((s) => s.id === id);
  if (from < 0 || toIndex < 0 || toIndex >= steps.length) return steps;
  const next = [...steps];
  const [moved] = next.splice(from, 1);
  if (!moved) return steps;
  next.splice(toIndex, 0, moved);
  return next;
}

const DEFAULT_ZOOM_SCALE = 1.8;

/**
 * Starting camera frame when the user adds a zoom: framed on the step's focus point (its
 * hotspot) — the thing the viewer should look at — and kept inside the image.
 */
export function defaultPanZoom(
  focus: { x: number; y: number } | undefined,
): PanZoom {
  const scale = DEFAULT_ZOOM_SCALE;
  const half = 0.5 / scale;
  const clampToImage = (v: number) => Math.min(1 - half, Math.max(half, v));
  return {
    x: clampToImage(focus?.x ?? 0.5),
    y: clampToImage(focus?.y ?? 0.5),
    scale,
  };
}

/** Inserts `step` right after step `afterId` (or at the end if it isn't found). */
export function insertStepAfter(
  steps: EditableStep[],
  afterId: string,
  step: EditableStep,
): EditableStep[] {
  const index = steps.findIndex((s) => s.id === afterId);
  const next = [...steps];
  next.splice(index < 0 ? next.length : index + 1, 0, step);
  return next;
}
