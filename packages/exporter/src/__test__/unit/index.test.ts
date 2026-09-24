import type { Demo, PhotoStep, VideoStep } from "@rustrak/openshowcase-schema";
import JSZip from "jszip";
import { expect, it } from "vitest";
import { buildDemoBundle } from "../../index";

async function readStepsJson(zip: JSZip): Promise<Demo> {
  const file = zip.file("steps.json");
  if (!file) throw new Error("steps.json not found in bundle");
  return JSON.parse(await file.async("string"));
}

function photoStep(overrides: Partial<PhotoStep> = {}): PhotoStep {
  return {
    id: "step-1",
    type: "photo",
    image: { src: "original.png", width: 100, height: 100 },
    ...overrides,
  };
}

function videoStep(overrides: Partial<VideoStep> = {}): VideoStep {
  return {
    id: "step-2",
    type: "video",
    startTime: 1,
    endTime: 3,
    ...overrides,
  };
}

function webpBlob(content = "fake-webp-bytes"): Blob {
  return new Blob([content], { type: "image/webp" });
}

function baseDemo(overrides: Partial<Demo> = {}): Demo {
  return {
    id: "demo-1",
    title: "Test demo",
    theme: { wrapper: "browser", autoplay: true, appearance: "light" },
    steps: [],
    ...overrides,
  };
}

it("throws when a photo step has no corresponding entry in imageBlobs", async () => {
  const demo = baseDemo({ steps: [photoStep()] });
  await expect(
    buildDemoBundle({ demo, imageBlobs: new Map() }),
  ).rejects.toThrow(/step-1/);
});

it("bundles a photo-only demo with the image rewritten to assets/step-1.webp", async () => {
  const demo = baseDemo({ steps: [photoStep()] });
  const bundle = await buildDemoBundle({
    demo,
    imageBlobs: new Map([["step-1", webpBlob()]]),
  });

  const zip = await JSZip.loadAsync(bundle);
  expect(Object.keys(zip.files).sort()).toEqual([
    "assets/",
    "assets/step-1.webp",
    "steps.json",
  ]);

  const stepsJson = await readStepsJson(zip);
  expect(stepsJson.steps).toEqual([
    {
      ...photoStep(),
      image: { src: "assets/step-1.webp", width: 100, height: 100 },
    },
  ]);
});

it("clears the video field when no videoBlob is provided, even if the demo had one", async () => {
  const demo = baseDemo({
    video: { src: "original.webm", width: 1280, height: 720, durationSec: 10 },
    steps: [videoStep()],
  });
  const bundle = await buildDemoBundle({ demo, imageBlobs: new Map() });

  const zip = await JSZip.loadAsync(bundle);
  expect(Object.keys(zip.files)).not.toContain("assets/recording.webm");

  const stepsJson = await readStepsJson(zip);
  expect(stepsJson.video).toBeUndefined();
});

it("includes assets/recording.webm and rewrites video.src when a videoBlob is provided", async () => {
  const demo = baseDemo({
    video: { src: "original.webm", width: 1280, height: 720, durationSec: 10 },
    steps: [videoStep()],
  });
  const bundle = await buildDemoBundle({
    demo,
    videoBlob: new Blob(["fake-webm-bytes"], { type: "video/webm" }),
    imageBlobs: new Map(),
  });

  const zip = await JSZip.loadAsync(bundle);
  expect(Object.keys(zip.files)).toContain("assets/recording.webm");

  const stepsJson = await readStepsJson(zip);
  expect(stepsJson.video).toEqual({
    src: "assets/recording.webm",
    width: 1280,
    height: 720,
    durationSec: 10,
  });
});

it("passes video steps through unchanged when mixed with photo steps", async () => {
  const demo = baseDemo({
    steps: [
      videoStep(),
      photoStep(),
      videoStep({ id: "step-3", startTime: 3, endTime: 5 }),
    ],
  });
  const bundle = await buildDemoBundle({
    demo,
    imageBlobs: new Map([["step-1", webpBlob()]]),
  });

  const zip = await JSZip.loadAsync(bundle);
  const stepsJson = await readStepsJson(zip);

  expect(stepsJson.steps[0]).toEqual(videoStep());
  expect(stepsJson.steps[2]).toEqual(
    videoStep({ id: "step-3", startTime: 3, endTime: 5 }),
  );
});
