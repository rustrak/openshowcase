import { describe, expect, it } from "vitest";
import { clamp, clamp01, pointFromRect } from "../../canvas-geometry";

describe("clamp", () => {
  it("returns the value unchanged when inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to the minimum when below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps to the maximum when above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("clamp01", () => {
  it("clamps negative values to 0", () => {
    expect(clamp01(-0.2)).toBe(0);
  });

  it("clamps values above 1 to 1", () => {
    expect(clamp01(1.5)).toBe(1);
  });
});

describe("pointFromRect", () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };

  it("converts a client point into fractional stage coordinates", () => {
    expect(pointFromRect(rect, 200, 100)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("clamps a point outside the stage to the nearest edge", () => {
    expect(pointFromRect(rect, -50, -50)).toEqual({ x: 0, y: 0 });
    expect(pointFromRect(rect, 9999, 9999)).toEqual({ x: 1, y: 1 });
  });
});
