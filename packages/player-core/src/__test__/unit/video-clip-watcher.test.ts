import { describe, expect, it, vi } from "vitest";
import { type VideoLike, watchVideoClip } from "../../core/video-clip-watcher";

/** Deterministic stand-in for requestAnimationFrame/cancelAnimationFrame: a single pending
 * tick that only runs when the test explicitly asks for it. */
function createManualScheduler() {
  let pending: (() => void) | undefined;
  return {
    schedule: (cb: () => void) => {
      pending = cb;
      return 1;
    },
    cancel: () => {
      pending = undefined;
    },
    tick: () => {
      const cb = pending;
      pending = undefined;
      cb?.();
    },
    hasPending: () => pending != null,
  };
}

function createVideo(overrides: Partial<VideoLike> = {}): VideoLike {
  return {
    currentTime: 0,
    paused: false,
    playbackRate: 1,
    pause: vi.fn(),
    ...overrides,
  };
}

describe("watchVideoClip", () => {
  it("reports clamped 0-1 progress within the clip", () => {
    const video = createVideo({ currentTime: 5 });
    const scheduler = createManualScheduler();
    const onProgress = vi.fn();
    watchVideoClip(
      video,
      { startTime: 0, endTime: 10 },
      { onProgress, onZoomOut: vi.fn(), onClipEnd: vi.fn() },
      scheduler.schedule,
      scheduler.cancel,
    );

    scheduler.tick();

    expect(onProgress).toHaveBeenCalledWith(0.5);
  });

  it("fires onZoomOut once, shortly before the clip ends, at the given lead time", () => {
    const video = createVideo();
    const scheduler = createManualScheduler();
    const onZoomOut = vi.fn();
    watchVideoClip(
      video,
      { startTime: 0, endTime: 10, zoomOutLeadSec: 0.55 },
      { onProgress: vi.fn(), onZoomOut, onClipEnd: vi.fn() },
      scheduler.schedule,
      scheduler.cancel,
    );

    video.currentTime = 9; // 1s remaining, above the 0.55s lead — not yet
    scheduler.tick();
    expect(onZoomOut).not.toHaveBeenCalled();

    video.currentTime = 9.5; // exactly at the 0.55s lead
    scheduler.tick();
    expect(onZoomOut).toHaveBeenCalledTimes(1);

    video.currentTime = 9.8; // still inside the window — must not fire again
    scheduler.tick();
    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it("respects a longer lead time (e.g. a slower cinematic zoom) than the old fixed 0.55s", () => {
    const video = createVideo({ currentTime: 8.6 }); // 1.4s remaining
    const scheduler = createManualScheduler();
    const onZoomOut = vi.fn();
    watchVideoClip(
      video,
      { startTime: 0, endTime: 10, zoomOutLeadSec: 1.5 },
      { onProgress: vi.fn(), onZoomOut, onClipEnd: vi.fn() },
      scheduler.schedule,
      scheduler.cancel,
    );

    scheduler.tick();

    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it("never fires onZoomOut when the clip has no zoom (zoomOutLeadSec unset)", () => {
    const video = createVideo({ currentTime: 9.99 });
    const scheduler = createManualScheduler();
    const onZoomOut = vi.fn();
    watchVideoClip(
      video,
      { startTime: 0, endTime: 10 },
      { onProgress: vi.fn(), onZoomOut, onClipEnd: vi.fn() },
      scheduler.schedule,
      scheduler.cancel,
    );

    scheduler.tick();

    expect(onZoomOut).not.toHaveBeenCalled();
  });

  it("doesn't cut a clip short: keeps playing while more than a display frame of it remains", () => {
    // 25ms of video left at 1x: the next ~16ms screen refresh still shows this clip
    const video = createVideo({ currentTime: 9.975 });
    const scheduler = createManualScheduler();
    const onClipEnd = vi.fn();
    watchVideoClip(
      video,
      { startTime: 0, endTime: 10 },
      { onProgress: vi.fn(), onZoomOut: vi.fn(), onClipEnd },
      scheduler.schedule,
      scheduler.cancel,
    );

    scheduler.tick();

    expect(video.pause).not.toHaveBeenCalled();
    expect(onClipEnd).not.toHaveBeenCalled();
    expect(scheduler.hasPending()).toBe(true);
  });

  it("stops within the last display frame before the cut, pausing without seeking back", () => {
    const video = createVideo({ currentTime: 9.99 });
    const scheduler = createManualScheduler();
    const onClipEnd = vi.fn();
    watchVideoClip(
      video,
      { startTime: 0, endTime: 10 },
      { onProgress: vi.fn(), onZoomOut: vi.fn(), onClipEnd },
      scheduler.schedule,
      scheduler.cancel,
    );

    scheduler.tick();

    expect(video.pause).toHaveBeenCalledTimes(1);
    // no seek: setting currentTime would decode again and flash a later frame first
    expect(video.currentTime).toBe(9.99);
    expect(onClipEnd).toHaveBeenCalledTimes(1);
    // the clip already ended — it must not keep scheduling more frames
    expect(scheduler.hasPending()).toBe(false);
  });

  it("keeps playing straight into the next clip when it continues from the same frame", () => {
    const video = createVideo({ currentTime: 9.99 });
    const scheduler = createManualScheduler();
    const onClipEnd = vi.fn();
    watchVideoClip(
      video,
      { startTime: 0, endTime: 10, continuesIntoNext: true },
      { onProgress: vi.fn(), onZoomOut: vi.fn(), onClipEnd },
      scheduler.schedule,
      scheduler.cancel,
    );

    scheduler.tick();

    expect(video.pause).not.toHaveBeenCalled();
    expect(onClipEnd).toHaveBeenCalledTimes(1);
  });

  it("accounts for playbackRate when deciding how much clip time remains", () => {
    // at 2x speed, 0.03s of video time is only 0.015s of wall-clock remaining — under the cutoff
    const video = createVideo({ currentTime: 9.97, playbackRate: 2 });
    const scheduler = createManualScheduler();
    const onClipEnd = vi.fn();
    watchVideoClip(
      video,
      { startTime: 0, endTime: 10 },
      { onProgress: vi.fn(), onZoomOut: vi.fn(), onClipEnd },
      scheduler.schedule,
      scheduler.cancel,
    );

    scheduler.tick();

    expect(onClipEnd).toHaveBeenCalledTimes(1);
  });

  it("keeps scheduling frames until the clip is near its end", () => {
    const video = createVideo({ currentTime: 0 });
    const scheduler = createManualScheduler();
    watchVideoClip(
      video,
      { startTime: 0, endTime: 10 },
      { onProgress: vi.fn(), onZoomOut: vi.fn(), onClipEnd: vi.fn() },
      scheduler.schedule,
      scheduler.cancel,
    );

    scheduler.tick();

    expect(scheduler.hasPending()).toBe(true);
  });

  it("stops scheduling once cancelled", () => {
    const video = createVideo({ currentTime: 0 });
    const scheduler = createManualScheduler();
    const handle = watchVideoClip(
      video,
      { startTime: 0, endTime: 10 },
      { onProgress: vi.fn(), onZoomOut: vi.fn(), onClipEnd: vi.fn() },
      scheduler.schedule,
      scheduler.cancel,
    );

    scheduler.tick(); // schedules the next frame
    handle.cancel();

    expect(scheduler.hasPending()).toBe(false);
  });

  it("does not pause an already-paused video", () => {
    const video = createVideo({ currentTime: 9.99, paused: true });
    const scheduler = createManualScheduler();
    const onClipEnd = vi.fn();
    watchVideoClip(
      video,
      { startTime: 0, endTime: 10 },
      { onProgress: vi.fn(), onZoomOut: vi.fn(), onClipEnd },
      scheduler.schedule,
      scheduler.cancel,
    );

    scheduler.tick();

    expect(video.pause).not.toHaveBeenCalled();
    expect(onClipEnd).not.toHaveBeenCalled();
    expect(scheduler.hasPending()).toBe(true);
  });
});
