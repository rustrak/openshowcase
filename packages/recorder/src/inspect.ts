import { launch } from "./browser";
import type { Flow } from "./flow";
import { INSTANT_PACE, runFlow, StepError } from "./run-flow";

export interface Inspection {
  url: string;
  title: string;
  /** Only when asked for: an image costs an agent far more than the tree. */
  screenshot?: string;
  /** Steps that ran (all of them, unless one failed). */
  ran: number;
  total: number;
  error?: string;
  /** Playwright's ARIA snapshot of the page: the roles and names targets use. */
  snapshot: string;
}

export interface InspectOptions {
  profileDir: string;
  extensionDir: string;
  headed: boolean;
  screenshot?: string;
  /** CSS selector of the part of the page to describe (a dialog, `main`…). */
  within?: string;
}

/** Runs the flow without pacing or recording and reports the page where it ends (or fails). */
export async function inspect(
  flow: Flow,
  options: InspectOptions,
): Promise<Inspection> {
  const { context, close } = await launch({
    ...options,
    headless: !options.headed,
    viewport: flow.viewport,
  });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    page.setDefaultTimeout(5_000);
    await page.goto(flow.url);

    let ran = flow.steps.length;
    let error: string | undefined;
    try {
      await runFlow(page, flow.steps, INSTANT_PACE);
    } catch (e) {
      if (!(e instanceof StepError)) throw e;
      ran = e.index;
      error = e.message;
    }

    if (options.screenshot) await page.screenshot({ path: options.screenshot });
    return {
      url: page.url(),
      title: await page.title(),
      ...(options.screenshot && { screenshot: options.screenshot }),
      ran,
      total: flow.steps.length,
      ...(error && { error }),
      snapshot: compactSnapshot(
        await page
          .locator(options.within ?? "body")
          .first()
          .ariaSnapshot(),
      ),
    };
  } finally {
    await close();
  }
}

export function formatInspection(inspection: Inspection): string {
  const steps = inspection.error
    ? `${inspection.ran} of ${inspection.total} ran. ${inspection.error}`
    : inspection.total === 0
      ? "none (just the start page)"
      : `all ${inspection.total} ran`;
  return [
    `URL: ${inspection.url}`,
    `Title: ${inspection.title}`,
    ...(inspection.screenshot ? [`Screenshot: ${inspection.screenshot}`] : []),
    `Steps: ${steps}`,
    "",
    "Accessibility tree:",
    inspection.snapshot,
  ].join("\n");
}

/** The ARIA snapshot without link URLs: flows target names, and every line costs tokens. */
export function compactSnapshot(snapshot: string): string {
  return snapshot
    .split("\n")
    .filter((line) => !/^\s*- \/url: /.test(line))
    .map((line) => line.replace(/^(\s*- link .*):$/, "$1"))
    .join("\n");
}
