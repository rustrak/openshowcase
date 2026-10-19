import { describe, expect, it } from "vitest";
import { compactSnapshot, formatInspection } from "../../inspect";

describe("formatInspection", () => {
  it("lists where the flow ended up, then the page's accessibility tree", () => {
    expect(
      formatInspection({
        url: "https://example.com/invoices",
        title: "Invoices",
        screenshot: "/tmp/shot.png",
        ran: 2,
        total: 2,
        snapshot: '- heading "Invoices" [level=1]',
      }),
    ).toBe(
      [
        "URL: https://example.com/invoices",
        "Title: Invoices",
        "Screenshot: /tmp/shot.png",
        "Steps: all 2 ran",
        "",
        "Accessibility tree:",
        '- heading "Invoices" [level=1]',
      ].join("\n"),
    );
  });

  it("says a bare URL ran no steps", () => {
    const text = formatInspection({
      url: "https://example.com",
      title: "",
      screenshot: "/tmp/shot.png",
      ran: 0,
      total: 0,
      snapshot: "",
    });
    expect(text).toContain("Steps: none (just the start page)");
  });

  it("leaves the screenshot line out when none was taken", () => {
    const text = formatInspection({
      url: "https://example.com",
      title: "",
      ran: 0,
      total: 0,
      snapshot: "",
    });
    expect(text).not.toContain("Screenshot");
  });

  it("puts a failed step up front", () => {
    const text = formatInspection({
      url: "https://example.com",
      title: "",
      screenshot: "/tmp/shot.png",
      ran: 1,
      total: 3,
      error: 'Step 2 (click role=button name="Save") failed: Timeout',
      snapshot: '- button "Cancel"',
    });
    expect(text).toContain(
      'Steps: 1 of 3 ran. Step 2 (click role=button name="Save") failed: Timeout',
    );
  });
});

describe("compactSnapshot", () => {
  it("drops link URLs: targets use names, and they cost tokens", () => {
    expect(
      compactSnapshot(
        [
          '- link "Invoices":',
          "  - /url: /sale/invoices",
          '- button "New"',
        ].join("\n"),
      ),
    ).toBe(['- link "Invoices"', '- button "New"'].join("\n"));
  });
});
