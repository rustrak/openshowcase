import { type Browser, chromium, type Page } from "playwright";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installCursor } from "../../cursor";
import type { Step } from "../../flow";
import {
  INSTANT_PACE,
  type Pace,
  RECORDING_PACE,
  runFlow,
  StepError,
} from "../../run-flow";

const PAGE = `
<!doctype html>
<style>body { margin: 0 } .tall { height: 3000px }</style>
<h1>Invoices</h1>
<button onclick="this.textContent = 'Clicked'">New invoice</button>
<button onmouseover="this.dataset.hovered = 'yes'">Hover me</button>
<label>Customer <input id="customer" onkeydown="(window.keys ||= []).push(event.key)"></label>
<input placeholder="Search" id="search">
<select data-testid="currency"><option value="USD">USD</option><option value="EUR">EUR</option></select>
<a href="#second" id="link">Second page</a>
<div class="tall"></div>
<footer id="footer"><button onclick="this.textContent = 'Done'">Far away</button></footer>
<div style="height: 800px"></div>
<script>
  setTimeout(() => {
    const d = document.createElement('div');
    d.setAttribute('role', 'dialog');
    d.textContent = 'Saved!';
    document.body.append(d);
  }, 300);
  setTimeout(() => {
    const b = document.createElement('button');
    b.textContent = 'Late';
    document.querySelector('h1').after(b);
  }, 700);
</script>
`;

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch({ channel: "chromium", headless: true });
});

afterAll(async () => {
  await browser.close();
});

beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  page.setDefaultTimeout(2_000);
  await page.setContent(PAGE);
});

const run = (steps: Step[]) => runFlow(page, steps, INSTANT_PACE);

