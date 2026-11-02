/** How the recorder moves the mouse so the cursor in the demo reads as a person's hand. */

export interface Point {
  x: number;
  y: number;
}

/** One mouse move per frame. */
export const MOVE_TICK_MS = 16;

/** Minimum-jerk easing: the speed profile of a real reaching movement (slow, fast, slow). */
const ease = (t: number) => t * t * t * (10 - 15 * t + 6 * t * t);

/** A move of the mouse: how long it takes, and where it is at `t` (0–1) of that time. */
export interface HumanMove {
  ms: number;
  at(t: number): Point;
}

/**
 * A move from `from` to `to`: a gentle arc to one side, eased, and longer for longer
 * distances (Fitts's law, roughly 0.3–0.9s).
 */
export function humanMove(
  from: Point,
  to: Point,
  random: () => number = Math.random,
): HumanMove {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) return { ms: 0, at: () => to };

  const ms = Math.min(900, Math.max(280, 250 + 120 * Math.log2(1 + dist / 30)));
  // Perpendicular bend: up to ±12% of the distance, capped so long moves stay subtle.
  const bend = Math.min(90, dist * 0.12) * (random() * 2 - 1);
  const nx = -dy / dist;
  const ny = dx / dist;
  const c1 = {
    x: from.x + dx * 0.3 + nx * bend,
    y: from.y + dy * 0.3 + ny * bend,
  };
  const c2 = {
    x: from.x + dx * 0.75 + nx * bend * 0.5,
    y: from.y + dy * 0.75 + ny * bend * 0.5,
  };

  return {
    ms,
    at(time) {
      if (time <= 0) return from;
      if (time >= 1) return to;
      const t = ease(time);
      const u = 1 - t;
      return {
        x:
          u * u * u * from.x +
          3 * u * u * t * c1.x +
          3 * u * t * t * c2.x +
          t * t * t * to.x,
        y:
          u * u * u * from.y +
          3 * u * u * t * c1.y +
          3 * u * t * t * c2.y +
          t * t * t * to.y,
      };
    },
  };
}

/**
 * Plays a move about once per frame, placing the mouse where the path is at that moment.
 * By the clock, not by tick count: a browser that is painting acks a move only at its next
 * frame (~33ms), and a fixed tick would then slow the cursor down and speed it up again
 * mid-move as the page settles, which reads as stutter on camera.
 */
export async function playMove(
  move: HumanMove,
  io: {
    now(): number;
    move(p: Point): Promise<void>;
    wait(ms: number): Promise<void>;
  },
): Promise<void> {
  const start = io.now();
  for (;;) {
    const tick = io.now();
    const t = move.ms > 0 ? Math.min(1, (tick - start) / move.ms) : 1;
    await io.move(move.at(t));
    if (t === 1) return;
    const left = MOVE_TICK_MS - (io.now() - tick);
    if (left > 0) await io.wait(left);
  }
}

/** Where a person would click on a box: near its middle, a little off center. */
export function aimPoint(
  box: { x: number; y: number; width: number; height: number },
  random: () => number = Math.random,
): Point {
  return {
    x: box.x + box.width * (0.4 + random() * 0.2),
    y: box.y + box.height * (0.4 + random() * 0.2),
  };
}
