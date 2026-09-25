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
