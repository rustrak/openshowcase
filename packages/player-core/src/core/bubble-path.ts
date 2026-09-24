import type { TooltipSide } from "./geometry";

/**
 * The tooltip's outline — box AND tail — as ONE closed SVG path, in the box's own coordinate
 * space (the tail extends outside 0..width / 0..height).
 *
 * A separate arrow element glued to a box can never match it perfectly once the box has a
 * gradient, an edge line, a highlight and a shadow: there's always a seam, a color step or a
 * doubled edge where the two overlap. Drawing a single shape (the approach behind speech-bubble
 * tails in design tools, and Floating UI's stroked `FloatingArrow` taken to its conclusion)
 * makes fill, border, sheen and drop-shadow continuous by construction.
 *
 * The tail has concave shoulders that flow out of the edge and a rounded tip (like macOS/iOS
 * popovers), instead of a hard triangle.
 */
export interface BubblePathInput {
  width: number;
  height: number;
  radius: number;
  /** Which side of the anchor the tooltip sits on — the tail goes on the opposite edge. */
  side: TooltipSide;
  /** Tail position along its edge (px from the edge's start: left for top/bottom edges,
   * top for left/right edges) — the arrow offset from `computeTooltipPlacement`. */
  tailOffset: number;
  tail: { width: number; height: number; tipRadius?: number };
}

type Pt = [number, number];

const f = (n: number) => Number(n.toFixed(2));

export function bubblePath({
  width: w,
  height: h,
  radius,
  side,
  tailOffset,
  tail,
}: BubblePathInput): string {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const a = tail.width / 2;
  const th = tail.height;
  const tr = Math.min(tail.tipRadius ?? Math.min(2, th / 3), a);

  // The edge the tail grows from (opposite the side the tooltip is on).
  const tailEdge = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  }[side];

  /**
   * Tail segment for an edge, in edge-local coords (u: along the edge in walking direction
   * `dir`, v: outward). `map` turns (u, v) into box xy.
   */
  function tailSegment(
    center: number,
    dir: 1 | -1,
    map: (u: number, v: number) => Pt,
  ) {
    const p = (u: number, v: number) => map(u, v).map(f).join(" ");
    const s = (k: number) => center + dir * k;
    return [
      `L ${p(s(-a), 0)}`,
      // concave shoulder flowing out of the edge toward the tip
      `C ${p(s(-a * 0.45), 0)} ${p(s(-tr * 1.1), th - tr * 0.9)} ${p(s(-tr * 0.55), th - tr * 0.25)}`,
      // rounded tip
      `Q ${p(center, th + tr * 0.25)} ${p(s(tr * 0.55), th - tr * 0.25)}`,
      // mirrored shoulder back into the edge
      `C ${p(s(tr * 1.1), th - tr * 0.9)} ${p(s(a * 0.45), 0)} ${p(s(a), 0)}`,
    ].join(" ");
  }

  // Keep the tail on the straight part of its edge (never over a rounded corner).
  const along = (length: number) =>
    Math.min(Math.max(tailOffset, r + a), length - r - a);

  const parts: string[] = [`M ${f(r)} 0`];

  // top edge, left → right (outward = -y)
  if (tailEdge === "top")
    parts.push(tailSegment(along(w), 1, (u, v) => [u, -v]));
  parts.push(`L ${f(w - r)} 0`, `A ${f(r)} ${f(r)} 0 0 1 ${f(w)} ${f(r)}`);

  // right edge, top → bottom (outward = +x)
  if (tailEdge === "right")
    parts.push(tailSegment(along(h), 1, (u, v) => [w + v, u]));
  parts.push(
    `L ${f(w)} ${f(h - r)}`,
    `A ${f(r)} ${f(r)} 0 0 1 ${f(w - r)} ${f(h)}`,
  );

  // bottom edge, right → left (outward = +y)
  if (tailEdge === "bottom")
    parts.push(tailSegment(along(w), -1, (u, v) => [u, h + v]));
  parts.push(`L ${f(r)} ${f(h)}`, `A ${f(r)} ${f(r)} 0 0 1 0 ${f(h - r)}`);

  // left edge, bottom → top (outward = -x)
  if (tailEdge === "left")
    parts.push(tailSegment(along(h), -1, (u, v) => [-v, u]));
  parts.push(`L 0 ${f(r)}`, `A ${f(r)} ${f(r)} 0 0 1 ${f(r)} 0`, "Z");

  return parts.join(" ");
}
