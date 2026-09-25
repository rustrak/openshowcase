import type { Demo } from "@rustrak/openshowcase-schema";
import { useCallback, useRef } from "react";
import { planVideoClips } from "../core/video-clips";
import { encodeVideoClips } from "../lib/export-video";

export interface VideoExport {
  /** The demo with its video steps retimed onto `videoBlob`. */
  demo: Demo;
  /** Undefined when the demo has no video steps. */
  videoBlob?: Blob;
}

/**
 * Prepares the video half of an export: the played ranges of the recording, re-encoded (see
 * `lib/export-video.ts`), or the whole recording if encoding fails. The encode is cached by
 * the ranges it covers, so the size estimate and the download that follows share one encode,
 * and edits that keep the ranges (hotspots, zooms, titles) don't redo it.
 */
export function useVideoExport(recording: Blob | null | undefined) {
  const cache = useRef<{ key: string; blob: Promise<Blob | undefined> }>(
    undefined,
  );

  return useCallback(
    async (demo: Demo): Promise<VideoExport> => {
      const plan = planVideoClips(demo.steps);
      if (!plan || !recording) return { demo };

      const key = JSON.stringify(plan.segments);
      if (cache.current?.key !== key) {
        cache.current = {
          key,
          blob: encodeVideoClips(recording, plan.segments).catch((error) => {
            console.warn(
              "[openshowcase:export] video encode failed, shipping the whole recording",
              error,
            );
            return undefined;
          }),
        };
      }
      const blob = await cache.current.blob;
      if (!blob) return { demo, videoBlob: recording };

      return {
        demo: {
          ...demo,
          steps: plan.steps,
          video: demo.video && {
            ...demo.video,
            durationSec: plan.durationSec,
          },
        },
        videoBlob: blob,
      };
    },
    [recording],
  );
}
