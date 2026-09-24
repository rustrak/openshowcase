import type { VideoStep } from "@rustrak/openshowcase-schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  continuesInto,
  isContiguousPlayback,
  startVideoStep,
  whenAtTime,
} from "../../core/video-step";

function stubAnimationFrame() {
  let pending: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    pending = cb;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    pending = undefined;
  });
  return { tick: (time: number) => pending?.(time) };
}

function createVideo(
  overrides: Partial<{
    currentTime: number;
    paused: boolean;
    playbackRate: number;
  }> = {},
) {
  return {
    currentTime: 0,
    paused: false,
    playbackRate: 1,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    ...overrides,
  };
}

const baseStep: VideoStep = {
  id: "s1",
  type: "video",
  startTime: 0,
  endTime: 10,
};

describe("isContiguousPlayback", () => {
  it("is contiguous when the previous step is the one right before and the video is already near startTime", () => {
    expect(isContiguousPlayback(0, 1, 5.01, 5)).toBe(true);
  });

  it("is not contiguous when the previous index is not adjacent", () => {
    expect(isContiguousPlayback(0, 2, 5, 5)).toBe(false);
  });

  it("is not contiguous when the video time drifted away from startTime", () => {
    expect(isContiguousPlayback(0, 1, 6, 5)).toBe(false);
  });
});

describe("startVideoStep", () => {
  let raf: ReturnType<typeof stubAnimationFrame>;

  beforeEach(() => {
    raf = stubAnimationFrame();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("seeks to startTime and plays when not contiguous", () => {
    const video = createVideo({ currentTime: 3 });
    startVideoStep(video as never, baseStep, false, {
      onProgress: vi.fn(),
      onZoomOut: vi.fn(),
      onEnded: vi.fn(),
    });

    expect(video.currentTime).toBe(baseStep.startTime);
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it("doesn't leak an unhandled rejection when a pause() interrupts play()", async () => {
    const onUnhandled = vi.fn();
    process.on("unhandledRejection", onUnhandled);
    try {
      // a plain function, not vi.fn(): a mock attaches its own handler to the promise it
      // returns (for settledResults), which would hide the leak this test is about
      const video = {
        ...createVideo(),
        play: () =>
          Promise.reject(new DOMException("interrupted", "AbortError")),
      };
      startVideoStep(video as never, baseStep, false, {
        onProgress: vi.fn(),
        onZoomOut: vi.fn(),
        onEnded: vi.fn(),
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onUnhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("does not seek when contiguous", () => {
    const video = createVideo({ currentTime: 3 });
    startVideoStep(video as never, baseStep, true, {
      onProgress: vi.fn(),
      onZoomOut: vi.fn(),
      onEnded: vi.fn(),
    });

    expect(video.currentTime).toBe(3);
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it("applies the step playbackRate, defaulting to 1", () => {
    const video = createVideo();
    startVideoStep(video as never, { ...baseStep, playbackRate: 2 }, false, {
      onProgress: vi.fn(),
      onZoomOut: vi.fn(),
      onEnded: vi.fn(),
    });

    expect(video.playbackRate).toBe(2);
  });

  it("wires up the clip watcher — progress reporting reaches the caller", () => {
    const video = createVideo({ currentTime: 5 });
    const onProgress = vi.fn();
    startVideoStep(video as never, baseStep, true, {
      onProgress,
      onZoomOut: vi.fn(),
      onEnded: vi.fn(),
    });

    raf.tick(0);

    expect(onProgress).toHaveBeenCalledWith(0.5);
  });

  it("returns a handle that cancels the underlying watcher", () => {
    const video = createVideo();
    const handle = startVideoStep(video as never, baseStep, true, {
      onProgress: vi.fn(),
      onZoomOut: vi.fn(),
      onEnded: vi.fn(),
    });

    expect(() => handle.cancel()).not.toThrow();
  });

  it("fires onZoomOut using the step's own panZoom duration as the lead time, not a fixed default", () => {
    // 2000ms duration + the 50ms safety margin = 2.05s lead — well past the old fixed 0.55s.
    const video = createVideo({ currentTime: 7.96 }); // 2.04s remaining
    const onZoomOut = vi.fn();
    startVideoStep(
      video as never,
      { ...baseStep, panZoom: { x: 0.5, y: 0.5, scale: 2, duration: 2000 } },
      true,
      { onProgress: vi.fn(), onZoomOut, onEnded: vi.fn() },
    );

    raf.tick(0);

    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it("does not fire onZoomOut when the step has no panZoom", () => {
    const video = createVideo({ currentTime: 9.99 });
    const onZoomOut = vi.fn();
    startVideoStep(video as never, baseStep, true, {
      onProgress: vi.fn(),
      onZoomOut,
      onEnded: vi.fn(),
    });

    raf.tick(0);

    expect(onZoomOut).not.toHaveBeenCalled();
  });
});

describe("continuesInto", () => {
  const clip = (startTime: number, endTime: number) =>
    ({ id: "v", type: "video", startTime, endTime }) as const;

  it("is true when the next step is a clip starting where this one ends", () => {
    expect(continuesInto(clip(0, 2), clip(2, 5))).toBe(true);
  });

  it("is false across a gap, before a photo step, or at the end of the demo", () => {
    expect(continuesInto(clip(0, 2), clip(3, 5))).toBe(false);
    expect(
      continuesInto(clip(0, 2), {
        id: "p",
        type: "photo",
        image: { src: "a.webp", width: 1, height: 1 },
      }),
    ).toBe(false);
    expect(continuesInto(clip(0, 2), undefined)).toBe(false);
  });
});

describe("whenAtTime", () => {
  function fakeVideo(currentTime: number, seeking = false) {
    const listeners: Record<string, (() => void)[]> = {};
    return {
      currentTime,
      seeking,
      addEventListener: (type: string, cb: () => void) => {
        listeners[type] = [...(listeners[type] ?? []), cb];
      },
      removeEventListener: () => {},
      fire: (type: string) => {
        for (const cb of listeners[type] ?? []) cb();
      },
    };
  }

  it("resolves at once when the video already shows that time", async () => {
    const video = fakeVideo(2.001);
    await expect(whenAtTime(video, 2)).resolves.toBeUndefined();
  });

  it("seeks and waits for 'seeked' before resolving", async () => {
    vi.useFakeTimers();
    const video = fakeVideo(0);
    let resolved = false;
    const promise = whenAtTime(video, 5).then(() => {
      resolved = true;
    });
    expect(video.currentTime).toBe(5);
    await Promise.resolve();
    expect(resolved).toBe(false);
    video.fire("seeked");
    await promise;
    expect(resolved).toBe(true);
    vi.useRealTimers();
  });

  it("never blocks the demo: gives up waiting after a short timeout", async () => {
    vi.useFakeTimers();
    const video = fakeVideo(0);
    const promise = whenAtTime(video, 5);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
