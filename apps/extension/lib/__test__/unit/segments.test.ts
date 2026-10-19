import { describe, expect, it } from "vitest";
import type { MarkerRecord } from "@/lib/db";
import { buildStepPlan, FRAME_SEC, type StepPlan } from "@/lib/segments";

function clickMarker(
  capturedAt: number,
  overrides: Partial<MarkerRecord> = {},
): MarkerRecord {
  return {
    id: `marker-${capturedAt}`,
    recordingId: "rec-1",
    kind: "click",
    capturedAt,
    pageUrl: "https://example.com",
    ...overrides,
  };
}

function activityMarker(
  kind: "scroll" | "type" | "drag",
  capturedAt: number,
): MarkerRecord {
  return {
    id: `activity-${capturedAt}`,
    recordingId: "rec-1",
    kind,
    capturedAt,
    pageUrl: "https://example.com",
  };
}

/** Start/end of every step on the recording timeline (a photo is a single instant). */
function spans(plan: StepPlan[]): [number, number][] {
  return plan.map((step) =>
    step.kind === "photo"
      ? [step.time, step.time]
      : [step.startTime, step.endTime],
  );
}

/** The whole timeline is covered with no gaps and no overlaps: each step starts where the previous ended. */
function expectContiguous(plan: StepPlan[], duration: number) {
  const s = spans(plan);
  expect(s[0]?.[0]).toBeCloseTo(0, 3);
  expect(s.at(-1)?.[1]).toBeCloseTo(duration, 3);
  for (let i = 1; i < s.length; i++) {
    expect(s[i]?.[0]).toBeCloseTo(s[i - 1]?.[1] ?? Number.NaN, 3);
  }
}

describe("buildStepPlan", () => {
  it("photographs the last frame before the press, and the next clip starts on that same frame", () => {
    const plan = buildStepPlan([clickMarker(2000)], 5, 0);
    const photo = plan.find((s) => s.kind === "photo");
    expect(photo?.kind === "photo" && photo.time).toBeCloseTo(2 - FRAME_SEC, 3);

    const afterPhoto = plan[plan.indexOf(photo as StepPlan) + 1];
    expect(afterPhoto?.kind === "video" && afterPhoto.startTime).toBeCloseTo(
      2 - FRAME_SEC,
      3,
    );
  });

  it("skips a click too close to the previous one, keeping only one photo", () => {
    const plan = buildStepPlan([clickMarker(1000), clickMarker(1010)], 3, 0);
    expect(plan.filter((s) => s.kind === "photo")).toHaveLength(1);
    expectContiguous(plan, 3);
  });

  it("produces the whole recording as video when there are no clicks", () => {
    const plan = buildStepPlan([activityMarker("scroll", 1500)], 4, 0);
    expect(plan.every((s) => s.kind === "video")).toBe(true);
    expectContiguous(plan, 4);
  });

  it("still produces exactly one video when there are no markers and the recording is short", () => {
    expect(buildStepPlan([], 0.4, 0)).toEqual([
      { kind: "video", startTime: 0, endTime: 0.4, playbackRate: 1 },
    ]);
  });

  it("goes straight from one photo to the next when the clicks are quick and nothing happens in between", () => {
    const plan = buildStepPlan([clickMarker(1000), clickMarker(2500)], 5, 0);
    const kinds = plan.map((s) => s.kind);
    // lead-in, photo, photo, tail — no clip between the two clicks (the hotspot glides instead)
    expect(kinds).toEqual(["video", "photo", "photo", "video"]);
  });

  it("keeps a clip between two clicks when there was activity (scroll, typing, drag)", () => {
    const plan = buildStepPlan(
      [clickMarker(1000), activityMarker("scroll", 1800), clickMarker(2500)],
      5,
      0,
    );
    expect(plan.map((s) => s.kind)).toEqual([
      "video",
      "photo",
      "video",
      "photo",
      "video",
    ]);
  });

  it("keeps a clip between two clicks 3s or more apart even without activity", () => {
    const plan = buildStepPlan([clickMarker(1000), clickMarker(4500)], 8, 0);
    expect(plan.map((s) => s.kind)).toEqual([
      "video",
      "photo",
      "video",
      "photo",
      "video",
    ]);
  });

  it("a kept clip starts exactly on the previous photo's frame, so that cut has no jump", () => {
    const plan = buildStepPlan([clickMarker(1000), clickMarker(4500)], 8, 0);
    const [, photo, clip] = plan;
    expect(photo?.kind === "photo" && clip?.kind === "video").toBe(true);
    if (photo?.kind !== "photo" || clip?.kind !== "video") return;
    expect(clip.startTime).toBeCloseTo(photo.time, 3);
  });

  it("drops a stretch too short to be worth a clip", () => {
    const plan = buildStepPlan([clickMarker(300)], 5, 0);
    // the 0.27s before the first click isn't worth a clip
    expect(plan[0]?.kind).toBe("photo");
  });
});

