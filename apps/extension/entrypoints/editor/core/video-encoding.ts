/** Bits per pixel per frame at 30fps. Static UI costs far less: this budgets motion. */
const BITS_PER_PIXEL = 0.037;
const ZOOM_FACTOR = 1.5;
const MAX_BITRATE = 12_000_000;

/**
 * Target bitrate (VBR) of the exported video. Measured on a 3000×1790@60 recording of a
 * GitHub page scrolling (the worst case: every frame is new text), against the recording:
 * - software H.264 at this rate (6 Mbps): VMAF 96.1, 3.2 MB for 8.5s;
 * - hardware H.264 at a fixed quantizer 22: VMAF ~97 but 9.3 MB, and quantizer 30 still
 *   5.7 MB. Rate control keeps motion affordable where a fixed quantizer can't.
 * Zoomed clips get more, since the player enlarges them.
 */
export function videoBitrate({
  width,
  height,
  zoomed,
}: {
  width: number;
  height: number;
  zoomed: boolean;
}): number {
  const bitrate =
    width * height * 30 * BITS_PER_PIXEL * (zoomed ? ZOOM_FACTOR : 1);
  return Math.round(Math.min(bitrate, MAX_BITRATE));
}

/**
 * Duration of a segment's last frame in the exported video. Tab capture sends no frames
 * while the screen is still, so the last frame may start well before the segment ends; it
 * has to stay on screen until then, or the video ends before its last step does.
 */
export function lastFrameDuration({
  timestamp,
  duration,
  end,
}: {
  timestamp: number;
  duration: number;
  end: number;
}): number {
  return Math.max(duration, end - timestamp);
}
