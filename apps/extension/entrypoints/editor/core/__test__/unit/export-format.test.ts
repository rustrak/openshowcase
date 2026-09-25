import { describe, expect, it } from "vitest";
import { embedSnippet, exportFileName } from "../../export-format";

describe("exportFileName", () => {
  it("names the single file after the demo title", () => {
    expect(exportFileName("Onboarding Flow", "openshowcase")).toBe(
      "onboarding-flow.openshowcase",
    );
  });

  it("names the zip after the demo title", () => {
    expect(exportFileName("  Onboarding   Flow ", "zip")).toBe(
      "onboarding-flow.zip",
    );
  });

  it("falls back to 'demo' for an empty title", () => {
    expect(exportFileName("   ", "openshowcase")).toBe("demo.openshowcase");
  });
});

describe("embedSnippet", () => {
  it("points the player straight at the single file", () => {
    expect(embedSnippet("onboarding-flow.openshowcase", "openshowcase")).toBe(
      `import { InteractiveDemo } from "@rustrak/openshowcase-player-react";

<InteractiveDemo src="/demos/onboarding-flow.openshowcase" />`,
    );
  });

  it("points the player at steps.json in the unzipped folder", () => {
    expect(embedSnippet("onboarding-flow.zip", "zip")).toBe(
      `import { InteractiveDemo } from "@rustrak/openshowcase-player-react";

<InteractiveDemo src="/demos/onboarding-flow/steps.json" />`,
    );
  });
});
