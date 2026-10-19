import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extensionIdForPath, launch } from "../../browser";
import { parseFlow } from "../../flow";
import { inspect } from "../../inspect";
import { openInStudio } from "../../open";
import { record } from "../../record";

// The real thing: the built extension records a flow in headless Chromium, and the
// file it produces opens in its editor. Build the extension first (Turbo does).
const extensionDir = join(
  import.meta.dirname,
  "../../../../../apps/extension/.output/chrome-mv3",
);

const APP = `<!doctype html>
<title>Invoices</title>
<style>
  body { font: 16px system-ui; margin: 40px }
  form { display: none; margin-top: 24px } form.open { display: block }
</style>
<h1>Invoices</h1>
<button id="new" onclick="document.querySelector('form').classList.add('open')">New invoice</button>
<form onsubmit="event.preventDefault(); localStorage.setItem('saved', '1'); document.querySelector('h1').textContent = 'Saved'">
  <label>Customer <input name="customer"></label>
  <button type="submit">Save</button>
</form>
<script>
  if (localStorage.getItem('saved')) document.querySelector('h1').textContent = 'Saved before';
</script>`;

let server: Server;
let url: string;
const work = mkdtempSync(join(tmpdir(), "recorder-e2e-"));

beforeAll(async () => {
  if (!existsSync(join(extensionDir, "manifest.json")))
    throw new Error(
      "Build the extension first: pnpm --filter @rustrak/openshowcase-extension build",
    );
  server = createServer((_, res) => {
    res.setHeader("content-type", "text/html");
    res.end(APP);
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  url = `http://localhost:${typeof address === "object" && address?.port}/`;
});

afterAll(() => {
  server?.close();
});

/** The `.osrec` header (lib/recording-file.ts in the extension): magic, version, JSON. */
function readHeader(path: string) {
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 5).toString()).toBe("OSREC");
  const length = bytes.readUInt32LE(6);
  return {
    header: JSON.parse(bytes.subarray(10, 10 + length).toString("utf8")) as {
      recording: { durationSec: number; width: number; height: number };
      markers: {
        kind: string;
        label?: string;
        elementText?: string;
        xFrac?: number;
        yFrac?: number;
        zoom?: number;
        hotspot?: boolean;
      }[];
      direction?: { cuts: unknown[]; zooms: unknown[] };
    },
    videoBytes: bytes.length - 10 - length,
  };
}

const flow = () =>
  parseFlow({
    title: "Create an invoice",
    url,
    steps: [
      {
        action: "click",
        target: { role: "button", name: "New invoice" },
        tooltip: "Create your first invoice",
      },
      { action: "fill", target: { label: "Customer" }, value: "Acme" },
      {
        action: "click",
        target: { role: "button", name: "Save" },
        tooltip: "Save it",
      },
    ],
  });

