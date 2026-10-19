import type { Locator, Page } from "playwright";
import type { Direction } from "./browser";
import { describeStep, type Step, type Target } from "./flow";
import { aimPoint, humanPath, MOVE_TICK_MS, type Point } from "./human";

/** How things happen on camera. A recording should feel like a person; inspecting doesn't. */
export interface Pace {
  /** Before the first step: the viewer sees where the demo starts. */
  leadIn: number;
  /** Between the cursor reaching a target and pressing it. */
  beforeClick: number;
  /** After every step, so its result is on screen. */
  afterStep: number;
  /** Per typed character. */
  typingDelay: number;
  /** Between 100px wheel ticks of a scroll; 0 scrolls in one go (and instantly). */
  scrollTick: number;
  /** After the last step: the demo ends on the result. */
  tail: number;
  /** Move the mouse along a human path (otherwise it jumps). */
  humanMoves: boolean;
}

export const RECORDING_PACE: Pace = {
  leadIn: 800,
  beforeClick: 180,
  afterStep: 500,
  typingDelay: 55,
  scrollTick: 16,
  tail: 1200,
  humanMoves: true,
};

export const INSTANT_PACE: Pace = {
  leadIn: 0,
  beforeClick: 0,
  afterStep: 0,
  typingDelay: 0,
  scrollTick: 0,
  tail: 0,
  humanMoves: false,
};

const DEFAULT_SCROLL_PX = 600;
const WHEEL_TICK_PX = 100;
/** A wait for the app shorter than this isn't worth a cut. */
const MIN_CUT_MS = 200;
/** A target is used where the viewer can see it well: between these fractions of the height. */
const COMFORT_TOP = 0.12;
const COMFORT_BOTTOM = 0.85;

export class StepError extends Error {
  override readonly name = "StepError";
  constructor(
    readonly index: number,
    readonly step: Step,
    cause: unknown,
  ) {
    const reason = (
      cause instanceof Error ? cause.message : String(cause)
    ).split("\n")[0];
    super(`Step ${index + 1} (${describeStep(step)}) failed: ${reason}`, {
      cause,
    });
  }
}

export function locate(page: Page, target: Target): Locator {
  const { exact } = target;
  const base =
    target.role != null
      ? page.getByRole(target.role as Parameters<Page["getByRole"]>[0], {
          name: target.name,
          exact,
        })
      : target.text != null
        ? page.getByText(target.text, { exact })
        : target.label != null
          ? page.getByLabel(target.label, { exact })
          : target.placeholder != null
            ? page.getByPlaceholder(target.placeholder, { exact })
            : target.testId != null
              ? page.getByTestId(target.testId)
              : page.locator(target.css ?? "");
  return target.nth != null ? base.nth(target.nth) : base;
}

/**
 * Performs the steps on the page at the given pace, and returns the direction for the editor:
 * what each click asked for (with its wall-clock window, matched to the extension's click
 * markers), the waits to cut out of the video, and the actions to zoom into.
 */
