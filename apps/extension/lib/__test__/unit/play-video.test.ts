import { describe, expect, it, vi } from "vitest";
import { playVideo } from "@/lib/play-video";

function videoRejectingWith(name: string) {
  return {
    play: vi.fn(() => Promise.reject(new DOMException("play() failed", name))),
  } as unknown as HTMLVideoElement;
}

describe("playVideo", () => {
  it("resolves when playback starts", async () => {
    const video = {
      play: vi.fn(() => Promise.resolve()),
    } as unknown as HTMLVideoElement;
    await expect(playVideo(video)).resolves.toBeUndefined();
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it("ignores the AbortError of a play() interrupted by pause() or a new load", async () => {
    await expect(
      playVideo(videoRejectingWith("AbortError")),
    ).resolves.toBeUndefined();
  });

  it("rethrows any other failure, e.g. an autoplay policy block", async () => {
    await expect(
      playVideo(videoRejectingWith("NotAllowedError")),
    ).rejects.toMatchObject({ name: "NotAllowedError" });
  });
});
