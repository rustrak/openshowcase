import { describe, expect, it } from "vitest";
import type { MarkerRecord } from "@/lib/db";
import { type ClickCue, cueClicks } from "@/lib/direction";

function marker(
  capturedAt: number,
  kind: MarkerRecord["kind"] = "click",
): MarkerRecord {
  return {
    id: `m-${capturedAt}`,
    recordingId: "rec-1",
    kind,
    capturedAt,
    pageUrl: "https://example.com",
  };
}

const label = (start: number, end: number, text: string): ClickCue => ({
  start,
  end,
  label: text,
});

describe("cueClicks", () => {
  it("labels the click pressed while the flow's click was running", () => {
    const labelled = cueClicks(
      [marker(1_050), marker(2_030)],
      [label(1_000, 1_100, "Open invoices"), label(2_000, 2_100, "New one")],
    );
    expect(labelled.map((m) => m.label)).toEqual(["Open invoices", "New one"]);
  });

  it("tolerates a press stamped just outside the click's window", () => {
    const [labelled] = cueClicks(
      [marker(990)],
      [label(1_000, 1_100, "Open invoices")],
    );
    expect(labelled?.label).toBe("Open invoices");
  });

  it("leaves clicks no flow step caused unlabelled", () => {
    const labelled = cueClicks(
      [marker(500), marker(1_050)],
      [label(1_000, 1_100, "Open invoices")],
    );
    expect(labelled.map((m) => m.label)).toEqual([undefined, "Open invoices"]);
  });

  it("gives one label to only one click (a double-fired press keeps the first)", () => {
    const labelled = cueClicks(
      [marker(1_040), marker(1_060)],
      [label(1_000, 1_100, "Open invoices")],
    );
    expect(labelled.map((m) => m.label)).toEqual(["Open invoices", undefined]);
  });

  it("never labels activity markers", () => {
    const labelled = cueClicks(
      [marker(1_050, "type")],
      [label(1_000, 1_100, "Open invoices")],
    );
    expect(labelled[0]?.label).toBeUndefined();
  });

  it("carries the click's zoom and hotspot choice to its marker", () => {
    const [labelled] = cueClicks(
      [marker(1_050)],
      [{ start: 1_000, end: 1_100, zoom: 2, hotspot: false }],
    );
    expect(labelled).toMatchObject({ zoom: 2, hotspot: false });
    expect(labelled).not.toHaveProperty("label");
  });

  it("doesn't mutate the markers it's given", () => {
    const markers = [marker(1_050)];
    cueClicks(markers, [label(1_000, 1_100, "Open invoices")]);
    expect(markers[0]?.label).toBeUndefined();
  });
});
