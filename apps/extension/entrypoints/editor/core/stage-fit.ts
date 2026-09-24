/**
 * Size of the demo media inside the stage: as large as possible while keeping the
 * recording's aspect ratio ("contain"), with `chromeHeight` px reserved above it for the
 * browser wrapper bar. Sizing the media box exactly (instead of letting CSS letterbox it)
 * keeps hotspot/zoom overlays in the same coordinate space as the pixels under them.
 */
export function fitStage(
  available: { width: number; height: number },
  aspectRatio: number,
  chromeHeight: number,
): { width: number; height: number } {
  const maxHeight = Math.max(0, available.height - chromeHeight);
  const width = Math.max(0, Math.min(available.width, maxHeight * aspectRatio));
  return { width: Math.floor(width), height: Math.floor(width / aspectRatio) };
}
