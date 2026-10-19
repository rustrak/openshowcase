import type { Demo } from "@rustrak/openshowcase-schema";
import JSZip from "jszip";
import { blobToWebp } from "./image";

export { blobToWebp } from "./image";

export interface BuildDemoBundleOptions {
  demo: Demo;
  /**
   * The video the demo's video steps play (webm or mp4, named after its type). Only needed if
   * the demo has video steps.
   */
  videoBlob?: Blob;
  /** Frame of each photo step, keyed by step id: AVIF ships as is, anything else as WebP. */
  imageBlobs: Map<string, Blob>;
  /** WebP quality (0-1) of the photo frames. @default 0.85 */
  imageQuality?: number;
}

/**
 * Pure-data bundle for `<InteractiveDemo src="…" />` from `@rustrak/openshowcase-player-react`:
 * steps.json + assets/ (webp + mp4/webm). No runtime inside.
 *
 * The same bytes are the single-file `.openshowcase` format, which the player reads front to
 * back while it downloads. So the layout is fixed: uncompressed entries (images and video are
 * compressed already) with their sizes in the local headers, no folder entries, steps.json
 * first, then each asset where a step first uses it, so the opening step shows as early as
 * the download allows.
 */
export async function buildDemoBundle({
  demo,
  videoBlob,
  imageBlobs,
  imageQuality,
}: BuildDemoBundleOptions): Promise<Blob> {
  const assets: [path: string, data: Blob][] = [];
  const video =
    demo.video && videoBlob
      ? {
          ...demo.video,
          src: `assets/recording.${videoBlob.type.includes("mp4") ? "mp4" : "webm"}`,
        }
      : undefined;
  const addVideo = () => {
    if (video && videoBlob && !assets.some(([path]) => path === video.src))
      assets.push([video.src, videoBlob]);
  };

  const steps = [];
  let photoIndex = 0;
  for (const step of demo.steps) {
    if (step.type !== "photo") {
      addVideo();
      steps.push(step);
      continue;
    }
    photoIndex += 1;
    const source = imageBlobs.get(step.id);
    if (!source)
      throw new Error(`Missing image blob for photo step ${step.id}`);
    // Frames the caller already encoded as AVIF ship as is; anything else becomes WebP
    const image =
      source.type === "image/avif"
        ? source
        : await blobToWebp(source, imageQuality);
    const path = `assets/step-${photoIndex}.${image.type === "image/avif" ? "avif" : "webp"}`;
    assets.push([path, image]);
    steps.push({ ...step, image: { ...step.image, src: path } });
  }

  // A video no step plays still ships, after the photos
  addVideo();

  const exportedDemo: Demo = { ...demo, video, steps };
  const zip = new JSZip();
  zip.file("steps.json", JSON.stringify(exportedDemo, null, 2));
  for (const [path, data] of assets)
    zip.file(path, data, { createFolders: false });

  return zip.generateAsync({
    type: "blob",
    compression: "STORE",
    streamFiles: false,
  });
}
