/** Longest believable delay between a frame's capture and its delivery to us. */
const MAX_DELIVERY_MS = 1000;

/**
 * Wall-clock (Date.now()) time a captured frame was actually CAPTURED.
 *
 * A `VideoFrame` read from a MediaStreamTrackProcessor carries its capture time on this
 * context's `performance.now()` clock (measured: it arrives a steady ~12ms later), so the
 * capture instant is the arrival wall time minus that delay — both sides of the subtraction
 * come from the same context, which keeps it immune to the cross-context clock drift
 * described in lib/press-timing.ts. If the timestamp is on some other time base (absurd
 * delay), fall back to the arrival time.
 */
export function frameCaptureWallMs({
  arrivalWallMs,
  arrivalPerfMs,
  frameTimestampUs,
}: {
  arrivalWallMs: number;
  arrivalPerfMs: number;
  frameTimestampUs: number;
}): number {
  const deliveryMs = arrivalPerfMs - frameTimestampUs / 1000;
  if (deliveryMs < 0 || deliveryMs > MAX_DELIVERY_MS) return arrivalWallMs;
  return arrivalWallMs - deliveryMs;
}
