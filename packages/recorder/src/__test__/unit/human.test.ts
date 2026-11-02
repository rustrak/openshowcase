import { describe, expect, it } from "vitest";
import { aimPoint, humanMove, MOVE_TICK_MS, playMove } from "../../human";

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

describe("humanMove", () => {
  const from = { x: 100, y: 100 };
  const to = { x: 700, y: 400 };
  /** The path sampled at even times, start and end included. */
  const sample = (move: ReturnType<typeof humanMove>, n = 40) =>
    Array.from({ length: n + 1 }, (_, i) => move.at(i / n));

  it("starts at the mouse and ends exactly on the target", () => {
    const move = humanMove(from, to, seq(0.9));
    expect(move.at(0)).toEqual(from);
    expect(move.at(1)).toEqual(to);
  });

  it("takes longer for longer moves, within a human range", () => {
    const short = humanMove(from, { x: 160, y: 100 }, seq(0.5));
    const long = humanMove(from, to, seq(0.5));
    expect(long.ms).toBeGreaterThan(short.ms);
    for (const move of [short, long]) {
      expect(move.ms).toBeGreaterThanOrEqual(250);
      expect(move.ms).toBeLessThanOrEqual(950);
    }
  });

  it("arcs a little instead of moving in a straight line", () => {
    const path = sample(humanMove(from, to, seq(0.95)));
    const maxOff = Math.max(...path.map((p) => offLine(p, from, to)));
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    expect(maxOff).toBeGreaterThan(5);
    expect(maxOff).toBeLessThan(dist * 0.2);
  });

  it("accelerates, then slows down onto the target", () => {
    const path = sample(humanMove(from, to, seq(0.5)));
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
    const move = humanMove(to, { x: 701, y: 400 }, seq(0.5));
    expect(move.ms).toBe(0);
    expect(move.at(0)).toEqual({ x: 701, y: 400 });
  });
});

describe("playMove", () => {
  const move = humanMove({ x: 100, y: 100 }, { x: 700, y: 400 }, seq(0.5));

  /** A fake clock: every mouse move takes `ackMs` (the browser's ack), waits take their time. */
  async function play(ackMs: number) {
    let now = 0;
    const sent: { at: number; p: { x: number; y: number } }[] = [];
    await playMove(move, {
      now: () => now,
      move: async (p) => {
        sent.push({ at: now, p });
        now += ackMs;
      },
      wait: async (ms) => {
        now += ms;
      },
    });
    return { sent, took: now };
  }

  it("sends about one move per frame when the browser acks right away", async () => {
    const { sent } = await play(0);
    expect(sent.length).toBeGreaterThan(move.ms / MOVE_TICK_MS - 2);
    expect(sent.length).toBeLessThan(move.ms / MOVE_TICK_MS + 2);
  });

  it("keeps the speed of the path when the browser acks a frame late", async () => {
    // A page that is painting acks a move only at its next frame (~33ms per move).
    const { sent, took } = await play(33);
    expect(took).toBeLessThan(move.ms + 2 * 33);
    for (const { at, p } of sent.slice(0, -1))
      expect(p).toEqual(move.at(at / move.ms));
    expect(sent.at(-1)?.p).toEqual(move.at(1));
  });

  it("jumps straight there when the move has no length", async () => {
    let now = 0;
    const sent: unknown[] = [];
    await playMove(humanMove({ x: 1, y: 1 }, { x: 2, y: 1 }), {
      now: () => now,
      move: async (p) => {
        sent.push(p);
      },
      wait: async (ms) => {
        now += ms;
      },
    });
    expect(sent).toEqual([{ x: 2, y: 1 }]);
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
