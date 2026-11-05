import type { Demo } from "@rustrak/openshowcase-schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "../../mount";

// Video steps are already covered end-to-end by core/video-step.ts, core/video-clip-watcher.ts,
// and VideoLayer's component tests — this integration test focuses on the photo-step flow
// (the primary step-through experience) driven through the real, mounted player.
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

  const imageSources = () =>
    [...container.querySelectorAll("img")].map((img) =>
      img.getAttribute("src"),
    );

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
      expect(
        container.querySelector(".tooltip--visible")?.textContent,
      ).toContain("Click here"),
    );

    expect(onStepChange).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ id: "step-1" }),
    );
  });

  it("switches appearance and hotspot colors live, without remounting", async () => {
    player = new Player({ container, demo: createDemo() });
    player.mount();
    const hotspot = () =>
      container.querySelector<HTMLElement>('[aria-label="Hotspot"]');
    await vi.waitFor(() => expect(hotspot()).not.toBeNull());
    const root = container.querySelector(".openshowcase-player");
    const shownHotspot = hotspot();

    player.setAppearance("dark");
    expect(root?.classList.contains("openshowcase-player--dark")).toBe(true);
    player.setAppearance(undefined); // back to the demo's own (light)
    expect(root?.classList.contains("openshowcase-player--dark")).toBe(false);

    player.setHotspotStyle({ bgColor: "#0047ff" });
    expect(hotspot()?.style.getPropertyValue("--openshowcase-color")).toBe(
      "#0047ff",
    );
    expect(container.querySelector(".openshowcase-player")).toBe(root);
    expect(hotspot()).toBe(shownHotspot);
  });

  it.each([
    "url(https://evil.example/plain.png)",
    "red; background: url(https://evil.example/added.png)",
    "var(--x, url(https://evil.example/fallback.png))",
    "image-set('https://evil.example/set.png' 1x)",
  ])("loads nothing from a demo's color: %s", async (color) => {
    container.style.width = "800px";
    const onStepChange = vi.fn();
    const image = { src: TINY_PNG, width: 800, height: 600 };
    const hotspot = (x: number) => ({
      x,
      y: 0.4,
      label: "A hostile label",
      bgColor: color,
      textColor: color,
    });
    player = new Player({
      container,
      onStepChange,
      demo: {
        id: "hostile",
        title: "Hostile",
        theme: {
          wrapper: "browser",
          autoplay: true,
          appearance: "light",
          backdrop: { color, fill: "soft" },
        },
        steps: [
          { id: "a", type: "photo", image, hotspot: hotspot(0.3) },
          { id: "b", type: "photo", image, hotspot: hotspot(0.7) },
        ],
      },
    });
    player.mount();
    await vi.waitFor(() =>
      expect(container.querySelector(".tooltip--visible")).not.toBeNull(),
    );
    // both the glide's trail and the click's burst draw with it
    container.querySelector<HTMLElement>(".tooltip--visible")?.click();
    await new Promise((resolve) => setTimeout(resolve, 400));

    const hostile = performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.includes("evil.example"));
    expect(hostile.map((entry) => entry.name)).toEqual([]);
  });

  describe("controls", () => {
    const clipThenPhoto = (): Demo => ({
      id: "demo-controls",
      title: "Clip then photo",
      theme: { wrapper: "none", autoplay: false, appearance: "light" },
      video: {
        src: "data:video/webm;base64,",
        width: 800,
        height: 600,
        durationSec: 4,
      },
      steps: [
        {
          id: "clip",
          type: "video",
          startTime: 0,
          endTime: 3,
          playbackRate: 2,
        },
        {
          id: "photo",
          type: "photo",
          image: { src: TINY_PNG, width: 800, height: 600 },
          hotspot: { x: 0.5, y: 0.2, bgColor: "#ff0000" },
        },
      ],
    });
    const part = (selector: string) =>
      container.querySelector<HTMLElement>(selector);
    const navVisible = () => part(".navbar--visible") !== null;
    const moveTo = (fraction: number, pointerType = "mouse") => {
      const { top, height } = (
        part(".stage") as HTMLElement
      ).getBoundingClientRect();
      (part(".openshowcase-player") as HTMLElement).dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientY: top + height * fraction,
          pointerType,
        }),
      );
    };

    beforeEach(() => {
      container.style.width = "800px";
      vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    });

    it("shows the bar only with the pointer over the bottom 20% of the stage", () => {
      player = new Player({ container, demo: createDemo() });
      player.mount();

      moveTo(0.5);
      expect(navVisible()).toBe(false);
      moveTo(0.1);
      expect(navVisible()).toBe(false);
      moveTo(0.85);
      expect(navVisible()).toBe(true);
      moveTo(0.5);
      expect(navVisible()).toBe(false);

      moveTo(0.85);
      part(".openshowcase-player")?.dispatchEvent(
        new PointerEvent("pointerleave"),
      );
      expect(navVisible()).toBe(false);
    });

    it("shows the bar for a moment on a tap anywhere", () => {
      player = new Player({ container, demo: createDemo() });
      player.mount();

      moveTo(0.5, "touch");
      expect(navVisible()).toBe(false);
      part(".stage")?.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerType: "touch",
        }),
      );
      expect(navVisible()).toBe(true);
    });

    it("has play/pause and the clip's playback time in a clip, and neither on a photo", async () => {
      const onStepChange = vi.fn();
      player = new Player({ container, demo: clipThenPhoto(), onStepChange });
      player.mount();

      // 3s of video at 2x
      expect(part(".clip-time")?.textContent).toBe("0.0 / 1.5s");
      expect(part(".clip-toggle")).not.toBeNull();

      await vi.waitFor(() => expect(onStepChange).toHaveBeenCalled());
      player.next();
      expect(part(".clip-time")).toBeNull();
      expect(part(".clip-toggle")).toBeNull();
    });

    it("pauses and resumes the clip, and keeps the bar up while paused", async () => {
      const pause = vi.spyOn(HTMLMediaElement.prototype, "pause");
      const play = vi.mocked(HTMLMediaElement.prototype.play);
      player = new Player({ container, demo: clipThenPhoto() });
      player.mount();
      await vi.waitFor(() => expect(play).toHaveBeenCalled());
      const plays = play.mock.calls.length;
      moveTo(0.9);
      await vi.waitFor(() =>
        expect(
          getComputedStyle(part(".navbar") as HTMLElement).pointerEvents,
        ).toBe("auto"),
      );

      part(".clip-toggle")?.click();
      expect(pause).toHaveBeenCalled();
      expect(part(".clip-toggle")?.getAttribute("aria-label")).toBe("Play");
      moveTo(0.3);
      expect(navVisible()).toBe(true);

      part(".clip-toggle")?.click();
      expect(play.mock.calls.length).toBe(plays + 1);
      expect(part(".clip-toggle")?.getAttribute("aria-label")).toBe("Pause");
      expect(navVisible()).toBe(false);
    });

    it("plays again after moving on from a paused clip", async () => {
      const play = vi.mocked(HTMLMediaElement.prototype.play);
      const onStepChange = vi.fn();
      player = new Player({ container, demo: clipThenPhoto(), onStepChange });
      player.mount();
      await vi.waitFor(() => expect(play).toHaveBeenCalled());

      part(".clip-toggle")?.click();
      player.next();
      expect(navVisible()).toBe(false);
      player.goTo(0);
      expect(part(".clip-toggle")?.getAttribute("aria-label")).toBe("Pause");
    });

    it("takes the upcoming hotspot's color, or the override", () => {
      player = new Player({ container, demo: clipThenPhoto() });
      player.mount();
      const accent = () =>
        part(".navbar")?.style.getPropertyValue("--wd-accent");

      expect(accent()).toBe("#ff0000");
      player.setHotspotStyle({ bgColor: "#00ff00" });
      expect(accent()).toBe("#00ff00");
    });
  });

  describe("frame", () => {
    const part = (selector: string) =>
      container.querySelector<HTMLElement>(selector);
    const withTheme = (theme: Partial<Demo["theme"]>) => {
      const demo = createDemo();
      return { ...demo, theme: { ...demo.theme, ...theme } };
    };

    it("draws the demo's wrapper and backdrop", () => {
      player = new Player({
        container,
        demo: withTheme({
          wrapper: "bezel",
          backdrop: { color: "#ff0000", fill: "soft", padding: 8 },
        }),
      });
      player.mount();

      expect(part(".frame--bezel")).not.toBeNull();
      expect(part(".browser-chrome")).not.toBeNull();
      const backdrop = part(".frame-backdrop--on");
      expect(backdrop?.classList).toContain("frame-backdrop--soft");
      expect(getComputedStyle(backdrop as HTMLElement).backgroundColor).toBe(
        "rgb(255, 0, 0)",
      );
      // 8% of the 800px player
      container.style.width = "800px";
      expect(getComputedStyle(backdrop as HTMLElement).paddingLeft).toBe(
        "64px",
      );
    });

    it("defaults a backdrop's fill and padding", () => {
      container.style.width = "800px";
      player = new Player({
        container,
        demo: withTheme({ backdrop: { color: "#ff0000" } }),
      });
      player.mount();

      const backdrop = part(".frame-backdrop--on") as HTMLElement;
      expect(backdrop.className).not.toContain("frame-backdrop--solid");
      expect(getComputedStyle(backdrop).paddingLeft).toBe("40px");
    });

    it("lets the options override the demo's", () => {
      player = new Player({
        container,
        demo: withTheme({
          wrapper: "browser",
          backdrop: { color: "#ff0000" },
        }),
        wrapper: "none",
        backdrop: null,
      });
      player.mount();

      expect(part(".browser-chrome")).toBeNull();
      expect(part(".frame-backdrop--on")).toBeNull();
    });

    it("switches live, keeping the stage, and goes back to the demo's", () => {
      player = new Player({
        container,
        demo: withTheme({ wrapper: "none" }),
      });
      player.mount();
      const video = part("video");

      player.setWrapper("browser");
      expect(part(".frame--browser")).not.toBeNull();
      // the bar sits above the stage, not below it
      expect(part(".frame-window")?.firstElementChild?.className).toContain(
        "browser-chrome",
      );
      player.setWrapper("bezel");
      expect(part(".frame--browser")).toBeNull();
      expect(part(".frame--bezel")).not.toBeNull();
      player.setBackdrop({ color: "#00ff00", fill: "glow" });
      expect(part(".frame-backdrop--glow")).not.toBeNull();

      player.setWrapper(undefined);
      player.setBackdrop(undefined);
      expect(part(".browser-chrome")).toBeNull();
      expect(part(".frame-backdrop--on")).toBeNull();
      expect(part("video")).toBe(video);
    });

    it("keeps a demo's color from adding other styles", () => {
      player = new Player({
        container,
        demo: withTheme({
          backdrop: { color: "red; background: url(https://example.com/x)" },
        }),
      });
      player.mount();

      expect(
        part(".frame-backdrop")?.getAttribute("style") ?? "",
      ).not.toContain("url(");
    });

    it("doesn't clip the frame's shadow", () => {
      player = new Player({
        container,
        demo: withTheme({ wrapper: "browser" }),
      });
      player.mount();

      expect(
        getComputedStyle(part(".openshowcase-player") as HTMLElement).overflow,
      ).toBe("visible");
      expect(getComputedStyle(part(".frame") as HTMLElement).overflow).toBe(
        "visible",
      );
    });

    it("centers the title on the bar", () => {
      player = new Player({
        container,
        demo: withTheme({ wrapper: "browser" }),
      });
      player.mount();

      const center = (el: Element | null) => {
        const box = (el as Element).getBoundingClientRect();
        return box.left + box.width / 2;
      };
      expect(center(part(".browser-chrome__address"))).toBeCloseTo(
        center(part(".browser-chrome")),
        0,
      );
    });
  });

  it('follows prefers-color-scheme live with appearance "auto"', async () => {
    let listener: ((event: { matches: boolean }) => void) | undefined;
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      addEventListener: (_: string, fn: typeof listener) => {
        listener = fn;
      },
      removeEventListener: () => {
        listener = undefined;
      },
    } as unknown as MediaQueryList);
    player = new Player({ container, demo: createDemo(), appearance: "auto" });
    player.mount();
    const root = container.querySelector(".openshowcase-player");
    expect(root?.classList.contains("openshowcase-player--dark")).toBe(false);

    listener?.({ matches: true });
    expect(root?.classList.contains("openshowcase-player--dark")).toBe(true);

    player.destroy();
    expect(listener).toBeUndefined();
    player = undefined;
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

  describe("startWhenVisible", () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    // Below the fold: the page has to scroll before the player is seen
    beforeEach(() => {
      container.style.marginTop = "3000px";
      window.scrollTo(0, 0); // a previous test may have scrolled down to its player
    });

    it("holds a first video step until the player is on screen", async () => {
      const play = vi
        .spyOn(HTMLMediaElement.prototype, "play")
        .mockResolvedValue();
      player = new Player({
        container,
        startWhenVisible: true,
        demo: {
          id: "demo-v",
          title: "Video first",
          theme: { wrapper: "none", autoplay: false, appearance: "light" },
          video: {
            src: "data:video/webm;base64,",
            width: 800,
            height: 600,
            durationSec: 2,
          },
          steps: [{ id: "clip", type: "video", startTime: 0, endTime: 1 }],
        },
      });
      player.mount();

      await sleep(300);
      expect(play).not.toHaveBeenCalled();

      container.scrollIntoView();
      await vi.waitFor(() => expect(play).toHaveBeenCalled());
    });

    it("shows the first photo but reveals its hotspot only once on screen", async () => {
      player = new Player({
        container,
        startWhenVisible: true,
        demo: createDemo(),
      });
      player.mount();

      await vi.waitFor(() => expect(imageSources()).toContain(TINY_PNG));
      await sleep(300);
      expect(container.querySelector('[aria-label="Hotspot"]')).toBeNull();

      container.scrollIntoView();
      await vi.waitFor(() =>
        expect(
          container.querySelector('[aria-label="Hotspot"]'),
        ).not.toBeNull(),
      );
    });

    it("starts right away without it, even off screen", async () => {
      player = new Player({ container, demo: createDemo() });
      player.mount();
      await vi.waitFor(() =>
        expect(
          container.querySelector('[aria-label="Hotspot"]'),
        ).not.toBeNull(),
      );
    });
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

  it("shows a photo served by resolveAsset once it arrives", async () => {
    const demo = createDemo();
    for (const step of demo.steps)
      if (step.type === "photo") step.image.src = "assets/step.png";
    let deliver!: (url: string) => void;
    const resolveAsset = vi.fn(
      () => new Promise<string>((resolve) => (deliver = resolve)),
    );
    player = new Player({ container, demo, resolveAsset });
    player.mount();

    await vi.waitFor(() =>
      expect(resolveAsset).toHaveBeenCalledWith("assets/step.png"),
    );
    expect(container.querySelector('[aria-label="Hotspot"]')).toBeNull();

    deliver(TINY_PNG);
    await vi.waitFor(() =>
      expect(container.querySelector('[aria-label="Hotspot"]')).not.toBeNull(),
    );
    expect(imageSources()).toContain(TINY_PNG);
  });

  it("plays the video served by resolveAsset", async () => {
    const videoUrl = URL.createObjectURL(new Blob([], { type: "video/mp4" }));
    const demo: Demo = {
      ...createDemo(),
      video: {
        src: "assets/recording.mp4",
        width: 800,
        height: 600,
        durationSec: 2,
      },
    };
    const resolveAsset = vi.fn(async (src: string) =>
      src === "assets/recording.mp4" ? videoUrl : TINY_PNG,
    );
    player = new Player({ container, demo, resolveAsset });
    player.mount();

    await vi.waitFor(() =>
      expect(container.querySelector("video")?.getAttribute("src")).toBe(
        videoUrl,
      ),
    );
    URL.revokeObjectURL(videoUrl);
  });

  it("ignores a photo that arrives after its step was left", async () => {
    const demo = createDemo();
    const [first] = demo.steps;
    if (first?.type === "photo") first.image.src = "assets/slow.png";
    let deliverSlow!: (url: string) => void;
    const resolveAsset = (src: string) =>
      src === "assets/slow.png"
        ? new Promise<string>((resolve) => (deliverSlow = resolve))
        : src;
    player = new Player({ container, demo, resolveAsset });
    player.mount();

    player.goTo(1);
    await vi.waitFor(() => expect(imageSources()).toContain(TINY_PNG));
    deliverSlow("data:image/png;base64,stale");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(imageSources()).not.toContain("data:image/png;base64,stale");
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
