import type { PanZoom } from "@rustrak/openshowcase-schema";

/** libavif encoder settings (the subset of @jsquash/avif's options the export sets). */
export interface AvifEncoding {
  /** 0-100. */
  quality: number;
  /** 0 (slowest, smallest) to 10. Above 6 visibly loses quality on UI text. */
  speed: number;
  /** 3 = 4:4:4. The recording is already 4:2:0; halving color again smears colored text. */
  subsample: number;
  /** 2 = SSIM. */
  tune: number;
  bitDepth: number;
}

/**
 * How a photo step's frame is encoded at export. Measured on UI frames (SSIMULACRA2 against
 * the decoded recording frame, 90 = visually lossless): quality 75 scores ~91 at about 20%
 * fewer bytes than WebP of the same score. A zoomed photo is shown enlarged, so it gets 82.
 */
export function photoEncoding(panZoom: PanZoom | undefined): AvifEncoding {
  return {
    quality: (panZoom?.scale ?? 1) > 1 ? 82 : 75,
    speed: 6,
    subsample: 3,
    tune: 2,
    bitDepth: 8,
  };
}