describe("buildStepPlan with a recording's direction (recorder CLI)", () => {
  const noDirection = { cuts: [], zooms: [] };

  it("plays a click marked hotspot: false inside a clip instead of stopping on it", () => {
    const plan = buildStepPlan(
      [
        clickMarker(1000),
        clickMarker(1800, { hotspot: false }),
        clickMarker(2500),
      ],
      5,
      0,
      noDirection,
    );
    // the quiet click is activity: the stretch around it stays a clip
    expect(plan.map((s) => s.kind)).toEqual([
      "video",
      "photo",
      "video",
      "photo",
      "video",
    ]);
  });

  it("cuts the waits out of the clips, as jump cuts", () => {
    const plan = buildStepPlan([clickMarker(1000)], 8, 0, {
      cuts: [{ start: 3000, end: 6000 }],
      zooms: [],
    });
    expect(spans(plan)).toEqual([
      [0, 0.967],
      [0.967, 0.967],
      [0.967, 3],
      [6, 8],
    ]);
  });

  it("drops what's left of a clip when a cut leaves too little of it", () => {
    const plan = buildStepPlan([clickMarker(1000)], 4, 0, {
      cuts: [{ start: 1300, end: 4000 }],
      zooms: [],
    });
    expect(plan.map((s) => s.kind)).toEqual(["video", "photo"]);
  });

  it("doesn't keep a clip for a long gap that is mostly a wait", () => {
    const plan = buildStepPlan([clickMarker(1000), clickMarker(5000)], 8, 0, {
      cuts: [{ start: 1500, end: 4500 }],
      zooms: [],
    });
    expect(plan.map((s) => s.kind)).toEqual([
      "video",
      "photo",
      "photo",
      "video",
    ]);
  });

  it("frames a clip on the action the flow zoomed into", () => {
    const plan = buildStepPlan(
      [clickMarker(1000), activityMarker("type", 2000)],
      5,
      0,
      {
        cuts: [],
        zooms: [{ start: 1500, end: 2500, x: 0.3, y: 0.6, scale: 2 }],
      },
    );
    // The camera moves in a little before the action and out a little after it: the clip
    // splits there, into contiguous pieces that play straight through.
    expect(
      plan.map((s) =>
        s.kind === "video"
          ? [s.startTime, s.endTime, s.zoom?.scale ?? null]
          : "photo",
      ),
    ).toEqual([[0, 0.967, null], "photo", [0.967, 3, 2], [3, 5, null]]);
  });

  it("keeps a zoomed clip whole when what's left around the action is too short", () => {
    const plan = buildStepPlan([clickMarker(1000)], 3.2, 0, {
      cuts: [],
      zooms: [{ start: 1500, end: 2500, x: 0.3, y: 0.6, scale: 2 }],
    });
    expect(plan.at(-1)).toMatchObject({
      startTime: 0.967,
      endTime: 3.2,
      zoom: { scale: 2 },
    });
  });
});
