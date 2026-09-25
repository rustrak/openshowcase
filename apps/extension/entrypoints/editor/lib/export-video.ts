import type { InputVideoTrack, Quality, VideoCodec } from "mediabunny";
import type { ClipSegment } from "../core/video-clips";

type Mediabunny = typeof import("mediabunny");

interface EncoderChoice {
  codec: Extract<VideoCodec, "avc" | "vp9">;
  container: "mp4" | "webm";
  hardwareAcceleration: "prefer-hardware" | "prefer-software";
  /** Quantizers (lower = better), or undefined for bitrate-based rate control. */
  quantizer?: { base: number; zoomed: number };
}

/**
 * Tried in order. H.264 in MP4 is the only format every browser plays (VP9 needs iOS 17.4+).
 * Measured on a 3000×1790@60 UI recording (VMAF against the recording, ~97 is its ceiling):
 * - hardware H.264 (VideoToolbox on macOS) is the only H.264 encoder with quantizer rate
 *   control: QP 22 → VMAF 96.3 at ~1/4 of the recording's bitrate, QP 18 → 96.7 for +22% size.
 *   Zoomed ranges get the finer one because the player enlarges them.
 * - software H.264 (OpenH264) only does bitrate control: 8 Mbps → VMAF 95.1, same size.
 * - software VP9 (always available) at QP 30 → VMAF 96.7, but ~30% bigger than H.264.
 */
const ENCODER_CHOICES: EncoderChoice[] = [
  {
    codec: "avc",
    container: "mp4",
    hardwareAcceleration: "prefer-hardware",
    quantizer: { base: 22, zoomed: 18 },
  },
  { codec: "avc", container: "mp4", hardwareAcceleration: "prefer-software" },
  {
    codec: "vp9",
    container: "webm",
    hardwareAcceleration: "prefer-software",
    quantizer: { base: 30, zoomed: 26 },
  },
];

/**
 * Bitrate for choices without a quantizer: ~0.05 bits per pixel per frame at 30fps (8 Mbps at
 * 3000×1790). Static UI stretches cost far less, so it's a ceiling for motion, not an average.
 */
const bitsPerSecond = (width: number, height: number) =>
  Math.round(Math.min(width * height * 30 * 0.05, 12_000_000));

/**
 * Re-encodes the recording into a video holding only `segments`, each placed at its
 * `outStart` and opening on a key frame so the player's seek to a step lands instantly.
 * Throws when no encoder works; the caller then ships the recording as is.
 */
export async function encodeVideoClips(
  recording: Blob,
  segments: ClipSegment[],
): Promise<Blob> {
  const mb = await import("mediabunny");
  const input = new mb.Input({
    source: new mb.BlobSource(recording),
    formats: mb.ALL_FORMATS,
  });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("The recording has no video track");
    // H.264 only takes even dimensions; a 2x capture always has them, a resized tab may not
    const width = track.displayWidth & ~1;
    const height = track.displayHeight & ~1;

    for (const choice of ENCODER_CHOICES) {
      const quality = choice.quantizer
        ? new mb.Quality({ quantizer: choice.quantizer.base })
        : new mb.Quality({ bitrate: bitsPerSecond(width, height) });
      const supported = await mb.canEncodeVideo(choice.codec, {
        width,
        height,
        quality,
        hardwareAcceleration: choice.hardwareAcceleration,
        contentHint: "text",
      });
      if (!supported) continue;
      try {
        return await encodeWith(mb, track, segments, choice, quality, {
          width,
          height,
        });
      } catch (error) {
        console.warn(
          `[openshowcase:export] ${choice.codec} (${choice.hardwareAcceleration}) failed`,
          error,
        );
      }
    }
    throw new Error("No video encoder available");
  } finally {
    input.dispose();
  }
}

async function encodeWith(
  mb: Mediabunny,
  track: InputVideoTrack,
  segments: ClipSegment[],
  choice: EncoderChoice,
  quality: Quality,
  size: { width: number; height: number },
): Promise<Blob> {
  const target = new mb.BufferTarget();
  const output = new mb.Output({
    format:
      choice.container === "mp4"
        ? new mb.Mp4OutputFormat({ fastStart: "in-memory" })
        : new mb.WebMOutputFormat(),
    target,
  });
  const source = new mb.VideoSampleSource({
    codec: choice.codec,
    quality,
    hardwareAcceleration: choice.hardwareAcceleration,
    contentHint: "text",
    latencyMode: "quality",
    keyFrameInterval: 2,
    transform:
      size.width !== track.displayWidth || size.height !== track.displayHeight
        ? { ...size, fit: "cover" }
        : undefined,
  });
  output.addVideoTrack(source);
  await output.start();

  const sink = new mb.VideoSampleSink(track);
  try {
    for (const segment of segments) {
      const quantizer = choice.quantizer
        ? segment.zoomed
          ? choice.quantizer.zoomed
          : choice.quantizer.base
        : undefined;
      let first = true;
      for await (const sample of sink.samples(segment.start, segment.end)) {
        try {
          // The first sample may have started before the range (it's the frame on screen at
          // `start`): pin it to the segment start.
          sample.setTimestamp(
            Math.max(sample.timestamp, segment.start) -
              segment.start +
              segment.outStart,
          );
          await source.add(sample, {
            // Only force it: an explicit `false` would also cancel the periodic key frames
            ...(first && { keyFrame: true }),
            ...(quantizer !== undefined && {
              [choice.codec]: { quantizer },
            }),
          });
        } finally {
          sample.close();
        }
        first = false;
      }
    }
    await output.finalize();
  } catch (error) {
    await output.cancel();
    throw error;
  }

  if (!target.buffer) throw new Error("The encoder produced no output");
  return new Blob([target.buffer], {
    type: choice.container === "mp4" ? "video/mp4" : "video/webm",
  });
}
