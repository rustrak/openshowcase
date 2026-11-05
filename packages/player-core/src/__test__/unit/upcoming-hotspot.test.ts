import type { Step } from "@rustrak/openshowcase-schema";
import { describe, expect, it } from "vitest";
import { upcomingHotspot } from "../../core/photo-overlay";

const clip = (id: string): Step => ({
  id,
  type: "video",
  startTime: 0,
  endTime: 1,
});
const photo = (id: string, bgColor?: string): Step => ({
  id,
  type: "photo",
  image: { src: "a.png", width: 1, height: 1 },
  ...(bgColor && { hotspot: { x: 0, y: 0, bgColor } }),
});

describe("upcomingHotspot", () => {
  const steps = [
    clip("a"),
    photo("b", "#111"),
    clip("c"),
    photo("d"),
    photo("e", "#222"),
    clip("f"),
  ];

  it("is a photo's own", () => {
    expect(upcomingHotspot(steps, 4)?.bgColor).toBe("#222");
  });

  it("is the next one for a clip or a photo without a hotspot", () => {
    expect(upcomingHotspot(steps, 0)?.bgColor).toBe("#111");
    expect(upcomingHotspot(steps, 2)?.bgColor).toBe("#222");
    expect(upcomingHotspot(steps, 3)?.bgColor).toBe("#222");
  });

  it("is the closest before past the last one", () => {
    expect(upcomingHotspot(steps, 5)?.bgColor).toBe("#222");
  });

  it("is undefined without hotspots", () => {
    expect(upcomingHotspot([clip("a"), photo("b")], 0)).toBeUndefined();
  });
});
