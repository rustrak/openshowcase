/** Bits per pixel per frame at 30fps. Static UI costs far less: this budgets motion. */
const BITS_PER_PIXEL = 0.12;
const ZOOM_FACTOR = 1.5;
const MAX_BITRATE = 30_000_000;

/**
 * Constant-quality quantizer (like FFmpeg's CRF) of the exported video, on each codec's own
 * scale (H.264 0–51, VP9 0–63). Constant quality keeps every frame equally sharp: static UI
 * costs almost nothing and motion gets the bits it needs. A bitrate target instead smeared
 * scrolls and transitions next to sharp still frames, a visible quality pumping. H.264 at 22
 * measured VMAF ~97 against the recording on a scrolling GitHub page (the worst case).
 * Zoomed clips get a lower one, since the player enlarges them.
 */
export function videoQuantizer({
  codec,
  zoomed,
}: {
  codec: "avc" | "vp9";
  zoomed: boolean;
}): number {
  const base = codec === "avc" ? 22 : 30;
  return zoomed ? base - 3 : base;
}

/**
 * Fallback target bitrate (VBR) for encoders without quantizer support. Kept high (~19 Mbps
 * for a 2x capture, near the recording master) so motion doesn't visibly degrade.
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
