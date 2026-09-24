/**
 * Geometry of the bottom sequence strip: every step is a block laid out left to right.
 * Photo steps have no duration (they wait for a click), so they get a fixed width; video
 * clips are sized by their source duration at the current zoom (`pxPerSec`), the same way
 * a video editor lays out clips.
 */

export const PHOTO_BLOCK_WIDTH = 104;
export const MIN_CLIP_WIDTH = 56;
export const BLOCK_GAP = 6;

export type SequenceItem =
  | { kind: "photo" }
  | { kind: "video"; seconds: number };

export function blockWidth(item: SequenceItem, pxPerSec: number): number {
  if (item.kind === "photo") return PHOTO_BLOCK_WIDTH;
  return Math.max(MIN_CLIP_WIDTH, item.seconds * pxPerSec);
}

export const MIN_PX_PER_SEC = 8;
export const MAX_PX_PER_SEC = 400;
const DEFAULT_PX_PER_SEC = 60;

/** The zoom at which the whole sequence fills `availableWidth` ("fit" in the zoom control). */
export function fitPxPerSec(
  items: readonly SequenceItem[],
  availableWidth: number,
): number {
  let fixed = BLOCK_GAP * Math.max(0, items.length - 1);
  let seconds = 0;
  for (const item of items) {
    if (item.kind === "photo") fixed += PHOTO_BLOCK_WIDTH;
    else seconds += item.seconds;
  }
  if (seconds <= 0) return DEFAULT_PX_PER_SEC;
  const pps = (availableWidth - fixed) / seconds;
  return Math.min(MAX_PX_PER_SEC, Math.max(MIN_PX_PER_SEC, pps));
}

export const MIN_CLIP_SEC = 0.2;

export interface TrimOptions {
  /** Length of the whole recording — a clip is a window on it and can't leave it. */
  duration: number;
  /** Times the dragged edge is attracted to (playhead, the clip's original edges). */
  snapTo?: readonly number[];
  /** How close, in seconds, the edge must get to a snap point to lock onto it. */
  snapWithin?: number;
}

/** The clip after dragging one trim handle to `time`, clamped and snapped. */
export function trimEdge(
  clip: { trimStart: number; trimEnd: number },
  edge: "start" | "end",
  time: number,
  { duration, snapTo = [], snapWithin = 0 }: TrimOptions,
): { trimStart: number; trimEnd: number } {
  let snapped = time;
  let best = snapWithin;
  for (const point of snapTo) {
    const distance = Math.abs(point - time);
    if (distance <= best) {
      best = distance;
      snapped = point;
    }
  }
  if (edge === "start") {
    const max = clip.trimEnd - MIN_CLIP_SEC;
    return {
      trimStart: Math.min(max, Math.max(0, snapped)),
      trimEnd: clip.trimEnd,
    };
  }
  const min = clip.trimStart + MIN_CLIP_SEC;
  return {
    trimStart: clip.trimStart,
    trimEnd: Math.max(min, Math.min(duration, snapped)),
  };
}

/** The extracted filmstrip frame closest to `time` (frames arrive sorted by time). */
export function nearestFrame<F extends { time: number }>(
  frames: readonly F[],
  time: number,
): F | undefined {
  let best: F | undefined;
  for (const frame of frames) {
    if (!best || Math.abs(frame.time - time) < Math.abs(best.time - time))
      best = frame;
  }
  return best;
}

/** Recording time under the center of each filmstrip tile filling a clip block. */
export function tileTimes(
  startTime: number,
  blockWidth: number,
  tileWidth: number,
  pxPerSec: number,
): number[] {
  const count = Math.max(1, Math.ceil(blockWidth / tileWidth));
  return Array.from(
    { length: count },
    (_, i) => startTime + ((i + 0.5) * tileWidth) / pxPerSec,
  );
}
