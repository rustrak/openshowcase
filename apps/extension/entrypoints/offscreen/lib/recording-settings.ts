// VP9 first: at equal perceived sharpness, it compresses noticeably better than VP8. VP8 is
// the fallback for browsers/Chromium builds without a VP9 encoder available.
const PREFERRED_MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export function pickMimeType(isSupported: (type: string) => boolean): string {
  return PREFERRED_MIME_TYPES.find(isSupported) ?? "video/webm";
}

/**
 * Capture frame rate. 60, not 30: a 30fps recording of the mouse cursor (which Chrome burns
 * into tab captures) and of scrolling looks visibly jerky next to a 60/120Hz display. Measured:
 * Chrome's encoders keep up with 2880×1800@60 without dropping frames.
 */
export const RECORDING_FPS = 60;

export interface VideoBitrateParams {
  tabWidth: number;
  tabHeight: number;
  scale: number;
  mimeType: string;
  /** Defaults to 30 (the rates below were tuned at 30fps). */
  fps?: number;
}

// Chrome's default MediaRecorder bitrate falls short for retina screen captures (lots of
// sharp text/UI), producing a blurry video. VP9 needs a noticeably lower bitrate than VP8 to
// look equally sharp, so we aim lower with VP9 — same visual result, lighter file. Higher frame
// rates need more bits, but sub-linearly (consecutive frames are more alike): ×(fps/30)^0.75.
export function computeVideoBitrate({
  tabWidth,
  tabHeight,
  scale,
  mimeType,
  fps = 30,
}: VideoBitrateParams): number {
  const pixelsPerFrame = tabWidth * scale * tabHeight * scale;
  const isVp9 = mimeType.includes("vp9");
  const bitsPerPixelPerFrame = isVp9 ? 0.055 : 0.1;
  const fpsFactor = (fps / 30) ** 0.75;
  const ceiling = (isVp9 ? 9_000_000 : 14_000_000) * fpsFactor;
  return Math.round(
    Math.min(
      Math.max(
        pixelsPerFrame * 30 * bitsPerPixelPerFrame * fpsFactor,
        3_000_000,
      ),
      ceiling,
    ),
  );
}
