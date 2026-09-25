import type { Demo } from "@rustrak/openshowcase-schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "../../mount";

// Video steps are already covered end-to-end by core/video-step.ts, core/video-clip-watcher.ts,
// and VideoLayer's component tests — this integration test focuses on the photo-step flow
// (the primary step-through experience) driven through the real, mounted Player.svelte tree.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function createDemo(): Demo {
  return {
    id: "demo-1",
    title: "Test demo",
    theme: { wrapper: "none", autoplay: false, appearance: "light" },
    steps: [
      {
        id: "step-1",
        type: "photo",
        image: { src: TINY_PNG, width: 800, height: 600 },
        hotspot: { x: 0.5, y: 0.5, label: "Click here" },
      },
      {
        id: "step-2",
        type: "photo",
        image: { src: TINY_PNG, width: 800, height: 600 },
      },
      {
        id: "step-3",
        type: "photo",
        image: { src: TINY_PNG, width: 800, height: 600 },
        hotspot: { x: 0.2, y: 0.2, label: "Last step" },
      },
    ],
  };
}

describe("Player (mount.ts) integration", () => {
  let container: HTMLElement;
  let player: Player | undefined;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    player?.destroy();
    container.remove();
  });

  it("mounts, decodes the first photo, and reveals its hotspot with the delayed tooltip", async () => {
    const onStepChange = vi.fn();
    player = new Player({ container, demo: createDemo(), onStepChange });
    player.mount();

    await vi.waitFor(() =>
      expect(container.querySelector('[aria-label="Hotspot"]')).not.toBeNull(),
    );
    await vi.waitFor(() =>
      expect(container.querySelector(".tooltip--visible")?.textContent).toBe(
        "Click here",
      ),
    );

    expect(onStepChange).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ id: "step-1" }),
    );
  });

  it("advances to the next step when the hotspot is clicked", async () => {
    const onStepChange = vi.fn();
    player = new Player({ container, demo: createDemo(), onStepChange });
    player.mount();

    await vi.waitFor(() =>
      expect(container.querySelector('[aria-label="Hotspot"]')).not.toBeNull(),
    );
    (
      container.querySelector('[aria-label="Hotspot"]') as HTMLButtonElement
    ).click();

    await vi.waitFor(() =>
      expect(onStepChange).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ id: "step-2" }),
      ),
    );
    expect(player.currentIndex).toBe(1);
  });

  it("advances on a background click when the current photo has no hotspot", async () => {
    player = new Player({ container, demo: createDemo() });
    player.mount();
    // wait out the initial render before navigating, same as every other test here —
    // otherwise a goTo() right after mount() can race the mount's own initial renderStep(0)
    await vi.waitFor(() =>
      expect(container.querySelector('[aria-label="Hotspot"]')).not.toBeNull(),
    );

    player.goTo(1); // step-2 has no hotspot
    const stage = container.querySelector(".stage") as HTMLElement;
    stage.click();

    await vi.waitFor(() => expect(player!.currentIndex).toBe(2));
  });

  it("navigates with ArrowRight/ArrowLeft keyboard events", async () => {
    player = new Player({ container, demo: createDemo() });
    player.mount();

    const root = container.querySelector(".openshowcase-player") as HTMLElement;
    root.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(player.currentIndex).toBe(1);

    root.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
    );
    expect(player.currentIndex).toBe(0);
  });

  it("jumps directly to a step when its navbar segment is clicked", async () => {
    player = new Player({ container, demo: createDemo() });
    player.mount();

    const segments = container.querySelectorAll(".segment");
    expect(segments).toHaveLength(3);
    (segments[2] as HTMLButtonElement).click();

    expect(player.currentIndex).toBe(2);
  });

  it("reveals the photo's hotspot again after seeking back to the video step before it", async () => {
    // no real clip to decode here: play() is stubbed and the video step is ended by hand
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const onStepChange = vi.fn();
    player = new Player({
      container,
      onStepChange,
      demo: {
        id: "demo-2",
        title: "Video then photo",
        theme: { wrapper: "none", autoplay: false, appearance: "light" },
        video: {
          src: "data:video/webm;base64,",
          width: 800,
          height: 600,
          durationSec: 2,
        },
        steps: [
          { id: "clip", type: "video", startTime: 0, endTime: 1 },
          {
            id: "photo",
            type: "photo",
            image: { src: TINY_PNG, width: 800, height: 600 },
            hotspot: { x: 0.5, y: 0.5, label: "Click here" },
          },
        ],
      },
    });
    player.mount();
    const hotspot = () => container.querySelector('[aria-label="Hotspot"]');
    // wait out the initial render before navigating (see the background-click test)
    await vi.waitFor(() => expect(onStepChange).toHaveBeenCalled());

    player.next();
    await vi.waitFor(() => expect(hotspot()).not.toBeNull());

    player.goTo(0);
    await vi.waitFor(() => expect(hotspot()).toBeNull());

    player.next();
    await vi.waitFor(() => expect(hotspot()).not.toBeNull());
  });

  it("carries a zoomed photo's framing straight into the zoomed video step after it", async () => {
    // no real clip to decode here: play() is stubbed and the video step never ends
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const onStepChange = vi.fn();
    player = new Player({
      container,
      onStepChange,
      demo: {
        id: "demo-3",
        title: "Zoomed photo then zoomed video",
        theme: { wrapper: "none", autoplay: false, appearance: "light" },
        video: {
          src: "data:video/webm;base64,",
          width: 800,
          height: 600,
          durationSec: 10,
        },
        steps: [
          {
            id: "photo",
            type: "photo",
            image: { src: TINY_PNG, width: 800, height: 600 },
            panZoom: { x: 0.2, y: 0.3, scale: 2 },
          },
          {
            id: "clip",
            type: "video",
            startTime: 0,
            // long enough that the zoom-out cue before the clip's end doesn't fire right away
            endTime: 5,
            panZoom: { x: 0.7, y: 0.6, scale: 1.5 },
          },
        ],
      },
    });
    player.mount();
    await vi.waitFor(() => expect(onStepChange).toHaveBeenCalled());
    const video = container.querySelector("video") as HTMLVideoElement;
    const transforms: string[] = [];
    new MutationObserver(() => transforms.push(video.style.transform)).observe(
      video,
      { attributes: true, attributeFilter: ["style"] },
    );

    player.next();

    await vi.waitFor(() => expect(video.style.display).toBe("block"));
    await vi.waitFor(() =>
      expect(video.style.transform).toContain("scale(1.5)"),
    );
    expect(transforms[0]).toContain("scale(2)");
    expect(transforms.some((t) => /scale\(1\)/.test(t))).toBe(false);
  });

  it("carries a zoomed video's framing straight into the zoomed photo step after it", async () => {
    // no real clip to decode here: play() is stubbed and the video step is ended by hand
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const onStepChange = vi.fn();
    player = new Player({
      container,
      onStepChange,
      demo: {
        id: "demo-4",
        title: "Zoomed video then zoomed photo",
        theme: { wrapper: "none", autoplay: false, appearance: "light" },
        video: {
          src: "data:video/webm;base64,",
          width: 800,
          height: 600,
          durationSec: 10,
        },
        steps: [
          {
            id: "clip",
            type: "video",
            startTime: 0,
            endTime: 5,
            panZoom: { x: 0.7, y: 0.6, scale: 1.5 },
          },
          {
            id: "photo",
            type: "photo",
            image: { src: TINY_PNG, width: 800, height: 600 },
            hotspot: { x: 0.5, y: 0.5, label: "Click here" },
            panZoom: { x: 0.2, y: 0.3, scale: 2 },
          },
        ],
      },
    });
    player.mount();
    await vi.waitFor(() => expect(onStepChange).toHaveBeenCalled());
    const img = container.querySelector(
      "img.media:last-of-type",
    ) as HTMLImageElement;
    const shownTransforms: string[] = [];
    new MutationObserver(() => {
      if (img.style.display === "block")
        shownTransforms.push(img.style.transform);
    }).observe(img, { attributes: true, attributeFilter: ["style"] });

    player.next();

    await vi.waitFor(() => expect(img.style.transform).toContain("scale(2)"));
    expect(shownTransforms[0]).toContain("scale(1.5)");
    expect(shownTransforms.some((t) => /scale\(1\)/.test(t))).toBe(false);
  });

  it("moves straight from one zoomed photo's framing to the next one's", async () => {
    const onStepChange = vi.fn();
    const demo = createDemo();
    demo.steps = [
      {
        id: "zoom-a",
        type: "photo",
        image: { src: TINY_PNG, width: 800, height: 600 },
        panZoom: { x: 0.7, y: 0.6, scale: 1.5, duration: 50 },
      },
      {
        id: "zoom-b",
        type: "photo",
        image: { src: TINY_PNG, width: 800, height: 600 },
        panZoom: { x: 0.2, y: 0.3, scale: 2 },
      },
    ];
    player = new Player({ container, demo, onStepChange });
    player.mount();
    const img = container.querySelector(
      "img.media:last-of-type",
    ) as HTMLImageElement;
    await vi.waitFor(() => expect(img.style.transform).toContain("scale(1.5)"));
    const transforms: string[] = [];
    new MutationObserver(() => transforms.push(img.style.transform)).observe(
      img,
      { attributes: true, attributeFilter: ["style"] },
    );

    player.next();

    await vi.waitFor(() => expect(img.style.transform).toContain("scale(2)"));
    expect(transforms.some((t) => /scale\(1\)/.test(t))).toBe(false);
  });

  it("destroys cleanly, leaving the container empty", async () => {
    player = new Player({ container, demo: createDemo() });
    player.mount();
    await vi.waitFor(() =>
      expect(container.querySelector(".openshowcase-player")).not.toBeNull(),
    );

    player.destroy();

    expect(container.querySelector(".openshowcase-player")).toBeNull();
  });
});
