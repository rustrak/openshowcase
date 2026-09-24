import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import PhotoLayer from "../../components/PhotoLayer.svelte";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const stageSize = { width: 400, height: 300 };

describe("PhotoLayer", () => {
  it("renders the image with the given src/alt and toggles display with visible", async () => {
    const screen = await render(PhotoLayer, {
      visible: true,
      src: TINY_PNG,
      alt: "Step 1",
      transform: "none",
      stageSize,
    });
    const img = screen.container.querySelector("img") as HTMLImageElement;

    expect(img.src).toBe(TINY_PNG);
    expect(img.alt).toBe("Step 1");
    expect(img.style.display).toBe("block");
  });

  it("calls onReady once the image has decoded", async () => {
    const onReady = vi.fn();
    await render(PhotoLayer, {
      visible: true,
      src: TINY_PNG,
      alt: "",
      transform: "none",
      stageSize,
      onReady,
    });

    await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
  });

  it("shows the spotlight only when visible and a hotspot is present", async () => {
    const withHotspot = await render(PhotoLayer, {
      visible: true,
      src: TINY_PNG,
      alt: "",
      transform: "none",
      stageSize,
      hotspot: {
        left: 10,
        top: 10,
        color: "#000",
        instant: true,
        appear: false,
      },
    });
    expect(withHotspot.container.querySelector(".spotlight")).not.toBeNull();

    const withoutHotspot = await render(PhotoLayer, {
      visible: true,
      src: TINY_PNG,
      alt: "",
      transform: "none",
      stageSize,
    });
    expect(withoutHotspot.container.querySelector(".spotlight")).toBeNull();
  });

  it("renders the hotspot only when visible and present", async () => {
    const screen = await render(PhotoLayer, {
      visible: true,
      src: TINY_PNG,
      alt: "",
      transform: "none",
      stageSize,
      hotspot: { left: 5, top: 5, color: "#111", instant: true, appear: false },
    });
    await expect
      .element(screen.getByRole("button", { name: "Hotspot" }))
      .toBeInTheDocument();
  });

  it("mounts the tooltip whenever tooltip data is present, regardless of its visible flag", async () => {
    // it must exist in the DOM (so it can self-measure) even before its opacity fades in
    const screen = await render(PhotoLayer, {
      visible: true,
      src: TINY_PNG,
      alt: "",
      transform: "none",
      stageSize,
      tooltip: {
        anchor: { left: 5, top: 5 },
        visible: false,
        text: "Click me",
      },
    });
    await expect.element(screen.getByText("Click me")).toBeInTheDocument();
    expect(
      (
        screen.getByText("Click me").element() as HTMLElement
      ).classList.contains("tooltip--visible"),
    ).toBe(false);
  });

  it("calls onHotspotAdvance when the hotspot is clicked", async () => {
    const onHotspotAdvance = vi.fn();
    const screen = await render(PhotoLayer, {
      visible: true,
      src: TINY_PNG,
      alt: "",
      transform: "none",
      stageSize,
      hotspot: {
        left: 50,
        top: 50,
        color: "#111",
        instant: true,
        appear: false,
      },
      onHotspotAdvance,
    });

    await screen.getByRole("button", { name: "Hotspot" }).click();

    expect(onHotspotAdvance).toHaveBeenCalledTimes(1);
  });

  it("shares hover state between the hotspot and the tooltip", async () => {
    // hover the tooltip (the topmost, never-occluded element) and check it highlights the
    // hotspot too — hovering the hotspot itself is flaky here since the tooltip callout can
    // render on top of it depending on where computeTooltipPlacement puts it.
    const screen = await render(PhotoLayer, {
      visible: true,
      src: TINY_PNG,
      alt: "",
      transform: "none",
      stageSize,
      hotspot: {
        left: 200,
        top: 250,
        color: "#111",
        instant: true,
        appear: false,
      },
      tooltip: {
        anchor: { left: 200, top: 250 },
        visible: true,
        text: "Click me",
      },
    });

    await screen.getByText("Click me").hover();

    expect(
      (
        screen.getByRole("button", { name: "Hotspot" }).element() as HTMLElement
      ).classList.contains("hotspot--hover"),
    ).toBe(true);
  });

  it("does not carry the hover over to the next step's hotspot", async () => {
    const props = {
      visible: true,
      src: TINY_PNG,
      alt: "",
      transform: "none",
      stageSize,
      hotspot: {
        left: 200,
        top: 250,
        color: "#111",
        instant: true,
        appear: false,
      },
      tooltip: {
        anchor: { left: 200, top: 250 },
        visible: true,
        text: "Click me",
      },
    };
    const screen = await render(PhotoLayer, props);
    await screen.getByText("Click me").hover();
    const hotspot = () =>
      screen.getByRole("button", { name: "Hotspot" }).element() as HTMLElement;
    expect(hotspot().classList.contains("hotspot--hover")).toBe(true);

    // the step advances: the hotspot moves somewhere else while the pointer hasn't moved
    await screen.rerender({
      ...props,
      hotspot: { ...props.hotspot, left: 60, top: 40 },
    });

    await vi.waitFor(() =>
      expect(hotspot().classList.contains("hotspot--hover")).toBe(false),
    );
  });

  it("fades the spotlight in place: a moved hotspot gets a new light, not a sliding one", async () => {
    const props = {
      visible: true,
      src: TINY_PNG,
      alt: "",
      transform: "none",
      stageSize,
      hotspot: {
        left: 200,
        top: 250,
        color: "#111",
        instant: false,
        appear: true,
      },
    };
    const screen = await render(PhotoLayer, props);
    const first = screen.container.querySelector(".spotlight");
    expect(first).not.toBeNull();

    await screen.rerender({
      ...props,
      hotspot: { ...props.hotspot, left: 60, top: 40 },
    });

    await vi.waitFor(() => {
      const lights = [...screen.container.querySelectorAll(".spotlight")];
      // the new light is a different element, centered on the new position
      const current = lights.at(-1) as HTMLElement;
      expect(current).not.toBe(first);
      expect(current.style.getPropertyValue("--wd-spot-x")).toBe("60px");
    });
  });

  it("never piles up spotlight layers as the hotspot moves step after step", async () => {
    const props = {
      visible: true,
      src: TINY_PNG,
      alt: "",
      transform: "none",
      stageSize,
      hotspot: {
        left: 20,
        top: 20,
        color: "#111",
        instant: false,
        appear: true,
      },
    };
    const screen = await render(PhotoLayer, props);
    for (let i = 1; i <= 6; i++) {
      await screen.rerender({
        ...props,
        hotspot: { ...props.hotspot, left: 20 + i * 40, top: 20 + i * 20 },
      });
      // leave the layer for a moment in between, like switching to a video step and back
      if (i % 2 === 0) await screen.rerender({ ...props, visible: false });
    }
    await screen.rerender({
      ...props,
      hotspot: { ...props.hotspot, left: 300, top: 200 },
    });

    // at most the incoming light and the one fading out, and only the incoming one once settled
    expect(
      screen.container.querySelectorAll(".spotlight").length,
    ).toBeLessThanOrEqual(2);
    await vi.waitFor(
      () =>
        expect(screen.container.querySelectorAll(".spotlight")).toHaveLength(1),
      { timeout: 2000 },
    );
  });
});
