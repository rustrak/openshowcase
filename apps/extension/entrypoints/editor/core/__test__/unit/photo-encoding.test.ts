import { describe, expect, it } from "vitest";
import { photoEncoding } from "../../photo-encoding";

describe("photoEncoding", () => {
  it("encodes a photo as visually lossless AVIF, keeping full color on text", () => {
    expect(photoEncoding(undefined)).toEqual({
      quality: 75,
      speed: 6,
      subsample: 3,
      tune: 2,
      bitDepth: 8,
    });
  });

  it("raises the quality when the player zooms into the photo", () => {
    expect(photoEncoding({ x: 0.5, y: 0.5, scale: 2 }).quality).toBe(82);
  });

  it("treats a 1x frame as no zoom", () => {
    expect(photoEncoding({ x: 0.5, y: 0.5, scale: 1 }).quality).toBe(75);
  });
});
