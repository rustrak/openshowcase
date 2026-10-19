import { buildDemoBundle } from "@rustrak/openshowcase-exporter";
import type { Demo } from "@rustrak/openshowcase-schema";
import { describe, expect, it } from "vitest";
import { inspectBundle } from "../../inspect-bundle";

const demo: Demo = {
  id: "d1",
  title: "Onboarding",
  video: { src: "rec.webm", width: 3000, height: 1790, durationSec: 7.5 },
  theme: { wrapper: "browser", autoplay: true, appearance: "dark" },
  steps: [
    { id: "v1", type: "video", startTime: 0, endTime: 4 },
    {
      id: "p1",
      type: "photo",
      image: { src: "f.png", width: 3000, height: 1790 },
    },
    { id: "v2", type: "video", startTime: 4, endTime: 7.5 },
  ],
};

const avif = (bytes: number) =>
  new Blob([new Uint8Array(bytes)], { type: "image/avif" });

describe("inspectBundle", () => {
  it("describes an exported bundle", async () => {
    const bundle = await buildDemoBundle({
      demo,
      videoBlob: new Blob([new Uint8Array(3000)], { type: "video/mp4" }),
      imageBlobs: new Map([["p1", avif(1000)]]),
    });

    const inspected = await inspectBundle(bundle);

    expect(inspected).toMatchObject({
      ok: true,
      title: "Onboarding",
      photoSteps: 1,
      videoSteps: 2,
      videoSec: 7.5,
      width: 3000,
      height: 1790,
      browserChrome: true,
    });
    if (!inspected.ok) throw new Error("expected a valid bundle");
    expect(inspected.summary.parts.map((p) => [p.kind, p.size])).toEqual([
      ["video", 3000],
      ["photos", 1000],
      ["manifest", expect.any(Number)],
    ]);
  });

  it("explains why a zip from another tool can't be played", async () => {
    const bytes = new Uint8Array(
      await (
        await buildDemoBundle({
          demo: { ...demo, steps: [] },
          imageBlobs: new Map(),
        })
      ).arrayBuffer(),
    );
    // Mark the first entry as deflate-compressed, like a zip made by a desktop tool
    new DataView(bytes.buffer).setUint16(8, 8, true);
    const deflated = new Blob([bytes]);

    expect(await inspectBundle(deflated)).toEqual({
      ok: false,
      error: expect.stringMatching(/re-export the demo/),
    });
  });

  it("rejects a file that isn't a demo", async () => {
    expect(await inspectBundle(new Blob(["<html>"]))).toEqual({
      ok: false,
      error: expect.stringMatching(/not a zip/),
    });
  });
});
