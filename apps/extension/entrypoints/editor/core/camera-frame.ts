import type { PanZoom } from "@rustrak/openshowcase-schema";
import { clamp } from "../lib/canvas-geometry";

/**
 * Geometry of the camera (pan & zoom) frame drawn over the stage. A frame is a PanZoom:
 * its center (`x`, `y`, fractions of the image) and `scale`; its side is `1 / scale` of the
 * image in both axes, so it always keeps the recording's aspect ratio.
 */

export const MAX_ZOOM = 4;
const MIN_DRAG = 0.03;

type Point = { x: number; y: number };

/** Center clamped so a frame of the given scale stays inside the image. */
function clampCenter(x: number, y: number, scale: number): Point {
  const half = 0.5 / scale;
  return { x: clamp(x, half, 1 - half), y: clamp(y, half, 1 - half) };
}

/** A zoom framing the rectangle dragged from `from` to `to`; undefined for a stray click. */
export function frameFromDrag(from: Point, to: Point): PanZoom | undefined {
  const w = Math.abs(to.x - from.x);
  const h = Math.abs(to.y - from.y);
  if (w < MIN_DRAG || h < MIN_DRAG) return undefined;
  const scale = clamp(1 / Math.max(w, h), 1, MAX_ZOOM);
  return {
    ...clampCenter((from.x + to.x) / 2, (from.y + to.y) / 2, scale),
    scale,
  };
}

/** The frame dragged by (`dx`, `dy`) image fractions, stopping at the image edges. */
export function moveFrame(panZoom: PanZoom, dx: number, dy: number): PanZoom {
  return {
    ...panZoom,
    ...clampCenter(panZoom.x + dx, panZoom.y + dy, panZoom.scale),
  };
}

export type Corner = "tl" | "tr" | "bl" | "br";

/**
 * The frame after dragging `corner` to `pointer`: the opposite corner stays pinned (like
 * resizing any box), and the aspect ratio is kept by using the larger of the two deltas.
 */
export function resizeFromCorner(
  panZoom: PanZoom,
  corner: Corner,
  pointer: Point,
): PanZoom {
  const half = 0.5 / panZoom.scale;
  const sx = corner === "tr" || corner === "br" ? 1 : -1;
  const sy = corner === "bl" || corner === "br" ? 1 : -1;
  const anchor = { x: panZoom.x - sx * half, y: panZoom.y - sy * half };
  const side = clamp(
    Math.max(Math.abs(pointer.x - anchor.x), Math.abs(pointer.y - anchor.y)),
    1 / MAX_ZOOM,
    1,
  );
  const scale = 1 / side;
  return {
    ...panZoom,
    ...clampCenter(
      anchor.x + (sx * side) / 2,
      anchor.y + (sy * side) / 2,
      scale,
    ),
    scale,
  };
}
