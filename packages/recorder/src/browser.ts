import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContext, chromium, type Worker } from "playwright";

interface TimeRange {
  start: number;
  end: number;
}

/**
 * What the flow asks of the recording, in wall-clock ms (the clock of the extension's
 * markers). Mirrors `Direction` in apps/extension/lib/direction.ts: keep in sync.
 */
export interface Direction {
  /** Clicks with a tooltip, zoom or hotspot choice, matched to click markers by time. */
  clicks: (TimeRange & { label?: string; zoom?: number; hotspot?: boolean })[];
  /** Waits for the app, cut out of the video. */
  cuts: TimeRange[];
  /** Actions to frame the clip on (centers as fractions of the page). */
  zooms: (TimeRange & { x: number; y: number; scale: number })[];
  /** The flow's `title`: the demo's name in the editor. */
  title?: string;
}

/** The extension's automation API (apps/extension/lib/automation.ts). Keep in sync. */
interface Automation {
  start(): Promise<string>;
  stop(recordingId: string): Promise<void>;
  exportFile(recordingId: string, direction: Direction): Promise<number>;
  readChunk(offset: number, length: number): Promise<string>;
}

export const DEFAULT_PROFILE_DIR = join(homedir(), ".openshowcase", "profile");

/** The extension the published package ships next to this file (see rslib.config.ts). */
export const BUNDLED_EXTENSION_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "extension",
);

/** Chromium's id for an unpacked extension: its path's SHA-256, first 32 hex digits as a–p. */
export function extensionIdForPath(path: string): string {
  const hex = createHash("sha256").update(path).digest("hex").slice(0, 32);
  return [...hex]
    .map((digit) => String.fromCharCode(97 + Number.parseInt(digit, 16)))
    .join("");
}

export interface LaunchOptions {
  profileDir: string;
  extensionDir: string;
  headless: boolean;
  viewport?: { width: number; height: number };
  /** Write to the profile itself (login). Otherwise the run works on a throwaway copy. */
  keepChanges?: boolean;
}

export interface Launched {
  context: BrowserContext;
  /** The extension's service worker, where `globalThis.openshowcase` lives. */
  worker: Worker;
  /** Closes the browser, then deletes the profile copy it ran on. */
  close: () => Promise<void>;
}

/**
 * A persistent Chromium (the profile keeps the user's logins) with the extension loaded.
 * The two allowlist flags let the extension capture a tab without the toolbar click
 * tabCapture otherwise requires. `chromium` channel: Chrome-branded builds drop
 * --load-extension, and new headless runs extensions.
 */
export async function launch(options: LaunchOptions): Promise<Launched> {
  const extensionDir = realpathSync(options.extensionDir);
  const id = extensionIdForPath(extensionDir);
  const { width, height } = options.viewport ?? { width: 1280, height: 800 };
  const userDataDir = options.keepChanges
    ? options.profileDir
    : await scratchCopy(options.profileDir);
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: options.headless,
    // The real window size, not Playwright's viewport emulation: tabCapture records the
    // real tab, so an emulated viewport would make click positions disagree with the video.
    viewport: null,
    args: [
      `--window-size=${width},${height}`,
      // Retina-sharp capture: the extension records at 2x the tab's CSS size.
      "--force-device-scale-factor=2",
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      `--allowlisted-extension-id=${id}`,
      "--auto-accept-this-tab-capture",
      // A headed window behind others must keep painting, or the capture stalls.
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-background-timer-throttling",
    ],
  });
  const close = async () => {
    await context.close();
    if (userDataDir !== options.profileDir)
      // Chromium may still be flushing files as it exits: retry a busy/non-empty dir.
      await rm(userDataDir, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
  };

  const isOurs = (w: Worker) => w.url().startsWith(`chrome-extension://${id}/`);
  let worker: Worker;
  try {
    worker =
      context.serviceWorkers().find(isOurs) ??
      (await context.waitForEvent("serviceworker", {
        predicate: isOurs,
        timeout: 10_000,
      }));
  } catch (error) {
    await close();
    throw new Error(
      `The OpenShowcase extension didn't start from ${extensionDir}. Is it a built Chrome extension (manifest.json inside)?`,
      { cause: error },
    );
  }
  try {
    await fitViewport(context, width, height);
  } catch (error) {
    await close();
    throw error;
  }
  return { context, worker, close };
}

/**
 * Files of a profile a run doesn't need: rebuildable caches (HTTP, compiled code, GPU), the
 * lock of a Chromium using it, and the service worker registrations. The extension's worker
 * is registered there with its script cached: a copy would run the extension as it was at
 * login (stale code), and a copy without the cached script makes the worker die on start.
 * Without the folder the extension registers fresh, from its files. Logins live in cookies
 * and storage, not there; a site's own worker just registers again.
 */
const SKIPPED_PROFILE_FILES = new Set([
  "Service Worker",
  "Cache",
  "Code Cache",
  "GPUCache",
  "GPUPersistentCache",
  "GraphiteDawnCache",
  "DawnGraphiteCache",
  "DawnWebGPUCache",
  "ShaderCache",
  "SingletonLock",
  "SingletonSocket",
  "SingletonCookie",
]);

/**
 * A temporary copy of the profile: the run keeps its logins, but whatever the flow does in
 * the browser (localStorage, cookies, drafts) is gone afterwards, so every inspect and
 * record starts from the same state.
 */
async function scratchCopy(profileDir: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "openshowcase-run-"));
  if (existsSync(profileDir))
    await cp(profileDir, dir, {
      recursive: true,
      filter: (src) => !SKIPPED_PROFILE_FILES.has(basename(src)),
    });
  return dir;
}

/**
 * Resizes the window so the page itself is `width`x`height`: even headless Chromium keeps
 * room for (invisible) browser UI, so --window-size alone leaves the page shorter.
 */
async function fitViewport(
  context: BrowserContext,
  width: number,
  height: number,
): Promise<void> {
  const page = context.pages()[0] ?? (await context.newPage());
  const inner = () =>
    page.evaluate(() => [window.innerWidth, window.innerHeight] as const);
  const [innerWidth, innerHeight] = await inner();
  if (innerWidth === width && innerHeight === height) return;
  const [outerWidth, outerHeight] = await page.evaluate(
    () => [window.outerWidth, window.outerHeight] as const,
  );
  const cdp = await context.newCDPSession(page);
  const { windowId } = await cdp.send("Browser.getWindowForTarget");
  await cdp.send("Browser.setWindowBounds", {
    windowId,
    bounds: {
      width: width + outerWidth - innerWidth,
      height: height + outerHeight - innerHeight,
    },
  });
  await cdp.detach();
  for (let i = 0; i < 50; i++) {
    const [w, h] = await inner();
    if (w === width && h === height) return;
    await page.waitForTimeout(20);
  }
  throw new Error(`Couldn't size the page to ${width}x${height}`);
}

/** Calls the extension's automation API (lib/automation.ts) inside its service worker. */
export function automation<K extends keyof Automation>(
  worker: Worker,
  method: K,
  ...args: Parameters<Automation[K]>
): Promise<Awaited<ReturnType<Automation[K]>>> {
  return worker.evaluate(
    ([method, args]) => {
      const api = (globalThis as unknown as { openshowcase?: Automation })
        .openshowcase;
      if (!api)
        throw new Error(
          "This build of the extension has no automation API. Rebuild it.",
        );
      // biome-ignore lint/suspicious/noExplicitAny: forwarding a typed call across CDP
      return (api[method] as (...a: any[]) => unknown)(...args);
    },
    [method, args] as const,
  ) as Promise<Awaited<ReturnType<Automation[K]>>>;
}
