import { describe, expect, it } from "vitest";
import { readStoredZip } from "../../core/stored-zip";
import { makeZip, streamOf } from "./zip-fixture";

async function readAll(stream: ReadableStream<Uint8Array<ArrayBuffer>>) {
  const files: Record<string, string> = {};
  for await (const entry of readStoredZip(stream))
    files[entry.name] = await new Blob(entry.parts).text();
  return files;
}

describe("readStoredZip", () => {
  const zip = makeZip([
    { name: "steps.json", data: '{"a":1}' },
    { name: "assets/", data: "" },
    { name: "assets/step-1.webp", data: "photo bytes" },
    { name: "assets/recording.mp4", data: "video bytes".repeat(50) },
  ]);

  it.each([1, 3, 7, 64, zip.length])(
    "reads every file whatever the chunk size (%i bytes)",
    async (chunkSize) => {
      expect(await readAll(streamOf(zip, chunkSize))).toEqual({
        "steps.json": '{"a":1}',
        "assets/step-1.webp": "photo bytes",
        "assets/recording.mp4": "video bytes".repeat(50),
      });
    },
  );

  it("yields a file before the rest of the zip has downloaded", async () => {
    const stream = streamOf(zip, 16);
    const entries = readStoredZip(stream);
    const first = await entries.next();
    expect(first.value?.name).toBe("steps.json");
    expect(stream.pulled()).toBeLessThan(zip.length / 4);
    await entries.return(undefined);
  });

  it("stops at the central directory without reading it", async () => {
    const stream = streamOf(zip, 1);
    await readAll(stream);
    const names = [
      "steps.json",
      "assets/",
      "assets/step-1.webp",
      "assets/recording.mp4",
    ];
    const centralSize = names.reduce((n, name) => n + 46 + name.length, 0);
    const centralStart = zip.length - 22 - centralSize;
    // Only its 4-byte signature
    expect(stream.pulled()).toBe(centralStart + 4);
  });

  it("rejects compressed entries", async () => {
    const deflated = makeZip([{ name: "steps.json", data: "x", method: 8 }]);
    await expect(readAll(streamOf(deflated))).rejects.toThrow(
      /Unsupported zip entry "steps.json"/,
    );
  });

  it("rejects entries whose sizes come after their data", async () => {
    const streamed = makeZip([{ name: "steps.json", data: "x", flags: 0x08 }]);
    await expect(readAll(streamOf(streamed))).rejects.toThrow(
      /Unsupported zip entry/,
    );
  });

  it("rejects what isn't a zip", async () => {
    const html = new TextEncoder().encode("<!doctype html><html></html>");
    await expect(readAll(streamOf(html))).rejects.toThrow(/not a zip/);
  });

  it("rejects a truncated file", async () => {
    await expect(readAll(streamOf(zip.slice(0, 60)))).rejects.toThrow(
      /truncated/,
    );
  });
});
