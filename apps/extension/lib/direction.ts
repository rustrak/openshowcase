import type { MarkerRecord, RecordingDirection } from "@/lib/db";

/** A click the recorder CLI performed: wall-clock window around it + what the flow asked of it. */
export interface ClickCue {
  start: number;
  end: number;
  label?: string;
  zoom?: number;
  hotspot?: boolean;
}

/** Everything the recorder CLI's flow asks of a recording, matched onto it at export. */
export interface Direction extends RecordingDirection {
  clicks: ClickCue[];
}

/** The press can be stamped a little before the CLI's own `start` (two clocks, rounding). */
const TOLERANCE_MS = 50;

/** Gives each click marker what the flow click it fell within asked for, once per cue. */
export function cueClicks(
  markers: MarkerRecord[],
  cues: ClickCue[],
): MarkerRecord[] {
  const unused = [...cues];
  return markers.map((marker) => {
    if ((marker.kind ?? "click") !== "click") return marker;
    const index = unused.findIndex(
      (c) =>
        marker.capturedAt >= c.start - TOLERANCE_MS &&
        marker.capturedAt <= c.end + TOLERANCE_MS,
    );
    if (index === -1) return marker;
    const [{ label, zoom, hotspot } = {}] = unused.splice(index, 1);
    return {
      ...marker,
      ...(label != null && { label }),
      ...(zoom != null && { zoom }),
      ...(hotspot != null && { hotspot }),
    };
  });
}
