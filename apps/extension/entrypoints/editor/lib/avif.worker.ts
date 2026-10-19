// The single-threaded encoder, loaded directly: @jsquash/avif's `encode` also imports the
// multi-threaded build (+3.5 MB), which needs cross-origin isolation this page doesn't have.
import avifEncoder from "@jsquash/avif/codec/enc/avif_enc.js";
import { defaultOptions } from "@jsquash/avif/meta.js";
import { initEmscriptenModule } from "@jsquash/avif/utils.js";
import type { AvifEncoding } from "../core/photo-encoding";

const encoder = initEmscriptenModule(avifEncoder);

export interface AvifRequest {
  id: number;
  image: Blob;
  encoding: AvifEncoding;
}

export type AvifResponse =
  | { id: number; avif: Blob }
  | { id: number; error: string };

// libavif (wasm) takes 1-5s per 2x frame: off the main thread, one frame per worker.
self.onmessage = async ({ data }: MessageEvent<AvifRequest>) => {
  try {
    const bitmap = await createImageBitmap(data.image);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const avif = (await encoder).encode(
      new Uint8Array(pixels.data.buffer),
      pixels.width,
      pixels.height,
      { ...defaultOptions, ...data.encoding },
    );
    if (!avif) throw new Error("AVIF encoding failed");
    self.postMessage({
      id: data.id,
      avif: new Blob([avif as Uint8Array<ArrayBuffer>], { type: "image/avif" }),
    } satisfies AvifResponse);
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : String(error),
    } satisfies AvifResponse);
  }
};
