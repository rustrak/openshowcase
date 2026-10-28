import { describe, expect, it } from "vitest";
import {
  lastFrameDuration,
  videoBitrate,
  videoQuantizer,
} from "../../video-encoding";

describe("videoBitrate", () => {
  it("gives a 2x capture of a typical tab about 19 Mbps", () => {
    expect(videoBitrate({ width: 3000, height: 1790, zoomed: false })).toBe(
      19_332_000,
    );
  });

  it("scales with the pixel count", () => {
    const small = videoBitrate({ width: 1500, height: 895, zoomed: false });
    const large = videoBitrate({ width: 3000, height: 1790, zoomed: false });
    expect(large / small).toBeCloseTo(4);
  });

  it("spends 50% more when the player zooms into the video", () => {
    const plain = videoBitrate({ width: 3000, height: 1790, zoomed: false });
    const zoomed = videoBitrate({ width: 3000, height: 1790, zoomed: true });
    expect(zoomed / plain).toBeCloseTo(1.5);
  });

  it("caps huge captures", () => {
    expect(videoBitrate({ width: 7680, height: 4320, zoomed: true })).toBe(
      30_000_000,
    );
  });
});

describe("videoQuantizer", () => {
  it("uses each codec's own scale", () => {
    expect(videoQuantizer({ codec: "avc", zoomed: false })).toBe(22);
    expect(videoQuantizer({ codec: "vp9", zoomed: false })).toBe(30);
  });

  it("raises quality when the player zooms into the video", () => {
    expect(videoQuantizer({ codec: "avc", zoomed: true })).toBeLessThan(
      videoQuantizer({ codec: "avc", zoomed: false }),
    );
  });
});

describe("lastFrameDuration", () => {
  it("stretches a segment's last frame to the segment's end", () => {
    // A static screen sends no new frames: without this the video would end early
    expect(
      lastFrameDuration({ timestamp: 8.5, duration: 0.02, end: 9.5 }),
    ).toBeCloseTo(1);
  });

  it("keeps a frame that already reaches past the end", () => {
    expect(
      lastFrameDuration({ timestamp: 9.49, duration: 0.05, end: 9.5 }),
    ).toBe(0.05);
  });
});
