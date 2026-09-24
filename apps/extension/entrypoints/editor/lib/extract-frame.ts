/** Waits for metadata and a finite duration. New recordings are remuxed with a Duration (see offscreen/lib/remux.ts); raw MediaRecorder webm from older recordings reports Infinity. */
export async function ensureSeekable(video: HTMLVideoElement): Promise<void> {
  if (video.readyState < 1) {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      video.addEventListener(
        "error",
        () => reject(new Error("Could not load video metadata")),
        { once: true },
      );
    });
  }
  if (!Number.isFinite(video.duration)) {
    // Chrome only works out the real duration of a webm without Cues by seeking near its end.
    await new Promise<void>((resolve) => {
      video.currentTime = Number.MAX_SAFE_INTEGER;
      video.ontimeupdate = () => {
        video.ontimeupdate = null;
        video.currentTime = 0;
        resolve();
      };
    });
  }
}

export function extractFrame(
  video: HTMLVideoElement,
  timeSec: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    video.pause();

    let done = false;
    const capture = () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (!canvas.width || !canvas.height) {
        reject(new Error("Video has no dimensions yet"));
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get 2D context"));
        return;
      }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Could not extract frame")),
        "image/webp",
        0.9,
      );
    };

    // Capture only once the seek has landed: a frame callback registered earlier could fire
    // for a frame of a previous, still in-flight seek and grab the wrong image. After 'seeked',
    // prefer the next presented frame (requestVideoFrameCallback); a detached <video> may
    // never present one, so a short timer is the fallback, and a long one the safety net.
    const captureAfterSeek = () => {
      video.requestVideoFrameCallback(() => capture());
      setTimeout(capture, 80);
    };
    const timeout = setTimeout(capture, 2000);

    const target = Math.min(
      Math.max(0, timeSec),
      Number.isFinite(video.duration)
        ? Math.max(0, video.duration - 0.05)
        : timeSec,
    );
    // currentTime reflects a PENDING seek: if one is in flight (e.g. ensureSeekable's reset
    // to 0) the painted frame is still another one — seek again and wait for 'seeked'.
    if (!video.seeking && Math.abs(video.currentTime - target) < 0.01) {
      captureAfterSeek();
      return;
    }
    video.addEventListener("seeked", captureAfterSeek, { once: true });
    video.currentTime = target;
  });
}
