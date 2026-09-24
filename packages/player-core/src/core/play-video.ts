/**
 * Starts playback, swallowing the AbortError a pending `play()` rejects with when a
 * `pause()` or a new load interrupts it — routine when steps change quickly. Any other
 * failure (e.g. NotAllowedError from an autoplay policy) still rejects.
 */
export function playVideo(video: HTMLVideoElement): Promise<void> {
  return video.play().catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "AbortError") return;
    throw error;
  });
}
