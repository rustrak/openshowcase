import { describe, expect, it } from "vitest";
import { frameCaptureWallMs } from "../../recording-clock";

describe("frameCaptureWallMs", () => {
  it("is when the frame was captured: its arrival minus how long it took to arrive", () => {
    // arrived at performance.now() = 5000ms; the frame's timestamp says captured at 4988ms
    expect(
      frameCaptureWallMs({
        arrivalWallMs: 1_700_000_000_000,
        arrivalPerfMs: 5000,
        frameTimestampUs: 4_988_000,
      }),
    ).toBe(1_700_000_000_000 - 12);
  });

  it("falls back to the arrival time when the frame timestamp isn't on the performance.now() clock", () => {
    // a timestamp from some other time base gives an absurd latency — don't trust it
    expect(
      frameCaptureWallMs({
        arrivalWallMs: 1_700_000_000_000,
        arrivalPerfMs: 5000,
        frameTimestampUs: 123,
      }),
    ).toBe(1_700_000_000_000);
    expect(
      frameCaptureWallMs({
        arrivalWallMs: 1_700_000_000_000,
        arrivalPerfMs: 5000,
        frameTimestampUs: 9_000_000,
      }),
    ).toBe(1_700_000_000_000);
  });
});
