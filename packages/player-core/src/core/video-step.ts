import {
  defaultPanZoomTiming,
  type Step,
  type VideoStep,
} from "@rustrak/openshowcase-schema";
import { playVideo } from "./play-video";
import {
  type VideoClipWatcherHandle,
  watchVideoClip,
} from "./video-clip-watcher";

const CONTIGUOUS_THRESHOLD_SEC = 0.05;
// Buffer added on top of the zoom's own transition duration, so the zoom-out finishes
// (rather than being cut off by the clip end) even accounting for frame-scheduling slack.
const ZOOM_OUT_SAFETY_MARGIN_SEC = 0.05;

/** Whether playback can keep rolling from where it already is, instead of seeking to `startTime`. */
export function isContiguousPlayback(
  previousIndex: number,
  currentIndex: number,
  videoCurrentTime: number,
  stepStartTime: number,
): boolean {
  return (
    previousIndex === currentIndex - 1 &&
    Math.abs(videoCurrentTime - stepStartTime) < CONTIGUOUS_THRESHOLD_SEC
  );
}

/**
 * Whether `next` picks up exactly where `step` ends (the recording is cut into contiguous
 * clips, e.g. real-speed reaction → fast-forwarded idle). Then the video must not pause at
 * the cut — it just keeps rolling into the next clip.
 */
export function continuesInto(
  step: VideoStep,
  next: Step | undefined,
): boolean {
  return (
    next?.type === "video" &&
    Math.abs(next.startTime - step.endTime) < CONTIGUOUS_THRESHOLD_SEC
  );
}

export interface VideoStepCallbacks {
  onProgress: (progress: number) => void;
  onZoomOut: () => void;
  onEnded: () => void;
}

/**
 * Whether a zoomed clip hands its framing over to `next` instead of zooming out before its
 * end: a zoomed step moves on to its own zoom straight from the clip's framing (a photo via
 * `applyInheritedZoom`, a clip because the video layer just keeps its transform), so easing
 * out first would only make the camera bounce.
 */
export function handsZoomTo(next: Step | undefined): boolean {
  return next?.panZoom != null;
}

/** Seeks (unless contiguous), starts playback, and wires up the clip watcher for a video step. */
export function startVideoStep(
  video: HTMLVideoElement,
  step: VideoStep,
  wasContiguous: boolean,
  callbacks: VideoStepCallbacks,
  next?: Step,
): VideoClipWatcherHandle {
  video.playbackRate = step.playbackRate ?? 1;
  if (!wasContiguous) video.currentTime = step.startTime;
  void playVideo(video);

  const zoomOutLeadSec =
    step.panZoom && !handsZoomTo(next)
      ? (step.panZoom.duration ?? defaultPanZoomTiming.duration) / 1000 +
        ZOOM_OUT_SAFETY_MARGIN_SEC
      : undefined;

  return watchVideoClip(
    video,
    {
      startTime: step.startTime,
      endTime: step.endTime,
      zoomOutLeadSec,
      continuesIntoNext: continuesInto(step, next),
    },
    {
      onProgress: callbacks.onProgress,
      onZoomOut: callbacks.onZoomOut,
      onClipEnd: callbacks.onEnded,
    },
  );
}

/** Longest the player waits for a seek before showing the video anyway. */
const MAX_SEEK_WAIT_MS = 400;

export interface SeekableVideo {
  currentTime: number;
  seeking: boolean;
  addEventListener(
    type: "seeked",
    listener: () => void,
    options?: { once?: boolean },
  ): void;
  removeEventListener(type: "seeked", listener: () => void): void;
}

/**
 * Resolves once the video is actually showing `time` — seeking there if needed. The photo that
 * precedes a clip is its first frame, so keeping the photo up until this resolves makes the
 * photo→video swap invisible instead of flashing whatever frame the video was left on.
 */
export function whenAtTime(video: SeekableVideo, time: number): Promise<void> {
  const there = Math.abs(video.currentTime - time) < CONTIGUOUS_THRESHOLD_SEC;
  if (there && !video.seeking) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", done);
      resolve();
    };
    const timer = setTimeout(done, MAX_SEEK_WAIT_MS);
    video.addEventListener("seeked", done, { once: true });
    if (!there) video.currentTime = time;
  });
}
