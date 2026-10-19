import { resolveObjectURL } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDemo } from "../../core/load-demo";
import { makeZip, streamOf } from "./zip-fixture";

const demo = {
  id: "d1",
  title: "Demo",
  theme: { wrapper: "none", autoplay: false, appearance: "light" },
  steps: [
    {
      id: "s1",
      type: "photo",
      image: { src: "assets/step-1.webp", width: 10, height: 10 },
    },
  ],
};

const bundle = makeZip([
  { name: "steps.json", data: JSON.stringify(demo) },
  { name: "assets/step-1.webp", data: "photo bytes" },
  { name: "assets/recording.mp4", data: "video bytes".repeat(100) },
]);

function serve(
  body: ReadableStream<Uint8Array<ArrayBuffer>> | string,
  status = 200,
) {
  const fetchMock = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function contentOf(url: string) {
  const blob = resolveObjectURL(url);
  return { type: blob?.type, text: await blob?.text() };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadDemo", () => {
  it("loads a steps.json with its assets next to it", async () => {
    serve(JSON.stringify(demo));
    const loaded = await loadDemo("https://site.dev/demos/a/steps.json");
    expect(loaded.demo.id).toBe("d1");
    expect(loaded.assetBaseUrl).toBe("https://site.dev/demos/a");
    expect(loaded.resolveAsset).toBeUndefined();
  });

  it("keeps an explicit asset base URL", async () => {
    serve(JSON.stringify(demo));
    const loaded = await loadDemo("/a/steps.json", {
      assetBaseUrl: "https://cdn.dev/a",
    });
    expect(loaded.assetBaseUrl).toBe("https://cdn.dev/a");
  });

  it("loads a bundle, serving each asset as a typed blob URL", async () => {
    serve(streamOf(bundle, 32));
    const loaded = await loadDemo("/demos/a.openshowcase");
    expect(loaded.demo.steps[0]?.id).toBe("s1");

    const photo = await loaded.resolveAsset?.("assets/step-1.webp");
    expect(await contentOf(photo ?? "")).toEqual({
      type: "image/webp",
      text: "photo bytes",
    });
    const video = await loaded.resolveAsset?.("./assets/recording.mp4");
    expect((await contentOf(video ?? "")).type).toBe("video/mp4");
    loaded.dispose();
  });

  it("is ready before the bundle has finished downloading", async () => {
    const stream = streamOf(bundle, 32);
    serve(stream);
    const loaded = await loadDemo("/a.openshowcase");
    expect(stream.pulled()).toBeLessThan(bundle.length);
    loaded.dispose();
  });

  it("rejects an asset the bundle doesn't have, once it has fully arrived", async () => {
    serve(streamOf(bundle, 32));
    const loaded = await loadDemo("/a.openshowcase");
    await expect(loaded.resolveAsset?.("assets/nope.webp")).rejects.toThrow(
      /has no "assets\/nope.webp"/,
    );
  });

  it("stops the download and frees its URLs on dispose", async () => {
    const stream = streamOf(bundle, 8);
    serve(stream);
    const loaded = await loadDemo("/a.openshowcase");
    const photo = await loaded.resolveAsset?.("assets/step-1.webp");
    loaded.dispose();

    expect(resolveObjectURL(photo ?? "")).toBeUndefined();
    await expect(loaded.resolveAsset?.("assets/recording.mp4")).rejects.toThrow(
      /unloaded/,
    );
    const pulled = stream.pulled();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stream.pulled()).toBe(pulled);
    expect(pulled).toBeLessThan(bundle.length);
  });

  it("rejects a zip that doesn't start with steps.json", async () => {
    serve(streamOf(makeZip([{ name: "readme.txt", data: "hi" }])));
    await expect(loadDemo("/a.zip")).rejects.toThrow(
      /must start with steps.json/,
    );
  });

  it("rejects an HTML page served in place of the demo", async () => {
    serve("<!doctype html><html></html>");
    await expect(loadDemo("/a.openshowcase")).rejects.toThrow();
  });

  it("reports HTTP errors", async () => {
    serve("not found", 404);
    await expect(loadDemo("/a.openshowcase")).rejects.toThrow(/404/);
  });
});
