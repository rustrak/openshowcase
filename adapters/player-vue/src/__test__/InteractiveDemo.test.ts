import { buildDemoBundle } from "@rustrak/openshowcase-exporter";
import type { Demo } from "@rustrak/openshowcase-schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, h, reactive } from "vue";
import InteractiveDemo from "../InteractiveDemo.vue";

// Same cases as player-react's tests: the two adapters keep feature parity.
const demo: Demo = {
  id: "demo-1",
  title: "Test demo",
  theme: { wrapper: "none", autoplay: false, appearance: "light" },
  steps: [
    {
      id: "step-1",
      type: "photo",
      image: { src: "step-1.png", width: 800, height: 600 },
      hotspot: { x: 0.5, y: 0.5, label: "Click here" },
    },
  ],
};

async function pngBlob(): Promise<Blob> {
  const canvas = new OffscreenCanvas(8, 6);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillRect(0, 0, 8, 6);
  return canvas.convertToBlob({ type: "image/png" });
}

function serve(body: BodyInit, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status })),
  );
}

describe("<InteractiveDemo />", () => {
  let container: HTMLDivElement;
  let app: App | undefined;

  const render = (src: string) => {
    app = createApp({ render: () => h(InteractiveDemo, { src }) });
    app.mount(container);
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => {
    app?.unmount();
    app = undefined;
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const hotspot = () => container.querySelector('[aria-label="Hotspot"]');
  const imageSources = () =>
    [...container.querySelectorAll("img")].map((img) =>
      img.getAttribute("src"),
    );

  it("plays a steps.json, with its assets next to it", async () => {
    const png = URL.createObjectURL(await pngBlob());
    serve(
      JSON.stringify({
        ...demo,
        steps: [
          { ...demo.steps[0], image: { src: png, width: 800, height: 600 } },
        ],
      }),
    );
    render("/demos/a/steps.json");

    await vi.waitFor(() => expect(hotspot()).not.toBeNull());
    expect(imageSources()).toContain(png);
  });

  it("follows appearance and hotspotStyle changes without remounting", async () => {
    const png = URL.createObjectURL(await pngBlob());
    const props = reactive<Record<string, unknown>>({
      demo: {
        ...demo,
        steps: [
          { ...demo.steps[0], image: { src: png, width: 800, height: 600 } },
        ],
      },
    });
    app = createApp({ render: () => h(InteractiveDemo, props) });
    app.mount(container);
    await vi.waitFor(() => expect(hotspot()).not.toBeNull());
    const player = container.querySelector(".openshowcase-player");

    props.appearance = "dark";
    props.hotspotStyle = { bgColor: "#0047ff" };

    await vi.waitFor(() =>
      expect(player?.classList.contains("openshowcase-player--dark")).toBe(
        true,
      ),
    );
    expect(
      (hotspot() as HTMLElement).style.getPropertyValue("--openshowcase-color"),
    ).toBe("#0047ff");
    expect(container.querySelector(".openshowcase-player")).toBe(player);
  });

  it("plays a single-file bundle", async () => {
    const bundle = await buildDemoBundle({
      demo,
      imageBlobs: new Map([["step-1", await pngBlob()]]),
    });
    serve(bundle);
    render("/demos/a.openshowcase");

    await vi.waitFor(() => expect(hotspot()).not.toBeNull());
    expect(imageSources().some((src) => src?.startsWith("blob:"))).toBe(true);
  });

  it("frees the bundle's assets when unmounted", async () => {
    const bundle = await buildDemoBundle({
      demo,
      imageBlobs: new Map([["step-1", await pngBlob()]]),
    });
    serve(bundle);
    render("/demos/a.openshowcase");
    await vi.waitFor(() => expect(hotspot()).not.toBeNull());
    const photo = imageSources().find((src) => src?.startsWith("blob:"));
    const revoke = vi.spyOn(URL, "revokeObjectURL");

    app?.unmount();
    app = undefined;

    expect(revoke).toHaveBeenCalledWith(photo);
  });

  it("shows why a demo failed to load", async () => {
    serve("missing", 404);
    render("/demos/nope.openshowcase");

    await vi.waitFor(() =>
      expect(container.textContent).toContain("Failed to load demo: 404"),
    );
  });
});
