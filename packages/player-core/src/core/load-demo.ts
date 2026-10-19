import { type Demo, parseDemo } from "@rustrak/openshowcase-schema";
import { readStoredZip, type ZipEntry } from "./stored-zip";

/** Maps an asset `src` from the demo to a URL the page can load. */
export type AssetResolver = (src: string) => string | Promise<string>;

export interface LoadedDemo {
  demo: Demo;
  /** Base URL for the demo's relative asset paths (a `steps.json` source). */
  assetBaseUrl?: string;
  /** Serves the assets of a bundle source as they finish downloading. */
  resolveAsset?: AssetResolver;
  /** Stops a bundle's download and frees its asset URLs. Call it once the player is gone. */
  dispose(): void;
}

export interface LoadDemoOptions {
  /** Overrides the asset base URL inferred from a `steps.json` source. */
  assetBaseUrl?: string;
  signal?: AbortSignal;
}

/** A bundle is a zip: it opens with a local file header. */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const BUNDLE_MANIFEST = "steps.json";

const MIME_TYPES: Record<string, string> = {
  avif: "image/avif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
};

/**
 * Loads a demo from `src`: either a `steps.json` (assets are fetched next to it) or a single
 * bundle file (`.openshowcase`, or the exported `.zip`), told apart by its first bytes.
 *
 * A bundle is read in one streaming request: the demo is ready as soon as `steps.json` (its
 * first entry) arrives, and each asset as soon as its own bytes do. The exporter orders
 * assets by first use, so the first step shows long before the download ends.
 */
export async function loadDemo(
  src: string,
  { assetBaseUrl, signal }: LoadDemoOptions = {},
): Promise<LoadedDemo> {
  // Owned here so dispose() can stop a bundle mid-download (AbortSignal.any needs Safari 17.4)
  const download = new AbortController();
  signal?.addEventListener("abort", () => download.abort(signal.reason), {
    once: true,
  });
  const response = await fetch(src, { signal: download.signal });
  if (!response.ok)
    throw new Error(
      `Failed to load demo: ${response.status} ${response.statusText}`,
    );
  if (!response.body) throw new Error("Failed to load demo: empty response");

  const [head, stream] = await peek(response.body, ZIP_MAGIC.length);
  if (!ZIP_MAGIC.every((byte, i) => head[i] === byte)) {
    const demo = parseDemo(JSON.parse(await new Response(stream).text()));
    return {
      demo,
      assetBaseUrl: assetBaseUrl ?? src.slice(0, src.lastIndexOf("/")),
      dispose() {},
    };
  }
  return openBundle(stream, download);
}

async function openBundle(
  stream: ReadableStream<Uint8Array<ArrayBuffer>>,
  download: AbortController,
): Promise<LoadedDemo> {
  const entries = readStoredZip(stream, download.signal);
  let demo: Demo;
  try {
    const first = await entries.next();
    if (first.done || first.value.name !== BUNDLE_MANIFEST)
      throw new Error(
        `Not an OpenShowcase bundle: it must start with ${BUNDLE_MANIFEST}`,
      );
    demo = parseDemo(JSON.parse(await new Blob(first.value.parts).text()));
  } catch (error) {
    await entries.return(undefined);
    throw error;
  }

  // The rest downloads in the background; the player asks for each asset when it needs it
  const assets = new BundleAssets();
  void (async () => {
    try {
      for await (const entry of entries) assets.add(entry);
      assets.end();
    } catch (error) {
      assets.end(error);
    }
  })();

  return {
    demo,
    resolveAsset: (src) => assets.url(src),
    dispose() {
      download.abort();
      assets.dispose();
    },
  };
}

/** The bundle's files as blob: URLs, handed out as each one finishes downloading. */
class BundleAssets {
  private readonly urls = new Map<string, string>();
  private readonly waiting = new Map<
    string,
    { resolve: (url: string) => void; reject: (error: unknown) => void }[]
  >();
  private failure: unknown;
  private ended = false;

  url(src: string): Promise<string> {
    const name = src.replace(/^\.?\//, "");
    const url = this.urls.get(name);
    if (url) return Promise.resolve(url);
    if (this.ended)
      return Promise.reject(
        this.failure ?? new Error(`The demo bundle has no "${name}"`),
      );
    return new Promise((resolve, reject) => {
      const list = this.waiting.get(name) ?? [];
      list.push({ resolve, reject });
      this.waiting.set(name, list);
    });
  }

  add({ name, parts }: ZipEntry): void {
    if (this.ended) return;
    const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
    const url = URL.createObjectURL(
      new Blob(parts, { type: MIME_TYPES[extension] ?? "" }),
    );
    this.urls.set(name, url);
    for (const { resolve } of this.waiting.get(name) ?? []) resolve(url);
    this.waiting.delete(name);
  }

  end(failure?: unknown): void {
    if (this.ended) return;
    this.ended = true;
    this.failure = failure;
    for (const [name, list] of this.waiting)
      for (const { reject } of list)
        reject(failure ?? new Error(`The demo bundle has no "${name}"`));
    this.waiting.clear();
  }

  dispose(): void {
    this.end(new Error("The demo was unloaded"));
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}

/** Reads the stream's first `length` bytes and returns them with a stream that replays them. */
async function peek(
  body: ReadableStream<Uint8Array<ArrayBuffer>>,
  length: number,
): Promise<[Uint8Array, ReadableStream<Uint8Array<ArrayBuffer>>]> {
  const reader = body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  while (size < length) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  const head = new Uint8Array(Math.min(size, length));
  let at = 0;
  for (const chunk of chunks) {
    if (at >= head.length) break;
    head.set(chunk.subarray(0, head.length - at), at);
    at += chunk.length;
  }
  const replay = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
    },
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  return [head, replay];
}
