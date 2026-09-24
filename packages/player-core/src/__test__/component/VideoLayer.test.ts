import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import VideoLayer from "../../components/VideoLayer.svelte";

describe("VideoLayer", () => {
  it("toggles display based on visible and applies the transform style", async () => {
    const screen = await render(VideoLayer, {
      visible: true,
      transform: "scale(1.5) translate(2%, -3%)",
    });
    const video = screen.container.querySelector("video") as HTMLVideoElement;

    expect(video.style.display).toBe("block");
    expect(video.style.transform).toBe("scale(1.5) translate(2%, -3%)");
  });

  it("hides the element when visible is false", async () => {
    const screen = await render(VideoLayer, {
      visible: false,
      transform: "scale(1) translate(0%, 0%)",
    });
    const video = screen.container.querySelector("video") as HTMLVideoElement;

    expect(video.style.display).toBe("none");
  });

  it("is muted and plays inline", async () => {
    const screen = await render(VideoLayer, {
      visible: true,
      transform: "none",
    });
    const video = screen.container.querySelector("video") as HTMLVideoElement;

    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
  });

  it("calls onended when the video fires its native ended event", async () => {
    const onended = vi.fn();
    const screen = await render(VideoLayer, {
      visible: true,
      transform: "none",
      onended,
    });
    const video = screen.container.querySelector("video") as HTMLVideoElement;

    video.dispatchEvent(new Event("ended"));

    expect(onended).toHaveBeenCalledTimes(1);
  });
});
