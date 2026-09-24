import { describe, expect, it } from "vitest";
import type { MarkerRecord } from "@/lib/db";
import type { StepPlan } from "@/lib/segments";
import {
  autoTooltipLabel,
  type EditableStep,
  newStepId,
  stepsFromPlan,
  toSchemaStep,
} from "../../editable-step";

function marker(overrides: Partial<MarkerRecord> = {}): MarkerRecord {
  return {
    id: "marker-1",
    recordingId: "rec-1",
    kind: "click",
    capturedAt: 1000,
    pageUrl: "https://example.com",
    ...overrides,
  };
}

describe("autoTooltipLabel", () => {
  it("quotes the clicked element's visible text when present", () => {
    expect(autoTooltipLabel(marker({ elementText: "Sign up" }))).toBe(
      "Click “Sign up”",
    );
  });

  it("falls back to a generic label when there is no element text", () => {
    expect(autoTooltipLabel(marker({ elementText: undefined }))).toBe(
      "Click here",
    );
  });
});

describe("stepsFromPlan", () => {
  it("gives a photo step a hotspot when the marker has a click position", () => {
    const plan: StepPlan[] = [
      {
        kind: "photo",
        time: 1.2,
        marker: marker({ xFrac: 0.5, yFrac: 0.4, elementText: "Sign up" }),
      },
    ];

    const [step] = stepsFromPlan(plan);

    expect(step?.data).toEqual({
      kind: "photo",
      sourceTime: 1.2,
      hotspot: {
        x: 0.5,
        y: 0.4,
        label: "Click “Sign up”",
        // Rustrak lime by default, near-black text on it — same identity as the editor UI
        bgColor: "#C5F11E",
        textColor: "#0C0C0C",
        position: "auto",
      },
    });
  });

  it("gives a photo step no hotspot when the marker has no click position", () => {
    const plan: StepPlan[] = [
      {
        kind: "photo",
        time: 1.2,
        marker: marker({ xFrac: undefined, yFrac: undefined }),
      },
    ];

    const [step] = stepsFromPlan(plan);

    expect(step?.data).toEqual({
      kind: "photo",
      sourceTime: 1.2,
      hotspot: undefined,
    });
  });

  it("maps a video item to trimStart/trimEnd with playbackRate 1", () => {
    const plan: StepPlan[] = [
      { kind: "video", startTime: 0, endTime: 3, playbackRate: 1 },
    ];

    const [step] = stepsFromPlan(plan);

    expect(step?.data).toEqual({
      kind: "video",
      trimStart: 0,
      trimEnd: 3,
      playbackRate: 1,
    });
  });

  it("gives every step a unique id", () => {
    const plan: StepPlan[] = [
      { kind: "video", startTime: 0, endTime: 1, playbackRate: 1 },
      { kind: "video", startTime: 1, endTime: 2, playbackRate: 1 },
      { kind: "video", startTime: 2, endTime: 3, playbackRate: 1 },
    ];

    const ids = stepsFromPlan(plan).map((step) => step.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the plan's playback speed (fast-forwarded idle stretches)", () => {
    const [step] = stepsFromPlan([
      { kind: "video", startTime: 2, endTime: 9, playbackRate: 6 },
    ]);
    expect(step?.data).toMatchObject({ kind: "video", playbackRate: 6 });
  });
});

describe("toSchemaStep", () => {
  it("converts a photo step, filling in the given image size", () => {
    const step: EditableStep = {
      id: "step-1",
      data: {
        kind: "photo",
        sourceTime: 1.2,
        imageUrl: "blob:frame",
        hotspot: { x: 0.5, y: 0.4 },
      },
    };

    expect(toSchemaStep(step, { width: 800, height: 600 })).toEqual({
      id: "step-1",
      type: "photo",
      image: { src: "blob:frame", width: 800, height: 600 },
      hotspot: { x: 0.5, y: 0.4 },
      panZoom: undefined,
    });
  });

  it("defaults a photo step's image src to an empty string when no frame was extracted yet", () => {
    const step: EditableStep = {
      id: "step-1",
      data: { kind: "photo", sourceTime: 1.2 },
    };

    const result = toSchemaStep(step, { width: 800, height: 600 });
    if (result.type !== "photo") throw new Error("expected a photo step");
    expect(result.image).toEqual({ src: "", width: 800, height: 600 });
  });

  it("omits playbackRate for a video step when it is the default (1)", () => {
    const step: EditableStep = {
      id: "step-2",
      data: { kind: "video", trimStart: 0, trimEnd: 3, playbackRate: 1 },
    };

    expect(toSchemaStep(step, { width: 800, height: 600 })).toEqual({
      id: "step-2",
      type: "video",
      startTime: 0,
      endTime: 3,
      playbackRate: undefined,
      panZoom: undefined,
    });
  });

  it("keeps a non-default playbackRate for a video step", () => {
    const step: EditableStep = {
      id: "step-2",
      data: { kind: "video", trimStart: 0, trimEnd: 3, playbackRate: 1.5 },
    };

    const result = toSchemaStep(step, { width: 800, height: 600 });
    if (result.type !== "video") throw new Error("expected a video step");
    expect(result.playbackRate).toBe(1.5);
  });
});

describe("newStepId", () => {
  it("returns a different id on every call", () => {
    const first = newStepId();
    const second = newStepId();
    expect(first).not.toBe(second);
  });
});
