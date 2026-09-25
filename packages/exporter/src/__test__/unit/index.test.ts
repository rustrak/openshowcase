import type { Demo, PhotoStep, VideoStep } from "@rustrak/openshowcase-schema";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
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

it("names the video after its type", async () => {
  const demo = baseDemo({
    video: { src: "original.webm", width: 1280, height: 720, durationSec: 10 },
    steps: [videoStep()],
  });
  const bundle = await buildDemoBundle({
    demo,
    videoBlob: new Blob(["fake-mp4-bytes"], { type: "video/mp4" }),
    imageBlobs: new Map(),
  });

  const zip = await JSZip.loadAsync(bundle);
  expect(Object.keys(zip.files)).toContain("assets/recording.mp4");
  expect((await readStepsJson(zip)).video?.src).toBe("assets/recording.mp4");
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

// The bundle doubles as the single-file `.openshowcase` format, which the player reads front
// to back while it downloads (player-core's core/stored-zip.ts): these tests pin that layout.
describe("streamable layout", () => {
  const demo = baseDemo({
    video: { src: "original.webm", width: 1280, height: 720, durationSec: 10 },
    steps: [
      photoStep({ id: "p1" }),
      videoStep({ id: "v1" }),
      photoStep({ id: "p2" }),
    ],
  });
  const build = () =>
    buildDemoBundle({
      demo,
      videoBlob: new Blob(["fake-mp4-bytes"], { type: "video/mp4" }),
      imageBlobs: new Map([
        ["p1", webpBlob("one")],
        ["p2", webpBlob("two")],
      ]),
    });

  it("puts steps.json first, then each asset where a step first uses it", async () => {
    const zip = await JSZip.loadAsync(await build());
    expect(Object.keys(zip.files)).toEqual([
      "steps.json",
      "assets/step-1.webp",
      "assets/recording.mp4",
      "assets/step-2.webp",
    ]);
  });

  it("puts the video first when the demo opens with a video step", async () => {
    const zip = await JSZip.loadAsync(
      await buildDemoBundle({
        demo: baseDemo({
          video: { src: "o.webm", width: 1280, height: 720, durationSec: 10 },
          steps: [videoStep({ id: "v1" }), photoStep({ id: "p1" })],
        }),
        videoBlob: new Blob(["fake-mp4-bytes"], { type: "video/mp4" }),
        imageBlobs: new Map([["p1", webpBlob()]]),
      }),
    );
    expect(Object.keys(zip.files)).toEqual([
      "steps.json",
      "assets/recording.mp4",
      "assets/step-1.webp",
    ]);
  });

  it("stores every file uncompressed with its size up front", async () => {
    const bytes = new DataView(await (await build()).arrayBuffer());
    let offset = 0;
    const names: string[] = [];
    while (bytes.getUint32(offset, true) === 0x04034b50) {
      const flags = bytes.getUint16(offset + 6, true);
      const method = bytes.getUint16(offset + 8, true);
      const size = bytes.getUint32(offset + 18, true);
      const nameLength = bytes.getUint16(offset + 26, true);
      const extraLength = bytes.getUint16(offset + 28, true);
      names.push(
        new TextDecoder().decode(
          new Uint8Array(bytes.buffer, offset + 30, nameLength),
        ),
      );
      expect(method).toBe(0);
      expect(flags & 0x08).toBe(0);
      offset += 30 + nameLength + extraLength + size;
    }
    expect(names[0]).toBe("steps.json");
    expect(names).toHaveLength(4);
  });
});