describe("runFlow", () => {
  it("clicks a target found by role and name", async () => {
    await run([
      { action: "click", target: { role: "button", name: "New invoice" } },
    ]);
    await expect(
      page.getByRole("button", { name: "Clicked" }).count(),
    ).resolves.toBe(1);
  });

  it("returns the window and direction of each click that asks for some", async () => {
    const before = Date.now();
    const { clicks } = await run([
      {
        action: "click",
        target: { role: "button", name: "New invoice" },
        tooltip: "Start a new invoice",
        zoom: 2,
      },
      { action: "click", target: { text: "Hover me" } },
      { action: "click", target: { text: "Hover me" }, hotspot: false },
    ]);
    expect(clicks).toHaveLength(2);
    const [first, quiet] = clicks;
    expect(first).toMatchObject({ label: "Start a new invoice", zoom: 2 });
    expect(first?.start).toBeGreaterThanOrEqual(before);
    expect(first?.end).toBeGreaterThanOrEqual(first?.start ?? Infinity);
    expect(quiet).toMatchObject({ hotspot: false });
    expect(quiet?.end).toBeLessThanOrEqual(Date.now());
  });

  it("clicks into a field before typing, as a click with no hotspot", async () => {
    const { clicks } = await run([
      { action: "fill", target: { label: "Customer" }, value: "Acme" },
    ]);
    expect(clicks).toEqual([expect.objectContaining({ hotspot: false })]);
  });

  it("doesn't click a field again when it already has focus", async () => {
    await page.focus("#customer");
    const { clicks } = await run([
      { action: "fill", target: { label: "Customer" }, value: "Acme" },
    ]);
    expect(clicks).toEqual([]);
  });

  it("frames the clip on a field it zooms into while typing", async () => {
    const { zooms } = await run([
      {
        action: "fill",
        target: { label: "Customer" },
        value: "Acme",
        zoom: 1.8,
      },
    ]);
    const box = await page.locator("#customer").boundingBox();
    expect(zooms).toHaveLength(1);
    const [zoom] = zooms;
    expect(zoom?.scale).toBe(1.8);
    expect(zoom?.x).toBeCloseTo(
      ((box?.x ?? 0) + (box?.width ?? 0) / 2) / 800,
      2,
    );
    expect(zoom?.y).toBeCloseTo(
      ((box?.y ?? 0) + (box?.height ?? 0) / 2) / 600,
      2,
    );
    expect(zoom?.end).toBeGreaterThan(zoom?.start ?? Infinity);
  });

  it("cuts waits out of the video", async () => {
    const { cuts } = await run([{ action: "wait", ms: 120 }]);
    expect(cuts).toHaveLength(1);
    const [cut] = cuts;
    expect((cut?.end ?? 0) - (cut?.start ?? 0)).toBeGreaterThanOrEqual(110);
  });

  it("cuts the time spent waiting for a target to show up", async () => {
    const { cuts } = await run([{ action: "click", target: { text: "Late" } }]);
    expect(cuts).toHaveLength(1);
    expect((cuts[0]?.end ?? 0) - (cuts[0]?.start ?? 0)).toBeGreaterThan(300);
  });

  it("brings a target near the edge to the middle of the screen before using it", async () => {
    await run([{ action: "click", target: { text: "Far away" } }]);
    const box = await page.getByRole("button", { name: "Done" }).boundingBox();
    expect(box?.y).toBeGreaterThan(600 * 0.12);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThan(600 * 0.85);
  });

  it("moves the mouse like a hand on camera, and the cursor follows it", async () => {
    const context = await browser.newContext({
      viewport: { width: 800, height: 600 },
    });
    await installCursor(context);
    // A real navigation (setContent's document.write drops the init script's listeners)
    await context.route("http://demo.test/", (route) =>
      route.fulfill({ contentType: "text/html", body: PAGE }),
    );
    const camera = await context.newPage();
    camera.setDefaultTimeout(2_000);
    await camera.goto("http://demo.test/");
    await camera.evaluate(() => {
      (window as unknown as { moves: number }).moves = 0;
      document.addEventListener("mousemove", () => {
        (window as unknown as { moves: number }).moves++;
      });
    });
    const quick: Pace = { ...RECORDING_PACE, leadIn: 0, afterStep: 0, tail: 0 };
    await runFlow(
      camera,
      [{ action: "click", target: { role: "button", name: "New invoice" } }],
      quick,
    );

    expect(
      await camera.evaluate(
        () => (window as unknown as { moves: number }).moves,
      ),
    ).toBeGreaterThan(10);
    const box = await camera
      .getByRole("button", { name: "Clicked" })
      .boundingBox();
    const [x, y] = await camera.evaluate(() => {
      const host = document.querySelector("openshowcase-cursor") as HTMLElement;
      return host.style.transform.match(/-?[\d.]+/g)?.map(Number) ?? [];
    });
    expect(x).toBeGreaterThan(box?.x ?? Infinity);
    expect(x).toBeLessThan((box?.x ?? 0) + (box?.width ?? 0));
    expect(y).toBeGreaterThan(box?.y ?? Infinity);
    expect(y).toBeLessThan((box?.y ?? 0) + (box?.height ?? 0));
    await context.close();
  });

  it("types a value key by key into a field found by its label", async () => {
    await run([
      { action: "fill", target: { label: "Customer" }, value: "Acme" },
    ]);
    expect(await page.inputValue("#customer")).toBe("Acme");
    const keys = await page.evaluate(
      () => (window as unknown as { keys: string[] }).keys,
    );
    expect(keys.filter((k) => k.length === 1).join("")).toBe("Acme");
  });

  it("replaces what a field already had", async () => {
    await page.fill("#customer", "old");
    await run([
      { action: "fill", target: { label: "Customer" }, value: "new" },
    ]);
    expect(await page.inputValue("#customer")).toBe("new");
  });

  it("presses keys, on a target or on the page", async () => {
    await run([
      { action: "fill", target: { placeholder: "Search" }, value: "ab" },
      { action: "press", key: "Backspace", target: { placeholder: "Search" } },
      { action: "press", key: "Backspace" },
    ]);
    expect(await page.inputValue("#search")).toBe("");
  });

  it("selects an option, hovers, and waits for an element to appear", async () => {
    await run([
      { action: "select", target: { testId: "currency" }, value: "EUR" },
      { action: "hover", target: { role: "button", name: "Hover me" } },
      { action: "wait", for: { role: "dialog" } },
      { action: "wait", ms: 10 },
    ]);
    expect(await page.inputValue("select")).toBe("EUR");
    expect(
      await page.getAttribute("button:nth-of-type(2)", "data-hovered"),
    ).toBe("yes");
  });

  it("scrolls by pixels and to a target", async () => {
    await run([{ action: "scroll", by: 500 }]);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(500);
    await run([{ action: "scroll", target: { css: "footer" } }]);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(2000);
  });

  it("navigates", async () => {
    await run([{ action: "goto", url: "data:text/html,<h1>Other</h1>" }]);
    await expect(page.getByRole("heading").textContent()).resolves.toBe(
      "Other",
    );
  });

  it("picks the nth match of an ambiguous target", async () => {
    await run([{ action: "click", target: { role: "button", nth: 0 } }]);
    await expect(
      page.getByRole("button", { name: "Clicked" }).count(),
    ).resolves.toBe(1);
  });

  it("says which step failed and why", async () => {
    const error = await run([
      { action: "click", target: { role: "button", name: "New invoice" } },
      { action: "click", target: { role: "button", name: "Delete" } },
    ]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StepError);
    expect((error as StepError).index).toBe(1);
    expect((error as StepError).message).toMatch(
      /^Step 2 \(click role=button name="Delete"\) failed: /,
    );
  });

  it("reports progress before each step", async () => {
    const seen: number[] = [];
    await runFlow(
      page,
      [
        { action: "wait", ms: 1 },
        { action: "wait", ms: 1 },
      ],
      INSTANT_PACE,
      (index) => seen.push(index),
    );
    expect(seen).toEqual([0, 1]);
  });
});
