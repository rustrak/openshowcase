import { describe, expect, it } from "vitest";
import type { MarkerRecord, RecordingRecord } from "@/lib/db";
import {
  fileFromRecords,
  packRecording,
  type RecordingFile,
  recordsFromFile,
  unpackRecording,
} from "@/lib/recording-file";

const video = new Blob([new Uint8Array([1, 2, 3, 4, 5])], {
  type: "video/webm",
});

function recordingFile(overrides: Partial<RecordingFile> = {}): RecordingFile {
  return {
    recording: {
      createdAt: 1_000,
      startedAt: 2_000,
      mimeType: "video/webm",
      durationSec: 4.5,
      width: 2560,
      height: 1600,
    },
    markers: [
      {
        kind: "click",
        capturedAt: 2_500,
        pageUrl: "https://example.com",
        xFrac: 0.25,
        yFrac: 0.5,
        selector: "#new",
        elementText: "New invoice",
        label: "Create your first invoice",
      },
      { kind: "scroll", capturedAt: 3_000, pageUrl: "https://example.com" },
    ],
    video,
    ...overrides,
  };
}

async function bytes(blob: Blob): Promise<number[]> {
  return [...new Uint8Array(await blob.arrayBuffer())];
}

describe("packRecording / unpackRecording", () => {
  it("round-trips the recording, its markers and the video bytes", async () => {
    const file = recordingFile();
    const unpacked = await unpackRecording(await packRecording(file));

    expect(unpacked.recording).toEqual(file.recording);
    expect(unpacked.markers).toEqual(file.markers);
    expect(await bytes(unpacked.video)).toEqual([1, 2, 3, 4, 5]);
    expect(unpacked.video.type).toBe("video/webm");
  });

  it("round-trips the recorder's direction", async () => {
    const direction = {
      cuts: [{ start: 2_600, end: 2_900 }],
      zooms: [{ start: 2_500, end: 2_800, x: 0.4, y: 0.6, scale: 2 }],
    };
    const unpacked = await unpackRecording(
      packRecording(recordingFile({ direction })),
    );
    expect(unpacked.direction).toEqual(direction);
  });

  it("rejects a malformed direction", async () => {
    const packed = packRecording(
      recordingFile({
        direction: { cuts: "soon" } as unknown as RecordingFile["direction"],
      }),
    );
    await expect(unpackRecording(packed)).rejects.toThrow(/damaged/);
  });

  it("keeps non-ASCII text intact", async () => {
    const file = recordingFile({
      markers: [
        {
          kind: "click",
          capturedAt: 2_500,
          pageUrl: "https://example.com",
          label: "Créa tu factura “ya” 🚀",
        },
      ],
    });
    const unpacked = await unpackRecording(await packRecording(file));
    expect(unpacked.markers[0]?.label).toBe("Créa tu factura “ya” 🚀");
  });

  it("rejects a file that isn't a recording", async () => {
    await expect(
      unpackRecording(new Blob(["PK\u0003\u0004 a zip, not a recording"])),
    ).rejects.toThrow(/not an OpenShowcase recording/);
  });

  it("rejects a file too short to hold a header", async () => {
    await expect(unpackRecording(new Blob(["OS"]))).rejects.toThrow(
      /not an OpenShowcase recording/,
    );
  });

  it("rejects a newer format version", async () => {
    const packed = new Uint8Array(
      await (await packRecording(recordingFile())).arrayBuffer(),
    );
    packed[5] = 99;
    await expect(unpackRecording(new Blob([packed]))).rejects.toThrow(
      /newer version/,
    );
  });

  it("rejects a truncated header", async () => {
    const packed = await packRecording(recordingFile());
    await expect(unpackRecording(packed.slice(0, 20))).rejects.toThrow(
      /damaged/,
    );
  });

  it("rejects a header without the recording's timing", async () => {
    const packed = await packRecording(
      recordingFile({
        recording: {
          ...recordingFile().recording,
          startedAt: null as unknown as number,
        },
      }),
    );
    await expect(unpackRecording(packed)).rejects.toThrow(/damaged/);
  });

  it("rejects a recording without video", async () => {
    const packed = await packRecording(recordingFile({ video: new Blob([]) }));
    await expect(unpackRecording(packed)).rejects.toThrow(/no video/);
  });
});

describe("fileFromRecords / recordsFromFile", () => {
  const record: RecordingRecord = {
    id: "rec-1",
    createdAt: 1_000,
    startedAt: 2_000,
    status: "complete",
    videoBlob: video,
    mimeType: "video/webm",
    durationSec: 4.5,
    width: 2560,
    height: 1600,
    tabId: 7,
  };
  const markers: MarkerRecord[] = [
    {
      id: "m-1",
      recordingId: "rec-1",
      kind: "click",
      capturedAt: 2_500,
      pageUrl: "https://example.com",
      xFrac: 0.25,
      yFrac: 0.5,
    },
  ];

  it("drops the database ids and the tab from the file", () => {
    const file = fileFromRecords(record, markers);
    expect(file.recording).toEqual({
      createdAt: 1_000,
      startedAt: 2_000,
      mimeType: "video/webm",
      durationSec: 4.5,
      width: 2560,
      height: 1600,
    });
    expect(file.markers).toEqual([
      {
        kind: "click",
        capturedAt: 2_500,
        pageUrl: "https://example.com",
        xFrac: 0.25,
        yFrac: 0.5,
      },
    ]);
    expect(file.video).toBe(video);
  });

  it("refuses a recording that hasn't finished", () => {
    expect(() =>
      fileFromRecords({ ...record, status: "recording" }, markers),
    ).toThrow(/not finished/);
    expect(() => fileFromRecords({ ...record, videoBlob: null }, [])).toThrow(
      /not finished/,
    );
  });

  it("keeps the direction both ways", () => {
    const direction = { cuts: [{ start: 1, end: 2 }], zooms: [] };
    const file = fileFromRecords({ ...record, direction }, markers);
    expect(file.direction).toEqual(direction);
    expect(recordsFromFile(file, "rec-new").recording.direction).toEqual(
      direction,
    );
  });

  it("gives an imported file fresh ids under the new recording", () => {
    let n = 0;
    const { recording, markers: imported } = recordsFromFile(
      fileFromRecords(record, markers),
      "rec-new",
      () => `id-${++n}`,
    );
    expect(recording).toEqual({
      ...record,
      id: "rec-new",
      tabId: -1,
    });
    expect(imported).toEqual([
      { ...markers[0], id: "id-1", recordingId: "rec-new" },
    ]);
  });
});
