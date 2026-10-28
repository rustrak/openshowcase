import type {
  InputVideoTrack,
  Quality,
  VideoCodec,
  VideoSample,
} from "mediabunny";
import type { ClipSegment } from "../core/video-clips";
import {
  lastFrameDuration,
  videoBitrate,
  videoQuantizer,
} from "../core/video-encoding";

type Mediabunny = typeof import("mediabunny");

interface EncoderChoice {
  codec: Extract<VideoCodec, "avc" | "vp9">;
  container: "mp4" | "webm";
  hardwareAcceleration: "prefer-hardware" | "prefer-software";
}

/**
 * Tried in order, all at constant quality (see `core/video-encoding.ts`). H.264 in MP4
 * is the only format every browser plays (VP9 needs iOS 17.4+). Software first: Chrome's
 * OpenH264 honors `contentHint: "text"` (screen-content mode) and, on a scrolling text page,
 * came out 3x smaller than macOS's hardware encoder at the same quality.
 */
const ENCODER_CHOICES: EncoderChoice[] = [
  { codec: "avc", container: "mp4", hardwareAcceleration: "prefer-software" },
  { codec: "avc", container: "mp4", hardwareAcceleration: "prefer-hardware" },
  { codec: "vp9", container: "webm", hardwareAcceleration: "prefer-software" },
];

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

    const zoomed = segments.some((segment) => segment.zoomed);
    const bitrate = videoBitrate({ width, height, zoomed });
    for (const choice of ENCODER_CHOICES) {
      const quality = new mb.Quality({
        quantizer: videoQuantizer({ codec: choice.codec, zoomed }),
        bitrate,
      });
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
      const end = segment.outStart + segment.end - segment.start;
      // Held back one frame, to know which one is the segment's last
      let held: VideoSample | undefined;
      let first = true;
      const add = async (sample: VideoSample) => {
        try {
          // Only force it: an explicit `false` would also cancel the periodic key frames
          await source.add(sample, first ? { keyFrame: true } : undefined);
        } finally {
          sample.close();
        }
        first = false;
      };
      try {
        for await (const sample of sink.samples(segment.start, segment.end)) {
          // The first sample may have started before the range (it's the frame on screen
          // at `start`): pin it to the segment start.
          sample.setTimestamp(
            Math.max(sample.timestamp, segment.start) -
              segment.start +
              segment.outStart,
          );
          if (held) await add(held);
          held = sample;
        }
      } catch (error) {
        held?.close();
        throw error;
      }
      if (held) {
        held.setDuration(
          lastFrameDuration({
            timestamp: held.timestamp,
            duration: held.duration,
            end,
          }),
        );
        await add(held);
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
