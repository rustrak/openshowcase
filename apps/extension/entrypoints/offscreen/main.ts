import { saveRecordingBlob } from "@/lib/db";
import { onMessage, sendMessage } from "@/lib/messaging";
import { frameCaptureWallMs } from "./lib/recording-clock";
import {
  computeVideoBitrate,
  pickMimeType,
  RECORDING_FPS,
} from "./lib/recording-settings";
import { remuxForSeeking } from "./lib/remux";

let mediaRecorder: MediaRecorder | undefined;
let mediaStream: MediaStream | undefined;
let chunks: BlobPart[] = [];
let activeRecordingId: string | undefined;
let sendFallbackStartedAt: (() => void) | undefined;

async function startRecording(
  streamId: string,
  recordingId: string,
  tabWidth: number,
  tabHeight: number,
): Promise<void> {
  activeRecordingId = recordingId;
  chunks = [];

  // max with the SAME aspect ratio as the tab (2x for retina sharpness): Chrome scales
  // the source within the limit without letterboxing. Without these max, tabCapture uses
  // its default size and records black bars. min* can throw OverconstrainedError — don't use it.
  const scale = 2;
  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
        maxWidth: tabWidth * scale,
        maxHeight: tabHeight * scale,
        maxFrameRate: RECORDING_FPS,
      },
    },
  } as unknown as MediaStreamConstraints;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error("[openshowcase:offscreen] getUserMedia failed", error);
    throw error;
  }

  const mimeType = pickMimeType((type) => MediaRecorder.isTypeSupported(type));
  const videoBitsPerSecond = computeVideoBitrate({
    tabWidth,
    tabHeight,
    scale,
    mimeType,
    fps: RECORDING_FPS,
  });
  mediaRecorder = new MediaRecorder(mediaStream, {
    mimeType,
    videoBitsPerSecond,
    // A keyframe every second: seeks (frame extraction, trims, the player's cuts) only ever
    // decode ≤1s forward instead of from the start of a long static stretch.
    videoKeyFrameIntervalDuration: 1000,
  } as MediaRecorderOptions);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  // t=0 of the recording is the first frame the recorder receives after start() (measured:
  // exact). Clicks are mapped onto the video by subtracting that frame's CAPTURE time, on the
  // wall clock the content script stamps events with (Date.now() — see lib/press-timing.ts).
  // tabCapture only emits frames when the tab repaints, so on a static page that frame can
  // arrive seconds after start(); it's read from a clone of the track as it comes in.
  let startedSent = false;
  const sendStartedAt = (startedAt: number) => {
    if (startedSent) return;
    startedSent = true;
    sendMessage("recordingStarted", { recordingId, startedAt }).catch(() => {});
  };

  const probeTrack = mediaStream.getVideoTracks()[0]?.clone();
  const reader = probeTrack
    ? new MediaStreamTrackProcessor({ track: probeTrack }).readable.getReader()
    : undefined;

  const startCallAt = Date.now();
  mediaRecorder.start(1000);
  // No frame at all (empty recording): anchor at the start() call as a last resort.
  sendFallbackStartedAt = () => sendStartedAt(startCallAt);

  void (async () => {
    if (!reader) return;
    while (!startedSent) {
      const { value: frame, done } = await reader.read();
      if (done || !frame) break;
      const arrivalWallMs = Date.now();
      const arrivalPerfMs = performance.now();
      const frameTimestampUs = frame.timestamp;
      frame.close();
      if (arrivalWallMs >= startCallAt)
        sendStartedAt(
          frameCaptureWallMs({
            arrivalWallMs,
            arrivalPerfMs,
            frameTimestampUs,
          }),
        );
    }
    reader.cancel().catch(() => {});
    probeTrack?.stop();
  })();
}

async function stopRecording(recordingId: string): Promise<void> {
  if (!mediaRecorder || activeRecordingId !== recordingId) return;

  const recorder = mediaRecorder;
  const stream = mediaStream;
  const mimeType = recorder.mimeType;

  await new Promise<void>((resolve) => {
    recorder.addEventListener("stop", () => resolve(), { once: true });
    recorder.stop();
  });

  // No frame ever arrived after start() (empty recording, broken capture): anchor as a last resort.
  sendFallbackStartedAt?.();
  sendFallbackStartedAt = undefined;

  stream?.getTracks().forEach((track) => {
    track.stop();
  });

  const blob = await remuxForSeeking(new Blob(chunks, { type: mimeType }));
  const { durationSec, width, height } = await readVideoMeta(blob);
  await saveRecordingBlob(recordingId, blob, mimeType, {
    durationSec,
    width,
    height,
  });

  sendMessage("recordingSaved", {
    recordingId,
    durationSec,
    width,
    height,
  }).catch(() => {});

  mediaRecorder = undefined;
  mediaStream = undefined;
  activeRecordingId = undefined;
  chunks = [];
}

function readVideoMeta(
  blob: Blob,
): Promise<{ durationSec: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(blob);

    const finish = () => {
      const meta = {
        durationSec: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      URL.revokeObjectURL(video.src);
      resolve(meta);
    };

    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration)) {
        finish();
        return;
      }
      // Chrome doesn't compute the real duration of a MediaRecorder webm until it
      // seeks near the end of the file.
      video.currentTime = Number.MAX_SAFE_INTEGER;
      video.ontimeupdate = () => {
        video.ontimeupdate = null;
        video.currentTime = 0;
        finish();
      };
    };
    video.onerror = () =>
      reject(new Error("Could not read recorded video metadata"));
  });
}

onMessage("offscreenStart", ({ data }) => {
  return startRecording(
    data.streamId,
    data.recordingId,
    data.tabWidth,
    data.tabHeight,
  );
});

onMessage("offscreenStop", ({ data }) => {
  return stopRecording(data.recordingId);
});
