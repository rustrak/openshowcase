import { ensureSeekable, extractFrame } from "./extract-frame";

/**
 * Serial queue over a single hidden <video>: concurrent seeks clobber each other, so each
 * extraction waits for the previous one to finish (and for the video to be seekable).
 */
export class FrameExtractor {
  private queue: Promise<unknown>;

  constructor(private readonly video: HTMLVideoElement) {
    this.queue = ensureSeekable(video);
  }

  extract(timeSec: number): Promise<Blob> {
    const job = this.queue.then(() => extractFrame(this.video, timeSec));
    this.queue = job.catch(() => {});
    return job;
  }
}
