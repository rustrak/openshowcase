import type { Step } from "@rustrak/openshowcase-schema";
import { describe, expect, it } from "vitest";
import { planVideoClips, SEGMENT_GAP_SEC } from "../../video-clips";

const image = { src: "f.webp", width: 100, height: 100 };
const photo = (id: string): Step => ({ id, type: "photo", image });
const clip = (
  id: string,
  startTime: number,
  endTime: number,
  extra: Partial<Extract<Step, { type: "video" }>> = {},
): Step => ({ id, type: "video", startTime, endTime, ...extra });

describe("planVideoClips", () => {
  it("returns undefined for a demo without video steps", () => {
    expect(planVideoClips([photo("a"), photo("b")])).toBeUndefined();
  });

  it("keeps only the played ranges and retimes the steps onto them", () => {
    const plan = planVideoClips([
      clip("v1", 1.25, 4),
      photo("p1"),
      clip("v2", 5.5, 8.25),
      clip("v3", 8.25, 10.5),
    ]);

    expect(plan?.segments).toEqual([
      { start: 1.25, end: 4, outStart: 0, zoomed: false },
      {
        start: 5.5,
        end: 10.5,
        outStart: 2.75 + SEGMENT_GAP_SEC,
        zoomed: false,
      },
    ]);
    expect(plan?.durationSec).toBeCloseTo(2.75 + SEGMENT_GAP_SEC + 5);
    expect(plan?.steps).toEqual([
      clip("v1", 0, 2.75),
      photo("p1"),
      clip("v2", 2.85, 5.6),
      clip("v3", 5.6, 7.85),
    ]);
  });

  it("keeps back-to-back clips contiguous and separates the rest", () => {
    const plan = planVideoClips([clip("a", 0, 2), clip("b", 6, 7)]);
    const [a, b] = plan?.steps ?? [];
    if (a?.type !== "video" || b?.type !== "video") throw new Error("video");
    // The player treats clips under 0.05s apart as one continuous take.
    expect(b.startTime - a.endTime).toBeGreaterThan(0.05);
  });

  it("merges overlapping ranges instead of shipping them twice", () => {
    const plan = planVideoClips([clip("a", 2, 5), clip("b", 3, 6)]);
    expect(plan?.segments).toEqual([
      { start: 2, end: 6, outStart: 0, zoomed: false },
    ]);
    expect(plan?.steps).toEqual([clip("a", 0, 3), clip("b", 1, 4)]);
  });

  it("orders segments by recording time, whatever the step order", () => {
    const plan = planVideoClips([clip("late", 8, 9), clip("early", 1, 2)]);
    expect(plan?.segments.map((s) => s.start)).toEqual([1, 8]);
    expect(plan?.steps).toEqual([
      clip("late", 1 + SEGMENT_GAP_SEC, 2 + SEGMENT_GAP_SEC),
      clip("early", 0, 1),
    ]);
  });

  it("marks a segment zoomed when any of its steps zooms in", () => {
    const plan = planVideoClips([
      clip("a", 0, 1),
      clip("b", 1, 2, { panZoom: { x: 0.5, y: 0.5, scale: 2 } }),
      clip("c", 5, 6, { panZoom: { x: 0.5, y: 0.5, scale: 1 } }),
    ]);
    expect(plan?.segments.map((s) => s.zoomed)).toEqual([true, false]);
  });

  it("keeps the other fields of a video step", () => {
    const plan = planVideoClips([
      clip("a", 3, 4, {
        playbackRate: 2,
        panZoom: { x: 0.2, y: 0.3, scale: 1.5 },
      }),
    ]);
    expect(plan?.steps[0]).toEqual(
      clip("a", 0, 1, {
        playbackRate: 2,
        panZoom: { x: 0.2, y: 0.3, scale: 1.5 },
      }),
    );
  });
});
