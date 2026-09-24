import type { Hotspot } from "@rustrak/openshowcase-schema";
import { describe, expect, it } from "vitest";
import type {
  EditableStep,
  PhotoData,
  VideoData,
} from "../../../lib/editable-step";
import * as StepEditor from "../../step-editor";

function photoStep(
  id: string,
  overrides: Partial<Omit<PhotoData, "kind">> = {},
): EditableStep {
  return {
    id,
    data: { kind: "photo", sourceTime: 1, ...overrides },
  };
}

function videoStep(
  id: string,
  overrides: Partial<Omit<VideoData, "kind">> = {},
): EditableStep {
  return {
    id,
    data: {
      kind: "video",
      trimStart: 0,
      trimEnd: 2,
      playbackRate: 1,
      ...overrides,
    },
  };
}

describe("patchStep", () => {
  it("applies the patch only to the step with the given id", () => {
    const steps = [photoStep("a"), photoStep("b")];
    const result = StepEditor.patchStep(steps, "b", (s) => ({
      ...s,
      id: "b-patched",
    }));
    expect(result.map((s) => s.id)).toEqual(["a", "b-patched"]);
  });
});

describe("patchPhoto", () => {
  it("merges partial photo data onto the matching step", () => {
    const steps = [photoStep("a", { sourceTime: 1 })];
    const result = StepEditor.patchPhoto(steps, "a", { sourceTime: 5 });
    expect(result[0]?.data).toMatchObject({ kind: "photo", sourceTime: 5 });
  });

  it("leaves a video step untouched even if its id matches", () => {
    const steps = [videoStep("a")];
    const result = StepEditor.patchPhoto(steps, "a", { sourceTime: 5 });
    expect(result[0]?.data).toEqual(steps[0]?.data);
  });
});

describe("patchVideo", () => {
  it("merges partial video data onto the matching step", () => {
    const steps = [videoStep("a", { trimStart: 0, trimEnd: 2 })];
    const result = StepEditor.patchVideo(steps, "a", { trimEnd: 4 });
    expect(result[0]?.data).toMatchObject({ trimStart: 0, trimEnd: 4 });
  });

  it("leaves a photo step untouched even if its id matches", () => {
    const steps = [photoStep("a")];
    const result = StepEditor.patchVideo(steps, "a", { trimEnd: 4 });
    expect(result[0]?.data).toEqual(steps[0]?.data);
  });
});

describe("moveStep", () => {
  it("swaps a step with its next neighbor when moving forward", () => {
    const steps = [photoStep("a"), photoStep("b"), photoStep("c")];
    const result = StepEditor.moveStep(steps, "a", 1);
    expect(result.map((s) => s.id)).toEqual(["b", "a", "c"]);
  });

  it("swaps a step with its previous neighbor when moving backward", () => {
    const steps = [photoStep("a"), photoStep("b"), photoStep("c")];
    const result = StepEditor.moveStep(steps, "c", -1);
    expect(result.map((s) => s.id)).toEqual(["a", "c", "b"]);
  });

  it("returns the same array when moving the first step backward", () => {
    const steps = [photoStep("a"), photoStep("b")];
    expect(StepEditor.moveStep(steps, "a", -1)).toBe(steps);
  });

  it("returns the same array when moving the last step forward", () => {
    const steps = [photoStep("a"), photoStep("b")];
    expect(StepEditor.moveStep(steps, "b", 1)).toBe(steps);
  });
});

describe("duplicateStep", () => {
  it("inserts a copy right after the original with a newly created id", () => {
    const steps = [photoStep("a"), photoStep("b")];
    const result = StepEditor.duplicateStep(steps, "a", () => "a-copy");
    expect(result.steps.map((s) => s.id)).toEqual(["a", "a-copy", "b"]);
    expect(result.newStepId).toBe("a-copy");
    expect(result.steps[1]?.data).toEqual(steps[0]?.data);
  });

  it("does nothing when the id does not exist", () => {
    const steps = [photoStep("a")];
    const result = StepEditor.duplicateStep(steps, "missing", () => "new-id");
    expect(result.steps).toBe(steps);
    expect(result.newStepId).toBeUndefined();
  });
});

describe("removeStep", () => {
  it("removes the step with the given id and reports its original index", () => {
    const steps = [photoStep("a"), photoStep("b"), photoStep("c")];
    const result = StepEditor.removeStep(steps, "b");
    expect(result.steps.map((s) => s.id)).toEqual(["a", "c"]);
    expect(result.removedIndex).toBe(1);
  });
});

describe("convertToVideo", () => {
  it("converts a photo step into a video clip window around the source time", () => {
    const steps = [photoStep("a", { sourceTime: 10 })];
    const result = StepEditor.convertToVideo(steps, "a", 20);
    expect(result[0]?.data).toEqual({
      kind: "video",
      trimStart: 7,
      trimEnd: 11,
      playbackRate: 1,
    });
  });

  it("clamps trimStart to 0 near the beginning of the recording", () => {
    const steps = [photoStep("a", { sourceTime: 1 })];
    const result = StepEditor.convertToVideo(steps, "a", 20);
    expect(result[0]?.data).toMatchObject({ trimStart: 0 });
  });

  it("returns the same array when the id does not exist or isn't a photo", () => {
    const steps = [videoStep("a")];
    expect(StepEditor.convertToVideo(steps, "a", 20)).toBe(steps);
    expect(StepEditor.convertToVideo(steps, "missing", 20)).toBe(steps);
  });
});