describe("record", () => {
  const profileDir = join(work, "profile");
  const out = join(work, "invoice.osrec");

  it("records the flow through the extension into an .osrec file", async () => {
    const result = await record(flow(), {
      profileDir,
      extensionDir,
      headed: false,
      out,
    });
    expect(result).toMatchObject({ out, hotspots: 2 });

    const { header, videoBytes } = readHeader(out);
    expect(videoBytes).toBeGreaterThan(10_000);
    // Retina: twice the 1280x800 viewport.
    expect(header.recording).toMatchObject({ width: 2560, height: 1600 });
    expect(header.recording.durationSec).toBeGreaterThan(3);

    // Hotspots land where the button is drawn in the video: #new's center sits ~90px in
    // and ~100px down (under the heading) on the 1280x800 page. A viewport that differs
    // from the captured tab would skew these.
    const [first] = header.markers;
    expect(first?.xFrac).toBeGreaterThan(0.03);
    expect(first?.xFrac).toBeLessThan(0.12);
    expect(first?.yFrac).toBeGreaterThan(0.08);
    expect(first?.yFrac).toBeLessThan(0.16);

    const clicks = header.markers.filter((m) => m.kind === "click");
    // The fill clicks into the field first, like a person: a click with no hotspot.
    expect(clicks.map((m) => m.label)).toEqual([
      "Create your first invoice",
      undefined,
      "Save it",
    ]);
    expect(clicks.map((m) => m.hotspot)).toEqual([undefined, false, undefined]);
    expect(clicks.map((m) => m.elementText)).toEqual([
      "New invoice",
      undefined,
      "Save",
    ]);
    expect(header.markers.some((m) => m.kind === "type")).toBe(true);
    expect(header.direction).toMatchObject({
      cuts: [],
      zooms: [],
      title: "Create an invoice",
    });
  });

  it("opens in the extension's editor as steps with the flow's tooltips", async () => {
    const { context, close } = await launch({
      profileDir: join(work, "editor-profile"),
      extensionDir,
      headless: true,
    });
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      const id = extensionIdForPath(extensionDir);
      await page.goto(`chrome-extension://${id}/editor.html`);
      await page.locator('input[type="file"]').setInputFiles(out);
      await page.waitForURL(/recordingId=/);

      const steps = page.getByLabel(/^Step \d+\. Drag to reorder$/);
      // lead-in clip, click photo, typing clip, click photo, tail clip
      await expect.poll(() => steps.count(), { timeout: 15_000 }).toBe(5);

      // the flow's title names the demo
      await expect
        .poll(() => page.getByLabel("Demo title").inputValue())
        .toBe("Create an invoice");

      await steps.nth(1).click();
      await expect
        .poll(() => page.getByText("Create your first invoice").count())
        .toBeGreaterThan(0);
    } finally {
      await close();
    }
  });
});

describe("a profile used before", () => {
  it("records from a profile a login run already used", async () => {
    // A login run leaves the extension's service worker registered in the profile, with
    // its script cached in "Service Worker/ScriptCache". The run's copy must keep it.
    const profileDir = join(work, "used-profile");
    const { context, close } = await launch({
      profileDir,
      extensionDir,
      headless: true,
      keepChanges: true,
    });
    await (context.pages()[0] ?? (await context.newPage())).goto(url);
    await close();

    const result = await record(parseFlow({ url, steps: [] }), {
      profileDir,
      extensionDir,
      headed: false,
      out: join(work, "used-profile.osrec"),
    });
    expect(result.bytes).toBeGreaterThan(1_000);
  });
});

describe("a profile used before, then the extension changes", () => {
  it("runs the extension's current code, not what the profile cached", async () => {
    const ownExtension = join(work, "changing-extension");
    cpSync(extensionDir, ownExtension, { recursive: true });
    const profileDir = join(work, "stale-profile");
    const login = await launch({
      profileDir,
      extensionDir: ownExtension,
      headless: true,
      keepChanges: true,
    });
    await login.close();

    // A newer build of the extension, same path (so same id), same version.
    appendFileSync(
      join(ownExtension, "background.js"),
      "\nglobalThis.__build = 2;\n",
    );
    const run = await launch({
      profileDir,
      extensionDir: ownExtension,
      headless: true,
    });
    try {
      expect(
        await run.worker.evaluate(
          () => (globalThis as { __build?: number }).__build,
        ),
      ).toBe(2);
    } finally {
      await run.close();
    }
  });
});

