import { describe, expect, it } from "vitest";
import { type Demo, DemoParseError, parseDemo } from "../../index";

function createDemo(): Demo {
  return {
    id: "demo-1",
    title: "Overview",
    video: {
      src: "assets/recording.webm",
      width: 3000,
      height: 1790,
      durationSec: 12.5,
    },
    theme: { wrapper: "browser", autoplay: true, appearance: "light" },
    steps: [
      { id: "step-1", type: "video", startTime: 1.23, endTime: 3.99 },
      {
        id: "step-2",
        type: "photo",
        image: { src: "assets/step-1.webp", width: 3000, height: 1790 },
        hotspot: {
          x: 0.16,
          y: 0.32,
          label: "Click the project",
          bgColor: "#C5F11E",
          textColor: "#0C0C0C",
          position: "auto",
        },
        panZoom: { x: 0.28, y: 0.32, scale: 1.8 },
      },
      {
        id: "step-3",
        type: "video",
        startTime: 4,
        endTime: 9,
        playbackRate: 2,
        panZoom: { x: 0.5, y: 0.5, scale: 1.5, duration: 800, easing: "fast" },
      },
    ],
  };
}

type Mutable = Record<string, unknown> & { steps: Record<string, unknown>[] };

/** A deep copy of the demo, with `edit` applied, as untyped JSON. */
function demoWith(edit: (demo: Mutable) => void): unknown {
  const demo = JSON.parse(JSON.stringify(createDemo())) as Mutable;
  edit(demo);
  return demo;
}

const photo = (demo: Mutable) => demo.steps[1] as Record<string, never>;
const video = (demo: Mutable) => demo.steps[2] as Record<string, unknown>;

describe("parseDemo", () => {
  it("returns a valid demo unchanged", () => {
    expect(parseDemo(createDemo())).toEqual(createDemo());
  });

  it("accepts a demo without a recording and with no steps", () => {
    const demo = demoWith((d) => {
      delete d.video;
      d.steps = [];
    });
    expect(parseDemo(demo)).toEqual(demo);
  });

  it("accepts a hotspot with only its position", () => {
    const demo = demoWith((d) => {
      photo(d).hotspot = { x: 0, y: 1 } as never;
    });
    expect(parseDemo(demo)).toEqual(demo);
  });

  it("drops unknown keys", () => {
    const demo = demoWith((d) => {
      d.extra = 1;
      photo(d).junk = true as never;
    });
    expect(parseDemo(demo)).toEqual(createDemo());
  });

  it.each<[string, (d: Mutable) => void]>([
    ["a missing title", (d) => delete d.title],
    ["a numeric id", (d) => (d.id = 1)],
    ["a missing theme", (d) => delete d.theme],
    [
      "an unknown wrapper",
      (d) => (d.theme = { ...(d.theme as object), wrapper: "phone" }),
    ],
    [
      "a non-boolean autoplay",
      (d) => (d.theme = { ...(d.theme as object), autoplay: "yes" }),
    ],
    [
      "steps that aren't an array",
      (d) => ((d as Record<string, unknown>).steps = {}),
    ],
    [
      "a recording with zero duration",
      (d) => (d.video = { ...(d.video as object), durationSec: 0 }),
    ],
    ["an unknown step type", (d) => (photo(d).type = "gif" as never)],
    [
      "an image with zero width",
      (d) => (photo(d).image = { src: "a.webp", width: 0, height: 1 } as never),
    ],
    [
      "a hotspot x above 1",
      (d) => (photo(d).hotspot = { x: 1.5, y: 0.5 } as never),
    ],
    [
      "a hotspot y below 0",
      (d) => (photo(d).hotspot = { x: 0.5, y: -0.1 } as never),
    ],
    [
      "a NaN hotspot coordinate",
      (d) => (photo(d).hotspot = { x: Number.NaN, y: 0.5 } as never),
    ],
    [
      "an unknown hotspot position",
      (d) =>
        (photo(d).hotspot = { x: 0.5, y: 0.5, position: "middle" } as never),
    ],
    [
      "a zoom scale below 1",
      (d) => (photo(d).panZoom = { x: 0.5, y: 0.5, scale: 0.5 } as never),
    ],
    [
      "a zero zoom duration",
      (d) =>
        (photo(d).panZoom = { x: 0.5, y: 0.5, scale: 2, duration: 0 } as never),
    ],
    [
      "an unknown zoom easing",
      (d) =>
        (photo(d).panZoom = {
          x: 0.5,
          y: 0.5,
          scale: 2,
          easing: "bounce",
        } as never),
    ],
    ["a negative clip start", (d) => (video(d).startTime = -1)],
    ["a zero clip end", (d) => (video(d).endTime = 0)],
    [
      "an infinite clip end",
      (d) => (video(d).endTime = Number.POSITIVE_INFINITY),
    ],
    ["a zero playback rate", (d) => (video(d).playbackRate = 0)],
  ])("rejects %s", (_, edit) => {
    expect(() => parseDemo(demoWith(edit))).toThrow(DemoParseError);
  });

  it("rejects null", () => {
    expect(() => parseDemo(null)).toThrow(DemoParseError);
  });
});

describe("DemoParseError", () => {
  it("is an Error that lists every issue with its path", () => {
    const data = demoWith((d) => {
      d.title = 42;
      photo(d).hotspot = { x: 1.5, y: 0.5 } as never;
    });

    let error: unknown;
    try {
      parseDemo(data);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DemoParseError);
    const { name, issues } = error as DemoParseError;
    expect(name).toBe("DemoParseError");
    expect(issues.map((issue) => issue.path)).toEqual([
      "title",
      "steps.1.hotspot.x",
    ]);
    for (const issue of issues) expect(issue.message).not.toBe("");
  });

  it("names the failing path in its message", () => {
    expect(() => parseDemo(demoWith((d) => (video(d).endTime = 0)))).toThrow(
      /steps\.2\.endTime/,
    );
  });
});
