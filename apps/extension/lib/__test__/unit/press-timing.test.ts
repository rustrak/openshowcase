import { describe, expect, it } from "vitest";
import { eventEpochMs, pressTimeForClick } from "@/lib/press-timing";

describe("eventEpochMs", () => {
  it("is the wall-clock time the event happened: now, minus how long ago it was", () => {
    // the event fired 120ms before this handler ran
    expect(eventEpochMs({ timeStamp: 880 }, 1_700_000_000_000, 1000)).toBe(
      1_700_000_000_000 - 120,
    );
  });

  it("doesn't depend on performance.timeOrigin, which drifts in long-lived tabs", () => {
    // performance.now() stops while the machine sleeps, so timeOrigin + performance.now()
    // in a tab opened hours ago lags the real clock by minutes; only the *difference*
    // between two monotonic readings in the same context is trustworthy
    const a = eventEpochMs(
      { timeStamp: 10_000_000 - 50 },
      1_700_000_000_000,
      10_000_000,
    );
    const b = eventEpochMs({ timeStamp: 50 - 50 }, 1_700_000_000_000, 50);
    expect(a).toBe(b);
  });
});

describe("pressTimeForClick", () => {
  it("times a click by its press (pointerdown), not by the release that fires 'click'", () => {
    expect(pressTimeForClick({ at: 1000 }, 1120)).toBe(1000);
  });

  it("falls back to the click time when there was no press (keyboard-activated click)", () => {
    expect(pressTimeForClick(undefined, 1120)).toBe(1120);
  });

  it("ignores a stale press that belongs to an earlier gesture", () => {
    expect(pressTimeForClick({ at: 1000 }, 5000)).toBe(5000);
  });
});
