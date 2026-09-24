import { expect, it } from "vitest";
import { blobToWebp } from "../../image";

async function makePngBlob(size = 4): Promise<Blob> {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0, 0, size, size);
  return canvas.convertToBlob({ type: "image/png" });
}

/** A noisy (non-solid-color) source makes lossy quality settings actually produce different sizes. */
async function makeNoisyPngBlob(): Promise<Blob> {
  const size = 48;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = Math.floor(Math.random() * 256);
    imageData.data[i + 1] = Math.floor(Math.random() * 256);
    imageData.data[i + 2] = Math.floor(Math.random() * 256);
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ type: "image/png" });
}

it("returns the same blob unchanged when it is already image/webp", async () => {
  const source = new Blob(["fake-webp-bytes"], { type: "image/webp" });
  const result = await blobToWebp(source);
  expect(result).toBe(source);
});

it("converts a non-webp blob into a real image/webp blob", async () => {
  const source = await makePngBlob();
  const result = await blobToWebp(source);
  expect(result.type).toBe("image/webp");
  expect(result).not.toBe(source);
  expect(result.size).toBeGreaterThan(0);
});

it("forwards the quality parameter to the encoder — lower quality yields a smaller file", async () => {
  const source = await makeNoisyPngBlob();
  const low = await blobToWebp(source, 0.1);
  const high = await blobToWebp(source, 0.95);
  expect(low.size).toBeLessThan(high.size);
});
