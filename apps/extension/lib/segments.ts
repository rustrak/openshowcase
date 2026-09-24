import type { MarkerRecord } from "@/lib/db";

/** Margin before the press for the photo step: 1/30s (two frames of the 60fps recording). */
export const FRAME_SEC = 1 / 30;
/** A stretch shorter than this isn't worth a clip. */
const MIN_VIDEO_SEC = 0.6;
/** Between two clicks with no activity, a stretch at least this long is still kept as a clip
 * (something probably happened: loading, an animation); shorter ones go photo → photo. */
const LONG_GAP_SEC = 3;

export type StepPlan =
  | { kind: "photo"; time: number; marker: MarkerRecord }
  | { kind: "video"; startTime: number; endTime: number; playbackRate: number };

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
): StepPlan[] {
  const toSec = (capturedAt: number) =>
    (capturedAt - recordingStartedAt) / 1000;
  const clamp = (t: number) => Math.max(0, Math.min(durationSec, t));

  // Photo instants: the frame just before the press (`capturedAt` is the pointerdown time).
  const photos: { time: number; marker: MarkerRecord }[] = [];
  for (const marker of [...markers].sort(
    (a, b) => a.capturedAt - b.capturedAt,
  )) {
    if ((marker.kind ?? "click") !== "click") continue;
    const pressed = toSec(marker.capturedAt);
    if (pressed < -1 || pressed > durationSec) continue;
    const time = ms(clamp(pressed - FRAME_SEC));
    const previous = photos.at(-1);
    // a duplicate event for the same press (double-fired click, or within a frame)
    if (previous && time - previous.time < FRAME_SEC / 2) continue;
    photos.push({ time, marker });
  }

  const activityTimes = markers
    .filter((m) => m.kind && m.kind !== "click")
    .map((m) => toSec(m.capturedAt));
  const hasActivityBetween = (start: number, end: number) =>
    activityTimes.some((t) => t > start && t < end);

  const plan: StepPlan[] = [];
  const clip = (start: number, end: number) => {
    if (end - start >= MIN_VIDEO_SEC)
      plan.push({
        kind: "video",
        startTime: ms(start),
        endTime: ms(end),
        playbackRate: 1,
      });
  };

  let cursor = 0;
  photos.forEach((photo, i) => {
    const betweenClicks = i > 0;
    const keep =
      !betweenClicks ||
      hasActivityBetween(cursor, photo.time) ||
      photo.time - cursor >= LONG_GAP_SEC;
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
