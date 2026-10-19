import { describe, expect, it } from "vitest";
import { aimPoint, humanPath, MOVE_TICK_MS } from "../../human";

const seq =
  (...values: number[]) =>
  () =>
    values.shift() ?? 0.5;

/** Distance of p from the straight line a→b. */
function offLine(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return (
    Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / Math.hypot(dx, dy)
  );
}

describe("humanPath", () => {
  const from = { x: 100, y: 100 };
  const to = { x: 700, y: 400 };

  it("ends exactly on the target", () => {
    const path = humanPath(from, to, seq(0.9));
    expect(path.at(-1)).toEqual(to);
  });

  it("takes longer for longer moves, within a human range", () => {
    const short = humanPath(from, { x: 160, y: 100 }, seq(0.5));
    const long = humanPath(from, to, seq(0.5));
    expect(long.length).toBeGreaterThan(short.length);
    for (const path of [short, long]) {
      const ms = path.length * MOVE_TICK_MS;
      expect(ms).toBeGreaterThanOrEqual(250);
      expect(ms).toBeLessThanOrEqual(950);
    }
  });

  it("arcs a little instead of moving in a straight line", () => {
    const path = humanPath(from, to, seq(0.95));
    const maxOff = Math.max(...path.map((p) => offLine(p, from, to)));
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    expect(maxOff).toBeGreaterThan(5);
    expect(maxOff).toBeLessThan(dist * 0.2);
  });

  it("accelerates, then slows down onto the target", () => {
    const path = [from, ...humanPath(from, to, seq(0.5))];
    const steps = path
      .slice(1)
      .map((p, i) =>
        Math.hypot(p.x - (path[i]?.x ?? 0), p.y - (path[i]?.y ?? 0)),
      );
    const middle = steps[Math.floor(steps.length / 2)] ?? 0;
    expect(steps[0]).toBeLessThan(middle / 2);
    expect(steps.at(-1)).toBeLessThan(middle / 2);
  });

  it("doesn't move when already there", () => {
    expect(humanPath(to, { x: 701, y: 400 }, seq(0.5))).toEqual([
      { x: 701, y: 400 },
    ]);
  });
});

describe("aimPoint", () => {
  it("aims near the middle of the element, not always dead center", () => {
    const box = { x: 100, y: 200, width: 200, height: 40 };
    const a = aimPoint(box, seq(0, 0));
    const b = aimPoint(box, seq(1, 1));
    for (const p of [a, b]) {
      expect(p.x).toBeGreaterThanOrEqual(100 + 200 * 0.3);
      expect(p.x).toBeLessThanOrEqual(100 + 200 * 0.7);
      expect(p.y).toBeGreaterThanOrEqual(200 + 40 * 0.3);
      expect(p.y).toBeLessThanOrEqual(200 + 40 * 0.7);
    }
    expect(a).not.toEqual(b);
  });
});
