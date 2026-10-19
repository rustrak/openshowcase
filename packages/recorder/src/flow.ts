import { readFile } from "node:fs/promises";
import * as v from "valibot";

/**
 * The script of a demo (a JSON file the agent writes): where to start, at what size, and
 * the steps to perform. Targets are Playwright locators by accessibility role/name first,
 * so a flow keeps working when the markup changes.
 */
const TARGET_KEYS = [
  "role",
  "text",
  "label",
  "placeholder",
  "testId",
  "css",
] as const;

const Target = v.pipe(
  v.object({
    role: v.optional(v.string()),
    /** Accessible name, with `role`. */
    name: v.optional(v.string()),
    text: v.optional(v.string()),
    label: v.optional(v.string()),
    placeholder: v.optional(v.string()),
    testId: v.optional(v.string()),
    css: v.optional(v.string()),
    /** Exact (case-sensitive, whole-string) match for name/text/label/placeholder. */
    exact: v.optional(v.boolean()),
    /** Which match, 0-based, when the target matches several elements. */
    nth: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  }),
  v.check(
    (target) => TARGET_KEYS.filter((key) => target[key] != null).length === 1,
    "a target needs exactly one of role, text, label, placeholder, testId or css",
  ),
);

/** Camera zoom on the action (photo step or clip), centered on its target. */
const Zoom = v.optional(v.pipe(v.number(), v.minValue(1.2), v.maxValue(3)));

const Step = v.variant("action", [
  v.object({
    action: v.literal("click"),
    target: Target,
    /** The hotspot's tooltip for this click in the demo. */
    tooltip: v.optional(v.string()),
    /** false: no photo step; the click just plays in the video, cursor and all. */
    hotspot: v.optional(v.boolean()),
    zoom: Zoom,
  }),
  /** Types the value visibly, character by character. */
  v.object({
    action: v.literal("fill"),
    target: Target,
    value: v.string(),
    zoom: Zoom,
  }),
  v.object({
    action: v.literal("press"),
    key: v.string(),
    target: v.optional(Target),
  }),
  v.object({
    action: v.literal("select"),
    target: Target,
    value: v.string(),
    zoom: Zoom,
  }),
  v.object({ action: v.literal("hover"), target: Target, zoom: Zoom }),
  /** Smooth scroll: to a target, or by a number of pixels (default 600). */
  v.object({
    action: v.literal("scroll"),
    target: v.optional(Target),
    by: v.optional(v.number()),
  }),
  v.object({ action: v.literal("goto"), url: v.pipe(v.string(), v.url()) }),
  v.pipe(
    v.object({
      action: v.literal("wait"),
      ms: v.optional(v.pipe(v.number(), v.minValue(0))),
      for: v.optional(Target),
    }),
    v.check(
      (step) => step.ms != null || step.for != null,
      "a wait needs ms or for",
    ),
  ),
]);

const Flow = v.object({
  url: v.pipe(v.string(), v.url()),
  viewport: v.optional(
    v.object({
      width: v.pipe(v.number(), v.integer(), v.minValue(320)),
      height: v.pipe(v.number(), v.integer(), v.minValue(240)),
    }),
    { width: 1280, height: 800 },
  ),
  steps: v.array(Step),
});

export type Target = v.InferOutput<typeof Target>;
export type Step = v.InferOutput<typeof Step>;
export type Flow = v.InferOutput<typeof Flow>;

export class FlowError extends Error {
  override readonly name = "FlowError";
}

export function parseFlow(input: unknown): Flow {
  const result = v.safeParse(Flow, input);
  if (result.success) return result.output;
  const lines = result.issues.map(
    (issue) => `- ${v.getDotPath(issue) ?? "(root)"}: ${issue.message}`,
  );
  throw new FlowError(`Invalid flow:\n${lines.join("\n")}`);
}

/** A flow file, or a bare URL (a flow with no steps: handy to look at a page first). */
export async function loadFlow(pathOrUrl: string): Promise<Flow> {
  if (/^https?:\/\//.test(pathOrUrl))
    return parseFlow({ url: pathOrUrl, steps: [] });
  const text = await readFile(pathOrUrl, "utf8");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new FlowError(
      `${pathOrUrl} is not valid JSON: ${(error as Error).message}`,
    );
  }
  return parseFlow(json);
}

export function describeTarget(target: Target): string {
  return Object.entries(target)
    .filter(([, value]) => value != null)
    .map(([key, value]) =>
      key === "role" || typeof value !== "string"
        ? `${key}=${value}`
        : `${key}=${JSON.stringify(value)}`,
    )
    .join(" ");
}

/** One line for logs and errors: `click role=button name="Save"`. */
export function describeStep(step: Step): string {
  switch (step.action) {
    case "press":
      return step.target
        ? `press ${step.key} on ${describeTarget(step.target)}`
        : `press ${step.key}`;
    case "goto":
      return `goto ${step.url}`;
    case "wait":
      return step.for
        ? `wait for ${describeTarget(step.for)}`
        : `wait ${step.ms}ms`;
    case "scroll":
      return step.target
        ? `scroll to ${describeTarget(step.target)}`
        : `scroll by ${step.by ?? 600}px`;
    default:
      return `${step.action} ${describeTarget(step.target)}`;
  }
}
