import { describe, expect, it } from "vitest";
import { computeVideoBitrate, pickMimeType } from "../../recording-settings";

describe("pickMimeType", () => {
  it("prefers vp9 when the encoder supports it", () => {
    const mimeType = pickMimeType((type) => type === "video/webm;codecs=vp9");
    expect(mimeType).toBe("video/webm;codecs=vp9");
  });

  it("falls back to vp8 when vp9 is not supported", () => {
    const mimeType = pickMimeType((type) => type === "video/webm;codecs=vp8");
    expect(mimeType).toBe("video/webm;codecs=vp8");
  });

  it("falls back to plain webm when neither vp9 nor vp8 is supported", () => {
    const mimeType = pickMimeType(() => false);
    expect(mimeType).toBe("video/webm");
  });
});

describe("computeVideoBitrate", () => {
  it("computes a lower bitrate for vp9 than vp8 at the same dimensions", () => {
    const params = { tabWidth: 800, tabHeight: 600, scale: 2 };
    const vp9 = computeVideoBitrate({
      ...params,
      mimeType: "video/webm;codecs=vp9",
    });
    const vp8 = computeVideoBitrate({
      ...params,
      mimeType: "video/webm;codecs=vp8",
    });

    expect(vp9).toBe(3_168_000);
    expect(vp8).toBe(5_760_000);
  });

  it("never goes below the 3 Mbps floor for tiny dimensions", () => {
    const bitrate = computeVideoBitrate({
      tabWidth: 100,
      tabHeight: 100,
      scale: 1,
      mimeType: "video/webm;codecs=vp8",
    });
    expect(bitrate).toBe(3_000_000);
  });

  it("never exceeds vp9's 9 Mbps ceiling for huge dimensions", () => {
    const bitrate = computeVideoBitrate({
      tabWidth: 4000,
      tabHeight: 3000,
      scale: 2,
      mimeType: "video/webm;codecs=vp9",
    });
    expect(bitrate).toBe(9_000_000);
  });

  it("spends more bits at 60fps than at 30fps — but not double: consecutive frames are more alike", () => {
    const params = {
      tabWidth: 1440,
      tabHeight: 900,
      scale: 2,
      mimeType: "video/webm;codecs=vp9",
    };
    const at30 = computeVideoBitrate({ ...params, fps: 30 });
    const at60 = computeVideoBitrate({ ...params, fps: 60 });
    expect(at60).toBeGreaterThan(at30 * 1.4);
    expect(at60).toBeLessThan(at30 * 2);
  });

  it("raises the ceiling with the frame rate too, so 60fps retina isn't starved", () => {
    const bitrate = computeVideoBitrate({
      tabWidth: 4000,
      tabHeight: 3000,
      scale: 2,
      mimeType: "video/webm;codecs=vp9",
      fps: 60,
    });
    expect(bitrate).toBeGreaterThan(9_000_000);
    expect(bitrate).toBeLessThanOrEqual(16_000_000);
  });
});
