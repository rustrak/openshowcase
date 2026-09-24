export interface VideoLike {
  currentTime: number;
  paused: boolean;
  playbackRate: number;
  pause(): void;
}

export interface VideoClipWatcherClip {
  startTime: number;
  endTime: number;
  /** Seconds before `endTime` to fire the zoom-out cue, so its transition finishes before the
   * cut — sized by the caller from the zoom's own (possibly custom) duration. `undefined` means
   * this clip has no pan&zoom effect to ease out of. */
  zoomOutLeadSec?: number;
  /** The next step is a clip starting exactly where this one ends: don't pause at the cut,
   * just hand over — playback rolls on seamlessly (only the speed/zoom may change). */
  continuesIntoNext?: boolean;
}

export interface VideoClipWatcherCallbacks {
  /** Playback progress within the clip, 0-1, clamped. */
  onProgress: (progress: number) => void;
  /** Fires once, shortly before the clip ends, so the zoom-out transition finishes before the cut. */
  onZoomOut: () => void;
  /** Fires once the clip has reached its cut (paused on its last frame, unless it continues). */
  onClipEnd: () => void;
}

export interface VideoClipWatcherHandle {
  cancel: () => void;
}

/** One screen refresh at 60Hz — how often this watcher gets to check the video. */
const REFRESH_SEC = 1 / 60;

/**
 * Watches a video clip frame-by-frame (rAF, not 'timeupdate' — that only fires every ~250ms
 * and the video would overshoot the cut point). Reports playback progress, fires the
 * zoom-out cue shortly before the clip ends, and stops the clip at its cut.
 *
 * It stops at the last screen refresh before the cut: once less video remains than one refresh
 * plays (`playbackRate / 60` s), the next check would already be past it. It pauses right
 * there — without seeking, which would decode again and flash a later frame first. The
 * overshoot/undershoot is bounded by that one refresh; at real speed that's under the one
 * frame of margin the step planner leaves before each click, so the photo that follows (the
 * frame before the press) matches what was on screen. Clips that end on a photo are planned
 * at real speed for exactly this reason.
 */
export function watchVideoClip(
  video: VideoLike,
  clip: VideoClipWatcherClip,
  callbacks: VideoClipWatcherCallbacks,
  scheduleFrame: (cb: () => void) => number = requestAnimationFrame,
  cancelFrame: (id: number) => void = cancelAnimationFrame,
): VideoClipWatcherHandle {
  let frameId: number | undefined;
  let zoomOutFired = false;

  const tick = () => {
    const duration = clip.endTime - clip.startTime;
    const progress =
      duration > 0 ? (video.currentTime - clip.startTime) / duration : 0;
    callbacks.onProgress(Math.min(1, Math.max(0, progress)));

    if (
      clip.zoomOutLeadSec != null &&
      !zoomOutFired &&
      clip.endTime - video.currentTime <= clip.zoomOutLeadSec
    ) {
      zoomOutFired = true;
      callbacks.onZoomOut();
    }

    // in video time: how much of the clip is left vs. how much one refresh plays
    const remaining = clip.endTime - video.currentTime;
    const perRefresh = REFRESH_SEC * (video.playbackRate || 1);
    if (!video.paused && remaining <= perRefresh) {
      if (!clip.continuesIntoNext) video.pause();
      frameId = undefined;
      callbacks.onClipEnd();
      return;
    }

    frameId = scheduleFrame(tick);
  };

  frameId = scheduleFrame(tick);

  return {
    cancel: () => {
      if (frameId != null) cancelFrame(frameId);
      frameId = undefined;
    },
  };
}
