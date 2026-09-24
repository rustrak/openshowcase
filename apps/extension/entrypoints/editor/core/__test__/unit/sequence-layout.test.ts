import { describe, expect, it } from "vitest";
import {
  BLOCK_GAP,
  blockWidth,
  fitPxPerSec,
  MIN_CLIP_WIDTH,
  nearestFrame,
  PHOTO_BLOCK_WIDTH,
  tileTimes,
  trimEdge,
} from "../../sequence-layout";

describe("blockWidth", () => {
  it("gives photo steps a fixed width regardless of zoom", () => {
    expect(blockWidth({ kind: "photo" }, 10)).toBe(PHOTO_BLOCK_WIDTH);
    expect(blockWidth({ kind: "photo" }, 300)).toBe(PHOTO_BLOCK_WIDTH);
  });

  it("sizes video clips by their source duration, never below the minimum", () => {
    expect(blockWidth({ kind: "video", seconds: 4 }, 50)).toBe(200);
    expect(blockWidth({ kind: "video", seconds: 0.2 }, 50)).toBe(
      MIN_CLIP_WIDTH,
    );
  });
});

describe("fitPxPerSec", () => {
  it("picks the zoom at which every block exactly fills the available width", () => {
    const items = [
      { kind: "photo" },
      { kind: "video", seconds: 4 },
      { kind: "photo" },
      { kind: "video", seconds: 6 },
    ] as const;
    const pps = fitPxPerSec(items, 1000);
    const total =
      items.reduce((sum, item) => sum + blockWidth(item, pps), 0) +
      BLOCK_GAP * (items.length - 1);
    expect(total).toBeCloseTo(1000);
  });

  it("stays within sane bounds when there is little room or no video", () => {
    expect(fitPxPerSec([{ kind: "video", seconds: 1 }], 100_000)).toBe(400);
    expect(fitPxPerSec([{ kind: "video", seconds: 60 }], 10)).toBe(8);
    expect(fitPxPerSec([{ kind: "photo" }], 1000)).toBe(60);
  });
});

describe("trimEdge", () => {
  const clip = { trimStart: 2, trimEnd: 6 };
  const opts = { duration: 10 };

  it("moves the dragged edge and leaves the other one alone", () => {
    expect(trimEdge(clip, "start", 3, opts)).toEqual({
      trimStart: 3,
      trimEnd: 6,
    });
    expect(trimEdge(clip, "end", 8, opts)).toEqual({
      trimStart: 2,
      trimEnd: 8,
    });
  });

  it("keeps the clip inside the recording and at least 0.2s long", () => {
    expect(trimEdge(clip, "start", -4, opts).trimStart).toBe(0);
    expect(trimEdge(clip, "end", 99, opts).trimEnd).toBe(10);
    expect(trimEdge(clip, "start", 5.95, opts).trimStart).toBeCloseTo(5.8);
    expect(trimEdge(clip, "end", 1, opts).trimEnd).toBeCloseTo(2.2);
  });

  it("snaps to a nearby snap point, but not to a far one", () => {
    const snapping = { duration: 10, snapTo: [4], snapWithin: 0.15 };
    expect(trimEdge(clip, "start", 4.1, snapping).trimStart).toBe(4);
    expect(trimEdge(clip, "start", 4.3, snapping).trimStart).toBe(4.3);
  });
});

describe("nearestFrame", () => {
  const frames = [
    { time: 1, url: "a" },
    { time: 3, url: "b" },
    { time: 5, url: "c" },
  ];

  it("picks the frame closest in time", () => {
    expect(nearestFrame(frames, 3.9)?.url).toBe("b");
    expect(nearestFrame(frames, 4.1)?.url).toBe("c");
    expect(nearestFrame(frames, 99)?.url).toBe("c");
  });

  it("returns undefined while no frames exist yet", () => {
    expect(nearestFrame([], 2)).toBeUndefined();
  });
});

describe("tileTimes", () => {
  it("samples the time under the middle of each filmstrip tile", () => {
    // 3 tiles of 100px over a 250px block at 50px/s starting at t=10
    expect(tileTimes(10, 250, 100, 50)).toEqual([11, 13, 15]);
  });
});
