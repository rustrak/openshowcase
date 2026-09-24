import { describe, expect, it } from "vitest";
import { frameFromDrag, moveFrame, resizeFromCorner } from "../../camera-frame";

describe("frameFromDrag", () => {
  it("turns a dragged rectangle into a zoom centered on it", () => {
    const pz = frameFromDrag({ x: 0.2, y: 0.2 }, { x: 0.7, y: 0.4 });
    expect(pz?.scale).toBeCloseTo(2);
    expect(pz?.x).toBeCloseTo(0.45);
    expect(pz?.y).toBeCloseTo(0.3);
  });

  it("ignores a drag too small to be intentional", () => {
    expect(
      frameFromDrag({ x: 0.5, y: 0.5 }, { x: 0.51, y: 0.52 }),
    ).toBeUndefined();
  });
});

describe("moveFrame", () => {
  it("shifts the frame by the pointer delta, keeping its timing fields", () => {
    const moved = moveFrame(
      { x: 0.5, y: 0.5, scale: 2, duration: 800 },
      0.1,
      -0.1,
    );
    expect(moved).toEqual({ x: 0.6, y: 0.4, scale: 2, duration: 800 });
  });

  it("stops at the image edge", () => {
    const moved = moveFrame({ x: 0.5, y: 0.5, scale: 2 }, 0.9, -0.9);
    expect(moved.x).toBeCloseTo(0.75);
    expect(moved.y).toBeCloseTo(0.25);
  });
});

describe("resizeFromCorner", () => {
  it("keeps the opposite corner pinned while the dragged corner moves", () => {
    // frame spans 0.25..0.75; drag its bottom-right corner in to (0.5, 0.5)
    const pz = resizeFromCorner({ x: 0.5, y: 0.5, scale: 2 }, "br", {
      x: 0.5,
      y: 0.5,
    });
    expect(pz.scale).toBeCloseTo(4);
    expect(pz.x - 0.5 / pz.scale).toBeCloseTo(0.25);
    expect(pz.y - 0.5 / pz.scale).toBeCloseTo(0.25);
  });

  it("never zooms out past the whole image nor in past the max zoom", () => {
    const out = resizeFromCorner({ x: 0.5, y: 0.5, scale: 2 }, "tl", {
      x: -1,
      y: -1,
    });
    expect(out.scale).toBe(1);
    const tight = resizeFromCorner({ x: 0.5, y: 0.5, scale: 2 }, "tl", {
      x: 0.74,
      y: 0.74,
    });
    expect(tight.scale).toBe(4);
  });
});