describe("direction", () => {
  const out = join(work, "directed.osrec");

  it("carries zooms and quiet clicks into the editor's steps", async () => {
    await record(
      parseFlow({
        url,
        steps: [
          {
            action: "click",
            target: { role: "button", name: "New invoice" },
            hotspot: false,
          },
          {
            action: "fill",
            target: { label: "Customer" },
            value: "Acme",
            zoom: 2,
          },
          {
            action: "click",
            target: { role: "button", name: "Save" },
            tooltip: "Save it",
            zoom: 1.6,
          },
          { action: "wait", ms: 1500 },
        ],
      }),
      {
        profileDir: join(work, "directed-profile"),
        extensionDir,
        headed: false,
        out,
      },
    );
    const { header } = readHeader(out);
    expect(header.markers.filter((m) => m.kind === "click")).toEqual([
      expect.objectContaining({ hotspot: false }),
      expect.objectContaining({ hotspot: false }),
      expect.objectContaining({ label: "Save it", zoom: 1.6 }),
    ]);
    expect(header.direction?.zooms).toHaveLength(1);
    expect(header.direction?.cuts).toHaveLength(1);
  });

  it("opens in the review browser's editor straight from the file", async () => {
    let studioUrl = "";
    await openInStudio(out, {
      extensionDir,
      studioDir: join(work, "studio"),
      spawn: () => ({ unref: () => {} }),
    });
    const { context, close } = await launch({
      profileDir: join(work, "studio", "profile"),
      extensionDir: join(work, "studio", "extension"),
      headless: true,
      keepChanges: true,
    });
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      const id = extensionIdForPath(
        realpathSync(join(work, "studio", "extension")),
      );
      studioUrl = `chrome-extension://${id}/editor.html?import=imports/directed.osrec`;
      await page.goto(studioUrl);
      await page.waitForURL(/recordingId=/);
      const steps = page.getByLabel(/^Step \d+\. Drag to reorder$/);
      // One photo (Save). The quiet click and the typing play as clips, split where the
      // camera zooms in on the typing and back out (wide, zoomed, wide); the wait is cut.
      await expect.poll(() => steps.count(), { timeout: 15_000 }).toBe(5);
      await expect
        .poll(() => page.getByText("Save it").count())
        .toBeGreaterThan(0);
    } finally {
      await close();
    }
  });
});

describe("inspect", () => {
  it("reports the page after the flow, with its accessibility tree", async () => {
    const inspection = await inspect(flow(), {
      profileDir: join(work, "inspect-profile"),
      extensionDir,
      headed: false,
      screenshot: join(work, "shot.png"),
    });
    expect(inspection).toMatchObject({ ran: 3, total: 3, title: "Invoices" });
    expect(inspection.error).toBeUndefined();
    expect(inspection.snapshot).toContain('heading "Saved"');
    expect(existsSync(join(work, "shot.png"))).toBe(true);
  });

  it("leaves the profile as it was: every run starts from the same state", async () => {
    const options = {
      profileDir: join(work, "state-profile"),
      extensionDir,
      headed: false,
    };
    // The flow saves to localStorage; the next run must not see it.
    await inspect(flow(), options);
    const next = await inspect(parseFlow({ url, steps: [] }), options);
    expect(next.snapshot).toContain('heading "Invoices"');
  });

  it("starts from what a login run saved to the profile", async () => {
    const profileDir = join(work, "login-profile");
    const { context, close } = await launch({
      profileDir,
      extensionDir,
      headless: true,
      keepChanges: true,
    });
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(url);
    await page.evaluate(() => localStorage.setItem("saved", "1"));
    await close();

    const next = await inspect(parseFlow({ url, steps: [] }), {
      profileDir,
      extensionDir,
      headed: false,
    });
    expect(next.snapshot).toContain('heading "Saved before"');
  });

  it("stops at a failing step and shows the page as it was", async () => {
    const inspection = await inspect(
      parseFlow({
        url,
        steps: [
          { action: "click", target: { role: "button", name: "Delete" } },
        ],
      }),
      {
        profileDir: join(work, "inspect-profile"),
        extensionDir,
        headed: false,
      },
    );
    expect(inspection.ran).toBe(0);
    expect(inspection.error).toMatch(
      /^Step 1 \(click role=button name="Delete"\) failed/,
    );
    expect(inspection.snapshot).toContain('button "New invoice"');
  });
});
