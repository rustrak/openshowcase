import { describe, expect, it } from "vitest";
import { summarizeBundle } from "../../bundle-summary";

describe("summarizeBundle", () => {
  it("groups a bundle's files by what they are", () => {
    expect(
      summarizeBundle([
        { name: "steps.json", size: 2_000 },
        { name: "assets/recording.mp4", size: 3_000_000 },
        { name: "assets/step-1.avif", size: 100_000 },
        { name: "assets/step-2.avif", size: 50_000 },
      ]),
    ).toEqual({
      total: 3_152_000,
      parts: [
        { kind: "video", label: "Video", files: 1, size: 3_000_000 },
        { kind: "photos", label: "Photos", files: 2, size: 150_000 },
        { kind: "manifest", label: "steps.json", files: 1, size: 2_000 },
      ],
    });
  });

  it("leaves out what the bundle doesn't have", () => {
    expect(
      summarizeBundle([
        { name: "steps.json", size: 10 },
        { name: "assets/step-1.webp", size: 20 },
      ]).parts.map((part) => part.kind),
    ).toEqual(["photos", "manifest"]);
  });

  it("counts unknown files so the total still adds up", () => {
    expect(
      summarizeBundle([
        { name: "steps.json", size: 10 },
        { name: "notes.txt", size: 5 },
      ]),
    ).toEqual({
      total: 15,
      parts: [
        { kind: "manifest", label: "steps.json", files: 1, size: 10 },
        { kind: "other", label: "Other", files: 1, size: 5 },
      ],
    });
  });
});
