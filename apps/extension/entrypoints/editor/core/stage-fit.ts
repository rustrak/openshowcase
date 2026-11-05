/** What the player's frame adds around the media. */
export interface FrameSize {
  /** Height of the browser bar above the media, in px. */
  chrome?: number;
  /** The bezel's thickness on every side, in px. */
  inset?: number;
  /** The backdrop's margin on every side, as a fraction of the player's outer width. */
  pad?: number;
}

/**
 * Size of the demo media inside the stage: as large as possible while keeping the
 * recording's aspect ratio ("contain"), with room for its frame around it. Sizing the media
 * box exactly (instead of letting CSS letterbox it) keeps hotspot/zoom overlays in the same
 * coordinate space as the pixels under them. `outerWidth`/`outerHeight` include the frame:
 * the player takes `outerWidth` as its own width.
 */
export function fitStage(
  available: { width: number; height: number },
  aspectRatio: number,
  { chrome = 0, inset = 0, pad = 0 }: FrameSize = {},
): { width: number; height: number; outerWidth: number; outerHeight: number } {
  // Of the outer width, the media and the bezel get `share`; the backdrop's margin the rest
  const share = 1 - 2 * pad;
  const marginPerMedia = (2 * pad) / share;
  const byWidth = available.width * share - 2 * inset;
  const byHeight =
    (available.height - chrome - 2 * inset - marginPerMedia * 2 * inset) /
    (marginPerMedia + 1 / aspectRatio);
  const width = Math.floor(Math.max(0, Math.min(byWidth, byHeight)));
  const height = Math.floor(width / aspectRatio);
  if (width === 0) return { width, height, outerWidth: 0, outerHeight: 0 };

  const outerWidth = Math.round((width + 2 * inset) / share);
  return {
    width,
    height,
    outerWidth,
    outerHeight: Math.round(height + chrome + 2 * inset + 2 * pad * outerWidth),
  };
}
