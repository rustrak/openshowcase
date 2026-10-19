import type { MarkerRecord, RecordingDirection } from "@/lib/db";

/** Margin before the press for the photo step: 1/30s (two frames of the 60fps recording). */
export const FRAME_SEC = 1 / 30;
/** A stretch shorter than this isn't worth a clip. */
const MIN_VIDEO_SEC = 0.6;
/** Between two clicks with no activity, a stretch at least this long is still kept as a clip
 * (something probably happened: loading, an animation); shorter ones go photo → photo. */
const LONG_GAP_SEC = 3;
/** The camera starts moving in this long before a zoomed action and leaves this long after. */
const ZOOM_PAD_SEC = 0.5;
/** Shorter than this, the unzoomed rest of a clip joins the zoomed part instead. */
const MIN_SPLIT_SEC = 0.6;

export type StepPlan =
  | { kind: "photo"; time: number; marker: MarkerRecord }
  | {
      kind: "video";
      startTime: number;
      endTime: number;
      playbackRate: number;
      /** Camera framing the recording asked for (center + scale). */
      zoom?: { x: number; y: number; scale: number };
    };

const ms = (t: number) => Math.round(t * 1000) / 1000;

/**
 * Turns a continuous recording + input markers into steps: every click becomes
 * a photo step (the last frame before the press, with a hotspot). The stretch between two
 * clicks becomes a real-speed video clip only if something happened in it — scroll, typing,
 * drag — or it's long; otherwise the demo goes straight from one photo to the next and the
 * hotspot glides between them. The lead-in before the first click and the tail after the last
 * one are kept (context, and the result of the last click).
 *
 * A kept clip starts exactly on the previous photo's frame and ends on the next photo's, so
 * those cuts are seamless.
 */
export function buildStepPlan(
  markers: MarkerRecord[],
  durationSec: number,
  recordingStartedAt: number,
  direction?: RecordingDirection,
): StepPlan[] {
  const toSec = (capturedAt: number) =>
    (capturedAt - recordingStartedAt) / 1000;
  const clamp = (t: number) => Math.max(0, Math.min(durationSec, t));
  const isQuietClick = (m: MarkerRecord) => m.hotspot === false;
  const cuts = (direction?.cuts ?? []).map((c) => ({
    start: toSec(c.start),
    end: toSec(c.end),
  }));
  const zooms = (direction?.zooms ?? []).map((z) => ({
    ...z,
    start: toSec(z.start),
    end: toSec(z.end),
  }));
  const cutWithin = (start: number, end: number) =>
    cuts.reduce(
      (sum, c) =>
        sum + Math.max(0, Math.min(end, c.end) - Math.max(start, c.start)),
      0,
    );

  // Photo instants: the frame just before the press (`capturedAt` is the pointerdown time).
  const photos: { time: number; marker: MarkerRecord }[] = [];
  for (const marker of [...markers].sort(
    (a, b) => a.capturedAt - b.capturedAt,
  )) {
    if ((marker.kind ?? "click") !== "click" || isQuietClick(marker)) continue;
    const pressed = toSec(marker.capturedAt);
    if (pressed < -1 || pressed > durationSec) continue;
    const time = ms(clamp(pressed - FRAME_SEC));
    const previous = photos.at(-1);
    // a duplicate event for the same press (double-fired click, or within a frame)
    if (previous && time - previous.time < FRAME_SEC / 2) continue;
    photos.push({ time, marker });
  }

  // A click marked hotspot: false plays inside the clip, like scrolling or typing.
  const activityTimes = markers
    .filter((m) => (m.kind && m.kind !== "click") || isQuietClick(m))
    .map((m) => toSec(m.capturedAt));
  const hasActivityBetween = (start: number, end: number) =>
    activityTimes.some((t) => t > start && t < end);

  const plan: StepPlan[] = [];
  const push = (start: number, end: number, zoom?: (typeof zooms)[number]) =>
    plan.push({
      kind: "video",
      startTime: ms(start),
      endTime: ms(end),
      playbackRate: 1,
      ...(zoom && { zoom: { x: zoom.x, y: zoom.y, scale: zoom.scale } }),
    });
  // A zoomed action splits its clip: wide, zoomed in on the action, wide again. The pieces are
  // contiguous, so the player rolls straight through while the camera moves.
  // ponytail: one zoom per clip piece; a second one in the same piece is ignored.
  const piece = (start: number, end: number) => {
    if (end - start < MIN_VIDEO_SEC) return;
    const zoom = zooms.find(
      (z) => z.start - ZOOM_PAD_SEC < end && z.end + ZOOM_PAD_SEC > start,
    );
    if (!zoom) return push(start, end);
    let from = Math.max(start, zoom.start - ZOOM_PAD_SEC);
    let to = Math.min(end, zoom.end + ZOOM_PAD_SEC);
    if (from - start < MIN_SPLIT_SEC) from = start;
    if (end - to < MIN_SPLIT_SEC) to = end;
    if (from > start) push(start, from);
    push(from, to, zoom);
    if (to < end) push(to, end);
  };
  // The cuts (waits for the app) come out of a clip as jump cuts.
  const clip = (start: number, end: number) => {
    let from = start;
    for (const c of [...cuts].sort((a, b) => a.start - b.start)) {
      if (c.end <= from || c.start >= end) continue;
      piece(from, c.start);
      from = c.end;
    }
    piece(from, end);
  };

  let cursor = 0;
  photos.forEach((photo, i) => {
    const betweenClicks = i > 0;
    const keep =
      !betweenClicks ||
      hasActivityBetween(cursor, photo.time) ||
      photo.time - cursor - cutWithin(cursor, photo.time) >= LONG_GAP_SEC;
    if (keep) clip(cursor, photo.time);
    plan.push({ kind: "photo", time: photo.time, marker: photo.marker });
    cursor = photo.time;
  });
  clip(cursor, durationSec);

  if (plan.length === 0)
    plan.push({
      kind: "video",
      startTime: 0,
      endTime: ms(durationSec),
      playbackRate: 1,
    });
  return plan;
}
