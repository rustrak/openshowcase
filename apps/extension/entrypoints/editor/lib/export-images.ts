import type { AvifEncoding } from "../core/photo-encoding";
import type { AvifRequest, AvifResponse } from "./avif.worker";

/** Frames encoded at once: each encode is single-threaded (no cross-origin isolation here). */
const MAX_WORKERS = Math.max(
  1,
  Math.min(4, (navigator.hardwareConcurrency ?? 2) - 1),
);

/** An idle worker holds the encoder's wasm memory: close it once exporting is over. */
const IDLE_WORKER_MS = 30_000;

const idle: { worker: Worker; timer: ReturnType<typeof setTimeout> }[] = [];
let workerCount = 0;
const queue: (() => void)[] = [];
let nextId = 0;

/** Encodes are cached per frame and settings, so the size estimate and the download share them. */
const cache = new WeakMap<Blob, Map<string, Promise<Blob>>>();

/**
 * Encodes a photo step's frame as AVIF (see `core/photo-encoding.ts`). Falls back to the
 * frame itself if encoding fails; the exporter then turns it into WebP.
 */
export function encodePhoto(
  frame: Blob,
  encoding: AvifEncoding,
): Promise<Blob> {
  const key = JSON.stringify(encoding);
  let byEncoding = cache.get(frame);
  if (!byEncoding) {
    byEncoding = new Map();
    cache.set(frame, byEncoding);
  }
  let encoded = byEncoding.get(key);
  if (!encoded) {
    encoded = runInWorker(frame, encoding).catch((error: unknown) => {
      console.warn(
        "[openshowcase:export] AVIF encode failed, using WebP",
        error,
      );
      return frame;
    });
    byEncoding.set(key, encoded);
  }
  return encoded;
}

async function runInWorker(image: Blob, encoding: AvifEncoding): Promise<Blob> {
  const worker = await acquireWorker();
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const id = nextId++;
      worker.onmessage = ({ data }: MessageEvent<AvifResponse>) => {
        if (data.id !== id) return;
        if ("avif" in data) resolve(data.avif);
        else reject(new Error(data.error));
      };
      worker.onerror = (event) => reject(new Error(event.message));
      worker.postMessage({ id, image, encoding } satisfies AvifRequest);
    });
  } finally {
    releaseWorker(worker);
  }
}

async function acquireWorker(): Promise<Worker> {
  const free = idle.pop();
  if (free) {
    clearTimeout(free.timer);
    return free.worker;
  }
  if (workerCount < MAX_WORKERS) {
    workerCount += 1;
    return new Worker(new URL("./avif.worker.ts", import.meta.url), {
      type: "module",
    });
  }
  await new Promise<void>((resolve) => queue.push(resolve));
  return acquireWorker();
}

function releaseWorker(worker: Worker): void {
  const entry = {
    worker,
    timer: setTimeout(() => {
      idle.splice(idle.indexOf(entry), 1);
      workerCount -= 1;
      worker.terminate();
    }, IDLE_WORKER_MS),
  };
  idle.push(entry);
  queue.shift()?.();
}
