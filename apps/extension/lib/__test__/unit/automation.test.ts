import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { type AutomationDeps, createAutomation } from "@/lib/automation";
import type { MarkerRecord, RecordingRecord } from "@/lib/db";
import { unpackRecording } from "@/lib/recording-file";
import { recordingSession } from "@/lib/recording-storage";

beforeEach(() => {
  fakeBrowser.reset();
});

const finished: RecordingRecord = {
  id: "rec-1",
  createdAt: 1_000,
  startedAt: 2_000,
  status: "complete",
  videoBlob: new Blob([new Uint8Array([9, 8, 7])], { type: "video/webm" }),
  mimeType: "video/webm",
  durationSec: 3,
  width: 2560,
  height: 1600,
  tabId: 1,
};

const click: MarkerRecord = {
  id: "m-1",
  recordingId: "rec-1",
  kind: "click",
  capturedAt: 2_500,
  pageUrl: "https://example.com",
  xFrac: 0.5,
  yFrac: 0.5,
};

function fakeDeps(overrides: Partial<AutomationDeps> = {}): AutomationDeps {
  return {
    startRecording: async () => {
      await recordingSession.setValue({ active: true, recordingId: "rec-1" });
    },
    stopRecording: async () => {},
    getRecording: async () => finished,
    getMarkers: async () => [click],
    sleep: async () => {},
    ...overrides,
  };
}

function fromBase64(base64: string): number[] {
  return [...atob(base64)].map((c) => c.charCodeAt(0));
}

describe("start", () => {
  it("returns the id of the recording it started", async () => {
    expect(await createAutomation(fakeDeps()).start()).toBe("rec-1");
  });

  it("throws when the recording didn't start", async () => {
    const automation = createAutomation(
      fakeDeps({ startRecording: async () => {} }),
    );
    await expect(automation.start()).rejects.toThrow(/didn't start/);
  });
});

describe("stop", () => {
  it("waits until the recording is saved", async () => {
    const states: RecordingRecord["status"][] = [
      "recording",
      "recording",
      "complete",
    ];
    let reads = 0;
    let stopped = false;
    const automation = createAutomation(
      fakeDeps({
        stopRecording: async () => {
          stopped = true;
        },
        getRecording: async () => ({
          ...finished,
          status: states[Math.min(reads++, states.length - 1)] ?? "complete",
        }),
      }),
    );
    await automation.stop("rec-1");
    expect(stopped).toBe(true);
    expect(reads).toBe(3);
  });

  it("throws when the recording was interrupted", async () => {
    const automation = createAutomation(
      fakeDeps({
        getRecording: async () => ({ ...finished, status: "interrupted" }),
      }),
    );
    await expect(automation.stop("rec-1")).rejects.toThrow(/interrupted/);
  });

  it("gives up when the recording is never saved", async () => {
    const automation = createAutomation(
      fakeDeps({
        getRecording: async () => ({ ...finished, status: "recording" }),
      }),
    );
    await expect(automation.stop("rec-1")).rejects.toThrow(/never saved/);
  });
});

describe("exportFile / readChunk", () => {
  it("exports the recording as a file with the flow's click labels", async () => {
    const automation = createAutomation(fakeDeps());
    const size = await automation.exportFile("rec-1", {
      clicks: [{ start: 2_450, end: 2_600, label: "Open the menu", zoom: 2 }],
      cuts: [{ start: 2_700, end: 2_800 }],
      zooms: [],
    });

    let base64 = "";
    const chunk = 7;
    const bytes: number[] = [];
    for (let offset = 0; offset < size; offset += chunk) {
      base64 = await automation.readChunk(offset, chunk);
      bytes.push(...fromBase64(base64));
    }
    expect(bytes).toHaveLength(size);

    const file = await unpackRecording(new Blob([new Uint8Array(bytes)]));
    expect(file.markers).toEqual([
      {
        kind: "click",
        capturedAt: 2_500,
        pageUrl: "https://example.com",
        xFrac: 0.5,
        yFrac: 0.5,
        label: "Open the menu",
        zoom: 2,
      },
    ]);
    expect(file.direction).toEqual({
      cuts: [{ start: 2_700, end: 2_800 }],
      zooms: [],
    });
    expect([...new Uint8Array(await file.video.arrayBuffer())]).toEqual([
      9, 8, 7,
    ]);
  });

  it("throws when reading before exporting", async () => {
    await expect(createAutomation(fakeDeps()).readChunk(0, 10)).rejects.toThrow(
      /exportFile/,
    );
  });
});
