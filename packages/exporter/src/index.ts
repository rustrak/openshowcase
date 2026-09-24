import type { Demo } from "@rustrak/openshowcase-schema";
import JSZip from "jszip";
import { blobToWebp } from "./image";

export { blobToWebp } from "./image";

export interface BuildDemoBundleOptions {
  demo: Demo;
  /** Continuous recording (webm). Only needed if the demo has video steps. */
  videoBlob?: Blob;
  /** Frame of each photo step, keyed by step id. */
  imageBlobs: Map<string, Blob>;
  /** WebP quality (0-1) of the photo frames. @default 0.85 */
  imageQuality?: number;
}

/**
 * Pure-data bundle for `<InteractiveDemo src="…/steps.json" />` from
 * `@rustrak/openshowcase-player-react`: steps.json + assets/ (webp + webm). No runtime inside.
 */
export async function buildDemoBundle({
  demo,
  videoBlob,
  imageBlobs,
  imageQuality,
}: BuildDemoBundleOptions): Promise<Blob> {
  const zip = new JSZip();
  const assets = zip.folder("assets");
  if (!assets) throw new Error("Could not create assets/ folder in zip");

  const steps = [];
  let photoIndex = 0;
  for (const step of demo.steps) {
    if (step.type !== "photo") {
      steps.push(step);
      continue;
    }
    photoIndex += 1;
    const source = imageBlobs.get(step.id);
    if (!source)
      throw new Error(`Missing image blob for photo step ${step.id}`);
    const filename = `step-${photoIndex}.webp`;
    assets.file(filename, await blobToWebp(source, imageQuality));
    steps.push({
      ...step,
      image: { ...step.image, src: `assets/${filename}` },
    });
  }

  let video = demo.video;
  if (video && videoBlob) {
    assets.file("recording.webm", videoBlob);
    video = { ...video, src: "assets/recording.webm" };
  } else if (!videoBlob) {
    video = undefined;
  }

  const exportedDemo: Demo = { ...demo, video, steps };
  zip.file("steps.json", JSON.stringify(exportedDemo, null, 2));

  return zip.generateAsync({ type: "blob" });
}
