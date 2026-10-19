import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { describeStep, FlowError, loadFlow, parseFlow } from "../../flow";

describe("parseFlow", () => {
  it("accepts a flow with every kind of step and target", () => {
    const flow = parseFlow({
      url: "https://app.example.com",
      viewport: { width: 1440, height: 900 },
      steps: [
        {
          action: "click",
          target: { role: "button", name: "New invoice" },
          tooltip: "Create your first invoice",
        },
        { action: "fill", target: { label: "Customer" }, value: "Acme" },
        { action: "press", key: "Enter" },
        { action: "press", key: "Tab", target: { placeholder: "Search" } },
        { action: "select", target: { testId: "currency" }, value: "EUR" },
        { action: "hover", target: { text: "Pricing", exact: true } },
        { action: "scroll", by: 400 },
        { action: "scroll", target: { css: "#footer" } },
        { action: "goto", url: "https://app.example.com/settings" },
        { action: "wait", ms: 500 },
        { action: "wait", for: { role: "dialog", nth: 0 } },
      ],
    });
    expect(flow.steps).toHaveLength(11);
    expect(flow.viewport).toEqual({ width: 1440, height: 900 });
  });

  it("takes camera direction: zoom on actions, clicks without a hotspot", () => {
    const flow = parseFlow({
      url: "https://example.com",
      steps: [
        { action: "click", target: { text: "Menu" }, hotspot: false },
        { action: "click", target: { text: "Total" }, zoom: 2, tooltip: "T" },
        { action: "fill", target: { label: "Qty" }, value: "2", zoom: 1.6 },
        { action: "select", target: { label: "VAT" }, value: "21", zoom: 1.5 },
        { action: "hover", target: { text: "Help" }, zoom: 1.4 },
      ],
    });
    expect(flow.steps[0]).toMatchObject({ hotspot: false });
    expect(flow.steps[1]).toMatchObject({ zoom: 2 });
  });

  it("keeps zoom between 1.2 and 3", () => {
    for (const zoom of [1, 3.5]) {
      expect(() =>
        parseFlow({
          url: "https://example.com",
          steps: [{ action: "click", target: { text: "A" }, zoom }],
        }),
      ).toThrow(/steps\.0\.zoom/);
    }
  });

  it("defaults the viewport to 1280x800", () => {
    const flow = parseFlow({ url: "https://example.com", steps: [] });
    expect(flow.viewport).toEqual({ width: 1280, height: 800 });
  });

  it("reports every problem with its path", () => {
    expect(() =>
      parseFlow({
        url: "not a url",
        steps: [{ action: "click" }, { action: "teleport" }],
      }),
    ).toThrow(FlowError);
    try {
      parseFlow({ url: "not a url", steps: [{ action: "click" }] });
    } catch (error) {
      const message = (error as FlowError).message;
      expect(message).toMatch(/url/);
      expect(message).toMatch(/steps\.0\.target/);
    }
  });

  it("explains what a target needs", () => {
    expect(() =>
      parseFlow({
        url: "https://example.com",
        steps: [{ action: "click", target: { name: "Save" } }],
      }),
    ).toThrow(/role, text, label, placeholder, testId or css/);
  });

  it("rejects a wait with neither ms nor for", () => {
    expect(() =>
      parseFlow({
        url: "https://example.com",
        steps: [{ action: "wait" }],
      }),
    ).toThrow(/ms or for/);
  });

  it("rejects an unknown action", () => {
    expect(() =>
      parseFlow({
        url: "https://example.com",
        steps: [{ action: "teleport" }],
      }),
    ).toThrow(/steps\.0\.action/);
  });
});

describe("loadFlow", () => {
  it("reads a flow file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "flow-"));
    const path = join(dir, "demo.json");
    writeFileSync(
      path,
      JSON.stringify({ url: "https://example.com", steps: [] }),
    );
    expect((await loadFlow(path)).url).toBe("https://example.com");
  });

  it("turns a bare URL into a flow with no steps", async () => {
    expect(await loadFlow("https://example.com/app")).toEqual({
      url: "https://example.com/app",
      viewport: { width: 1280, height: 800 },
      steps: [],
    });
  });

  it("says which file isn't valid JSON", async () => {
    const dir = mkdtempSync(join(tmpdir(), "flow-"));
    const path = join(dir, "broken.json");
    writeFileSync(path, "{ nope");
    await expect(loadFlow(path)).rejects.toThrow(/broken\.json.*JSON/);
  });
});

describe("describeStep", () => {
  it("names the action and its target briefly", () => {
    expect(
      describeStep({
        action: "click",
        target: { role: "button", name: "Save" },
      }),
    ).toBe('click role=button name="Save"');
    expect(describeStep({ action: "press", key: "Enter" })).toBe("press Enter");
    expect(describeStep({ action: "wait", ms: 300 })).toBe("wait 300ms");
    expect(describeStep({ action: "goto", url: "https://example.com/x" })).toBe(
      "goto https://example.com/x",
    );
  });
});