describe("splitVideo", () => {
  it("splits a video step in two at the given time, selecting the second half", () => {
    const steps = [
      videoStep("a", { trimStart: 0, trimEnd: 10, playbackRate: 2 }),
    ];
    let nextId = 0;
    const result = StepEditor.splitVideo(
      steps,
      "a",
      4,
      () => `part-${++nextId}`,
    );

    expect(result).toBeDefined();
    expect(result?.steps.map((s) => s.data)).toEqual([
      { kind: "video", trimStart: 0, trimEnd: 4, playbackRate: 2 },
      { kind: "video", trimStart: 4, trimEnd: 10, playbackRate: 2 },
    ]);
    expect(result?.steps.map((s) => s.id)).toEqual(["part-1", "part-2"]);
    expect(result?.selectedId).toBe("part-2");
  });

  it("returns undefined when the id does not exist or isn't a video", () => {
    const steps = [photoStep("a")];
    expect(StepEditor.splitVideo(steps, "a", 1, () => "x")).toBeUndefined();
    expect(
      StepEditor.splitVideo(steps, "missing", 1, () => "x"),
    ).toBeUndefined();
  });
});

describe("applyExtractedPhoto", () => {
  it("replaces the step's data with photo data from the extracted frame", () => {
    const steps = [videoStep("a")];
    const result = StepEditor.applyExtractedPhoto(
      steps,
      "a",
      5,
      new Blob(),
      "blob:frame",
    );
    expect(result[0]?.data).toEqual({
      kind: "photo",
      sourceTime: 5,
      imageBlob: expect.any(Blob),
      imageUrl: "blob:frame",
      hotspot: undefined,
      panZoom: undefined,
    });
  });
});

describe("applyHotspotStyleToAll", () => {
  const reference: Hotspot = {
    x: 0.9,
    y: 0.9,
    bgColor: "#000000",
    textColor: "#111111",
    position: "left",
  };

  it("copies bgColor/textColor/position onto every photo step that already has a hotspot", () => {
    const steps = [
      photoStep("a", {
        hotspot: {
          x: 0.1,
          y: 0.2,
          label: "Click",
          bgColor: "#fff",
          textColor: "#000",
          position: "top",
        },
      }),
    ];
    const result = StepEditor.applyHotspotStyleToAll(steps, reference);
    expect(result[0]?.data).toMatchObject({
      hotspot: {
        x: 0.1,
        y: 0.2,
        label: "Click",
        bgColor: "#000000",
        textColor: "#111111",
        position: "left",
      },
    });
  });

  it("leaves photo steps without a hotspot and video steps untouched", () => {
    const steps = [photoStep("a"), videoStep("b")];
    const result = StepEditor.applyHotspotStyleToAll(steps, reference);
    expect(result).toEqual(steps);
  });
});

describe("moveStepTo", () => {
  it("moves a step to an arbitrary index, shifting the rest", () => {
    const steps = [
      photoStep("a"),
      photoStep("b"),
      photoStep("c"),
      photoStep("d"),
    ];
    const ids = (s: EditableStep[]) => s.map((step) => step.id);
    expect(ids(StepEditor.moveStepTo(steps, "a", 2))).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(ids(StepEditor.moveStepTo(steps, "d", 0))).toEqual([
      "d",
      "a",
      "b",
      "c",
    ]);
  });

  it("returns the same array for an unknown id or an out-of-range index", () => {
    const steps = [photoStep("a"), photoStep("b")];
    expect(StepEditor.moveStepTo(steps, "zz", 0)).toBe(steps);
    expect(StepEditor.moveStepTo(steps, "a", 5)).toBe(steps);
  });
});

describe("defaultPanZoom", () => {
  it("frames the focus point (the hotspot) at a moderate zoom", () => {
    expect(StepEditor.defaultPanZoom({ x: 0.5, y: 0.4 })).toEqual({
      x: 0.5,
      y: 0.4,
      scale: 1.8,
    });
  });

  it("keeps the frame inside the image when the focus is near an edge", () => {
    const pz = StepEditor.defaultPanZoom({ x: 0.02, y: 0.99 });
    const half = 0.5 / pz.scale;
    expect(pz.x).toBeCloseTo(half);
    expect(pz.y).toBeCloseTo(1 - half);
  });

  it("centers on the image when there is no focus point", () => {
    expect(StepEditor.defaultPanZoom(undefined)).toMatchObject({
      x: 0.5,
      y: 0.5,
    });
  });
});

describe("insertStepAfter", () => {
  it("inserts the new step right after the given one", () => {
    const steps = [photoStep("a"), videoStep("b"), photoStep("c")];
    const result = StepEditor.insertStepAfter(steps, "b", photoStep("new"));
    expect(result.map((s) => s.id)).toEqual(["a", "b", "new", "c"]);
  });

  it("appends at the end when the reference step is unknown", () => {
    const steps = [photoStep("a")];
    const result = StepEditor.insertStepAfter(steps, "zz", photoStep("new"));
    expect(result.map((s) => s.id)).toEqual(["a", "new"]);
  });
});
