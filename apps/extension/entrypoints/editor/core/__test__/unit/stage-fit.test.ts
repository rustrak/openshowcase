import { describe, expect, it } from "vitest";
import { fitStage } from "../../stage-fit";

describe("fitStage", () => {
  it("is bound by height when the available box is wider than the media", () => {
    expect(fitStage({ width: 1000, height: 400 }, 2)).toEqual({
      width: 800,
      height: 400,
      outerWidth: 800,
      outerHeight: 400,
    });
  });

  it("is bound by width when the available box is taller than the media", () => {
    expect(fitStage({ width: 500, height: 1000 }, 2)).toEqual({
      width: 500,
      height: 250,
      outerWidth: 500,
      outerHeight: 250,
    });
  });

  it("reserves room for the browser chrome above the media", () => {
    expect(fitStage({ width: 1000, height: 436 }, 2, { chrome: 36 })).toEqual({
      width: 800,
      height: 400,
      outerWidth: 800,
      outerHeight: 436,
    });
  });

  it("reserves room for the bezel on every side", () => {
    expect(
      fitStage({ width: 1000, height: 448 }, 2, { chrome: 36, inset: 6 }),
    ).toEqual({ width: 800, height: 400, outerWidth: 812, outerHeight: 448 });
  });

  it("takes the backdrop's margin out of the width", () => {
    expect(fitStage({ width: 1000, height: 1000 }, 2, { pad: 0.1 })).toEqual({
      width: 800,
      height: 400,
      outerWidth: 1000,
      outerHeight: 600,
    });
  });

  it("fits the backdrop's margin in the height too", () => {
    const { outerHeight, outerWidth } = fitStage(
      { width: 2000, height: 600 },
      2,
      { chrome: 36, inset: 6, pad: 0.05 },
    );
    expect(outerHeight).toBeLessThanOrEqual(600);
    expect(outerHeight).toBeGreaterThan(590);
    expect(outerWidth).toBeLessThanOrEqual(2000);
  });

  it("never returns a negative size for a tiny box", () => {
    expect(fitStage({ width: 10, height: 20 }, 2, { chrome: 36 })).toEqual({
      width: 0,
      height: 0,
      outerWidth: 0,
      outerHeight: 0,
    });
  });
});
