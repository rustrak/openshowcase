import { describe, expect, it } from "vitest";
import { bubblePath } from "../../core/bubble-path";

/** Real SVG geometry: is (x, y) inside the filled bubble? */
function inside(d: string, x: number, y: number): boolean {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
  document.body.appendChild(svg);
  const point = svg.createSVGPoint();
  point.x = x;
  point.y = y;
  const result = path.isPointInFill(point);
  svg.remove();
  return result;
}

const box = { width: 200, height: 60, radius: 10 };
const tail = { width: 16, height: 8 };

describe("bubblePath", () => {
  it("is one closed shape: the box with its corners rounded", () => {
    const d = bubblePath({ ...box, side: "top", tailOffset: 100, tail });
    expect(d.trim().endsWith("Z")).toBe(true);
    expect(inside(d, 100, 30)).toBe(true);
    expect(inside(d, 0.5, 0.5)).toBe(false); // rounded corner, not square
  });

  it("grows a tail below the box pointing at the anchor when the tooltip sits above it", () => {
    const d = bubblePath({ ...box, side: "top", tailOffset: 70, tail });
    expect(inside(d, 70, 60 + 6)).toBe(true); // inside the tail, near its tip
    expect(inside(d, 70 + 12, 60 + 3)).toBe(false); // beside the tail
    expect(inside(d, 70, 60 + 9)).toBe(false); // past the tip
  });

  it("puts the tail on the edge facing the anchor for every side", () => {
    const bottom = bubblePath({ ...box, side: "bottom", tailOffset: 50, tail });
    expect(inside(bottom, 50, -6)).toBe(true);

    const right = bubblePath({ ...box, side: "right", tailOffset: 30, tail });
    expect(inside(right, -6, 30)).toBe(true);

    const left = bubblePath({ ...box, side: "left", tailOffset: 30, tail });
    expect(inside(left, 200 + 6, 30)).toBe(true);
  });
});
