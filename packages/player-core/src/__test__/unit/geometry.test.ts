import { describe, expect, it } from "vitest";
import {
  computeAnchorPoint,
  computeContainBox,
  computeTooltipPlacement,
  zoomTransform,
} from "../../core/geometry";

describe("computeContainBox", () => {
  it("letterboxes a wider stage around the natural aspect ratio", () => {
    const box = computeContainBox(200, 100, 100, 100);
    expect(box).toEqual({
      offsetX: 50,
      offsetY: 0,
      scale: 1,
      stageW: 200,
      stageH: 100,
    });
  });

  it("falls back to an identity box when any dimension is zero", () => {
    const box = computeContainBox(200, 100, 0, 100);
    expect(box).toEqual({
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      stageW: 200,
      stageH: 100,
    });
  });
});

describe("zoomTransform", () => {
  it("translates (pre-multiplied by scale) before scaling, for linear interpolation", () => {
    expect(zoomTransform({ x: 0.25, y: 0.75, scale: 1.5 })).toBe(
      "translate(37.5%, -37.5%) scale(1.5)",
    );
  });
});

describe("computeAnchorPoint", () => {
  const box = { offsetX: 50, offsetY: 0, scale: 1, stageW: 200, stageH: 100 };

  it("places the anchor at the hotspot fraction inside the contain box, without panZoom", () => {
    expect(computeAnchorPoint({ x: 0.5, y: 0.5 }, box, 100, 100)).toEqual({
      left: 100,
      top: 50,
    });
  });

  it("scales the anchor distance from the stage center when panZoom is present", () => {
    const anchor = computeAnchorPoint({ x: 0.75, y: 0.5 }, box, 100, 100, {
      x: 0.5,
      y: 0.5,
      scale: 2,
    });
    expect(anchor).toEqual({ left: 150, top: 50 });
  });
});

describe("computeTooltipPlacement", () => {
  const stageSize = { width: 300, height: 200 };
  const tooltipSize = { width: 100, height: 40 };
  const gap = 20;

  it("auto prefers below the hotspot, centered, `gap` px from the anchor", () => {
    const placement = computeTooltipPlacement({
      anchor: { left: 100, top: 50 },
      tooltipSize,
      stageSize,
      gap,
    });
    expect(placement).toEqual({
      left: 50,
      top: 70,
      side: "bottom",
      arrowOffset: 50,
    });
  });

  it("auto flips above when there is no room below", () => {
    const placement = computeTooltipPlacement({
      anchor: { left: 100, top: 170 },
      tooltipSize,
      stageSize,
      gap,
    });
    expect(placement).toEqual({
      left: 50,
      top: 110,
      side: "top",
      arrowOffset: 50,
    });
  });

  it("auto falls back to the sides when neither above nor below fits", () => {
    const placement = computeTooltipPlacement({
      anchor: { left: 60, top: 100 },
      tooltipSize: { width: 100, height: 90 },
      stageSize,
      gap,
    });
    expect(placement.side).toBe("right");
    expect(placement.left).toBe(80);
  });

  it("honors an explicit side when it fits", () => {
    const placement = computeTooltipPlacement({
      anchor: { left: 150, top: 100 },
      tooltipSize: { width: 60, height: 30 },
      stageSize,
      position: "left",
      gap,
    });
    expect(placement).toEqual({
      left: 70,
      top: 85,
      side: "left",
      arrowOffset: 15,
    });
  });

  it("flips an explicit side to the opposite one when it would cover the hotspot", () => {
    const placement = computeTooltipPlacement({
      anchor: { left: 40, top: 100 },
      tooltipSize: { width: 60, height: 30 },
      stageSize,
      position: "left",
      gap,
    });
    expect(placement.side).toBe("right");
    expect(placement.left).toBe(60);
  });

  it("clamps to the stage edges and keeps the arrow pointing at the anchor", () => {
    const placement = computeTooltipPlacement({
      anchor: { left: 5, top: 5 },
      tooltipSize,
      stageSize,
      gap,
    });
    expect(placement).toEqual({
      left: 8,
      top: 25,
      side: "bottom",
      arrowOffset: 14,
    });
  });
});
