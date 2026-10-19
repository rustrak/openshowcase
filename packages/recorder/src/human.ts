/** How the recorder moves the mouse so the cursor in the demo reads as a person's hand. */

export interface Point {
  x: number;
  y: number;
}

/** One mouse move per frame. */
export const MOVE_TICK_MS = 16;

/** Minimum-jerk easing: the speed profile of a real reaching movement (slow, fast, slow). */
const ease = (t: number) => t * t * t * (10 - 15 * t + 6 * t * t);

/**
 * Points (one per frame) from `from` to `to`: a gentle arc to one side, eased, and longer for
 * longer distances (Fitts's law, roughly 0.3–0.9s).
 */
export function humanPath(
  from: Point,
  to: Point,
  random: () => number = Math.random,
): Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) return [to];

  const ms = Math.min(900, Math.max(280, 250 + 120 * Math.log2(1 + dist / 30)));
  const ticks = Math.round(ms / MOVE_TICK_MS);
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

  const points: Point[] = [];
  for (let i = 1; i < ticks; i++) {
    const t = ease(i / ticks);
    const u = 1 - t;
    points.push({
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
    });
  }
  points.push(to);
  return points;
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
