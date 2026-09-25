import type { Step, VideoStep } from "@rustrak/openshowcase-schema";

/**
 * Ranges of the recording closer than this are one segment. Matches player-core's contiguity
 * threshold, so clips the player rolls through without a seek stay rolling in the export.
 */
const MERGE_GAP_SEC = 0.05;

/**
 * Silence left between two segments of the exported video. It must exceed the player's
 * contiguity threshold: clips that weren't back to back in the recording must not become back
 * to back in the export, or the player would roll from one into the other instead of seeking.
 */
export const SEGMENT_GAP_SEC = 0.1;

/** A range of the recording [start, end) copied into the exported video at `outStart`. */
export interface ClipSegment {
  start: number;
  end: number;
  outStart: number;
  /** A step in this range zooms into the video, so it's encoded at higher quality. */
  zoomed: boolean;
}

export interface VideoClipPlan {
  segments: ClipSegment[];
  /** Duration of the exported video. */
  durationSec: number;
  /** The demo's steps with every video step retimed onto the exported video. */
  steps: Step[];
}

/**
 * Plans an export that ships only the parts of the recording the video steps play: their
 * ranges, merged where they overlap or touch, laid end to end. Returns undefined when there
 * are no video steps.
 */
export function planVideoClips(steps: Step[]): VideoClipPlan | undefined {
  const videoSteps = steps.filter((s): s is VideoStep => s.type === "video");
  if (videoSteps.length === 0) return undefined;

  const segments: ClipSegment[] = [];
  const byStart = [...videoSteps].sort((a, b) => a.startTime - b.startTime);
  for (const step of byStart) {
    const zoomed = (step.panZoom?.scale ?? 1) > 1;
    const last = segments.at(-1);
    if (last && step.startTime <= last.end + MERGE_GAP_SEC) {
      last.end = Math.max(last.end, step.endTime);
      last.zoomed ||= zoomed;
    } else {
      segments.push({
        start: step.startTime,
        end: step.endTime,
        outStart: 0,
        zoomed,
      });
    }
  }

  let cursor = 0;
  for (const [i, segment] of segments.entries()) {
    segment.outStart = roundTime(cursor);
    cursor += segment.end - segment.start;
    if (i < segments.length - 1) cursor += SEGMENT_GAP_SEC;
  }

  const retime = (t: number): number => {
    const segment = segments.findLast((s) => s.start <= t + MERGE_GAP_SEC);
    if (!segment) throw new Error(`No exported segment covers ${t}s`);
    return roundTime(segment.outStart + Math.max(0, t - segment.start));
  };

  return {
    segments,
    durationSec: roundTime(cursor),
    steps: steps.map((step) =>
      step.type === "video"
        ? {
            ...step,
            startTime: retime(step.startTime),
            endTime: retime(step.endTime),
          }
        : step,
    ),
  };
}

/** Microsecond precision: the container's resolution, and it keeps steps.json readable. */
function roundTime(t: number): number {
  return Math.round(t * 1e6) / 1e6;
}
