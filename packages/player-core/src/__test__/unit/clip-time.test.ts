import { describe, expect, it } from "vitest";
import { formatClipTime } from "../../core/clip-time";

describe("formatClipTime", () => {
  it("uses tenths of a second for a short clip", () => {
    expect(formatClipTime(1.23, 2.34)).toBe("1.2 / 2.3s");
  });

  it("uses minutes for a clip of a minute or more", () => {
    expect(formatClipTime(12.4, 65.2)).toBe("0:12 / 1:05");
  });

  it("stays within the clip", () => {
    expect(formatClipTime(3, 2)).toBe("2.0 / 2.0s");
    expect(formatClipTime(-1, 2)).toBe("0.0 / 2.0s");
  });
});
