import { describe, expect, it, vi } from "vitest";
import {
  VideoLayer,
  type VideoLayerProps,
} from "../../ui/VideoLayer/VideoLayer";
import { renderView } from "../render-view";

const render = (props: VideoLayerProps) => renderView(VideoLayer, props);

describe("VideoLayer", () => {
  it("toggles display based on visible and applies the transform style", async () => {
    const screen = await render({
      visible: true,
      transform: "scale(1.5) translate(2%, -3%)",
    });
    const video = screen.container.querySelector("video") as HTMLVideoElement;

    expect(video.style.display).toBe("block");
    expect(video.style.transform).toBe("scale(1.5) translate(2%, -3%)");
  });

  it("hides the element when visible is false", async () => {
    const screen = await render({
      visible: false,
      transform: "scale(1) translate(0%, 0%)",
    });
    const video = screen.container.querySelector("video") as HTMLVideoElement;

    expect(video.style.display).toBe("none");
  });

  it("is muted and plays inline", async () => {
    const screen = await render({
      visible: true,
      transform: "none",
    });
    const video = screen.container.querySelector("video") as HTMLVideoElement;

    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
  });

  it("calls onended when the video fires its native ended event", async () => {
    const onended = vi.fn();
    const screen = await render({
      visible: true,
      transform: "none",
      onended,
    });
    const video = screen.container.querySelector("video") as HTMLVideoElement;

    video.dispatchEvent(new Event("ended"));

    expect(onended).toHaveBeenCalledTimes(1);
  });

  it("follows prop changes: visibility, transform and its transition", async () => {
    const screen = await render({ visible: false, transform: "none" });
    const video = screen.container.querySelector("video") as HTMLVideoElement;

    await screen.rerender({
      visible: true,
      transform: "scale(2)",
      transformInstant: true,
    });

    expect(screen.container.querySelector("video")).toBe(video);
    expect(video.style.display).toBe("block");
    expect(video.style.transform).toBe("scale(2)");
    expect(video.style.transition).toBe("none");
  });
});