export async function runFlow(
  page: Page,
  steps: Step[],
  pace: Pace,
  onStep?: (index: number, step: Step) => void,
  random: () => number = Math.random,
): Promise<Direction> {
  const pause = (ms: number) => (ms > 0 ? page.waitForTimeout(ms) : undefined);
  const direction: Direction = { clicks: [], cuts: [], zooms: [] };
  const [width, height] = await page.evaluate(
    () => [window.innerWidth, window.innerHeight] as const,
  );
  let mouse: Point = { x: width / 2, y: height / 2 };
  if (pace.humanMoves) await page.mouse.move(mouse.x, mouse.y);

  /** Time the app made us wait: cut from the video when it's long enough to notice. */
  const offCamera = async (wait: () => Promise<unknown>) => {
    const start = Date.now();
    await wait();
    if (Date.now() - start >= MIN_CUT_MS)
      direction.cuts.push({ start, end: Date.now() });
  };

  await pause(pace.leadIn);
  for (const [index, step] of steps.entries()) {
    onStep?.(index, step);
    try {
      await perform(step);
      await offCamera(() => page.waitForLoadState());
    } catch (error) {
      throw new StepError(index, step, error);
    }
    await pause(pace.afterStep);
  }
  await pause(pace.tail);
  return direction;

  async function moveTo(point: Point): Promise<void> {
    if (!pace.humanMoves) {
      mouse = point;
      return;
    }
    for (const p of humanPath(mouse, point, random)) {
      await page.mouse.move(p.x, p.y);
      await page.waitForTimeout(MOVE_TICK_MS);
    }
    mouse = point;
  }

  /** Waits for the target (off camera), centers it if it's near an edge, then aims at it. */
  async function approach(locator: Locator) {
    await offCamera(() => locator.waitFor({ state: "visible" }));
    let box = await locator.boundingBox();
    if (
      box &&
      (box.y < height * COMFORT_TOP ||
        box.y + box.height > height * COMFORT_BOTTOM)
    ) {
      await locator.evaluate(
        (el, smooth) =>
          el.scrollIntoView({
            behavior: smooth ? "smooth" : "instant",
            block: "center",
          }),
        pace.scrollTick > 0,
      );
      box = await settled(locator);
    }
    if (!box) throw new Error("The target has no size on the page");
    const aim = aimPoint(box, random);
    await moveTo(aim);
    return {
      box,
      /** Where to press, relative to the element (what Playwright's `position` takes). */
      position: { x: aim.x - box.x, y: aim.y - box.y },
      focus: {
        x: (box.x + box.width / 2) / width,
        y: (box.y + box.height / 2) / height,
      },
    };
  }

  /** The target's box once a smooth scroll has stopped moving it. */
  async function settled(locator: Locator) {
    let box = await locator.boundingBox();
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(50);
      const next = await locator.boundingBox();
      if (next?.y === box?.y) return next;
      box = next;
    }
    return box;
  }

  async function zoomed(
    zoom: number | undefined,
    focus: Point,
    action: () => Promise<unknown>,
  ) {
    const start = Date.now();
    await action();
    if (zoom)
      direction.zooms.push({ start, end: Date.now(), ...focus, scale: zoom });
  }

  async function perform(step: Step): Promise<void> {
    switch (step.action) {
      case "click": {
        const target = locate(page, step.target);
        const { position } = await approach(target);
        await pause(pace.beforeClick);
        const start = Date.now();
        await target.click({ position });
        const { tooltip, zoom, hotspot } = step;
        if (tooltip != null || zoom != null || hotspot != null)
          direction.clicks.push({
            start,
            end: Date.now(),
            ...(tooltip != null && { label: tooltip }),
            ...(zoom != null && { zoom }),
            ...(hotspot != null && { hotspot }),
          });
        return;
      }
      case "fill": {
        const target = locate(page, step.target);
        const { position, focus } = await approach(target);
        const focused = await target.evaluate(
          (el) =>
            el === document.activeElement ||
            el.contains(document.activeElement),
        );
        await zoomed(step.zoom, focus, async () => {
          if (!focused) {
            await pause(pace.beforeClick);
            const start = Date.now();
            await target.click({ position });
            // A person clicks into the field first; it's not a step of its own.
            direction.clicks.push({ start, end: Date.now(), hotspot: false });
          }
          await target.fill("");
          await target.pressSequentially(step.value, {
            delay: pace.typingDelay,
          });
        });
        return;
      }
      case "press":
        if (step.target) await locate(page, step.target).press(step.key);
        else await page.keyboard.press(step.key);
        return;
      case "select": {
        const target = locate(page, step.target);
        const { focus } = await approach(target);
        await zoomed(step.zoom, focus, async () => {
          await pause(pace.beforeClick);
          await target.selectOption(step.value);
        });
        return;
      }
      case "hover": {
        const target = locate(page, step.target);
        const { position, focus } = await approach(target);
        await zoomed(step.zoom, focus, async () => {
          await target.hover({ position });
          await pause(pace.afterStep);
        });
        return;
      }
      case "scroll":
        if (step.target) {
          const target = locate(page, step.target);
          await offCamera(() => target.waitFor({ state: "visible" }));
          await target.evaluate(
            (el, smooth) =>
              el.scrollIntoView({
                behavior: smooth ? "smooth" : "instant",
                block: "center",
              }),
            pace.scrollTick > 0,
          );
          await settled(target);
          return;
        }
        await wheel(step.by ?? DEFAULT_SCROLL_PX);
        return;
      case "goto":
        await offCamera(() => page.goto(step.url));
        return;
      case "wait": {
        // Waiting is for the app, never for the viewer: always cut, whatever its length.
        const start = Date.now();
        if (step.for)
          await locate(page, step.for).waitFor({ state: "visible" });
        if (step.ms) await page.waitForTimeout(step.ms);
        direction.cuts.push({ start, end: Date.now() });
        return;
      }
    }
  }

  /** Wheel ticks rather than a jump: the clip shows a real scroll, and the page sees wheel events. */
  async function wheel(by: number): Promise<void> {
    if (pace.scrollTick === 0) {
      await page.mouse.wheel(0, by);
      return;
    }
    const ticks = Math.ceil(Math.abs(by) / WHEEL_TICK_PX);
    for (let i = 0; i < ticks; i++) {
      const left = Math.abs(by) - i * WHEEL_TICK_PX;
      await page.mouse.wheel(0, Math.sign(by) * Math.min(WHEEL_TICK_PX, left));
      await page.waitForTimeout(pace.scrollTick);
    }
  }
}
