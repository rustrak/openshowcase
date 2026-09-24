import { describe, expect, it } from "vitest";
import { fitStage } from "../../stage-fit";

describe("fitStage", () => {
  it("is bound by height when the available box is wider than the media", () => {
    expect(fitStage({ width: 1000, height: 400 }, 2, 0)).toEqual({
      width: 800,
      height: 400,
    });
  });

  it("is bound by width when the available box is taller than the media", () => {
    expect(fitStage({ width: 500, height: 1000 }, 2, 0)).toEqual({
      width: 500,
      height: 250,
    });
  });

  it("reserves room for the browser chrome above the media", () => {
    expect(fitStage({ width: 1000, height: 436 }, 2, 36)).toEqual({
      width: 800,
      height: 400,
    });
  });

  it("never returns a negative size for a tiny box", () => {
    expect(fitStage({ width: 10, height: 20 }, 2, 36)).toEqual({
      width: 0,
      height: 0,
    });
  });
});
