import { describe, expect, it } from "vitest";
import {
  displayHost,
  formatElapsed,
  formatRelativeTime,
  isRecordableUrl,
} from "../../format";

describe("isRecordableUrl", () => {
  it("accepts regular web pages", () => {
    expect(isRecordableUrl("https://app.example.com/dashboard")).toBe(true);
    expect(isRecordableUrl("http://localhost:3000/")).toBe(true);
  });

  it("rejects browser, extension and Web Store pages", () => {
    expect(isRecordableUrl("chrome://extensions/")).toBe(false);
    expect(isRecordableUrl("chrome-extension://abc/editor.html")).toBe(false);
    expect(isRecordableUrl("https://chromewebstore.google.com/detail/x")).toBe(
      false,
    );
    expect(isRecordableUrl("https://chrome.google.com/webstore/detail/x")).toBe(
      false,
    );
  });

  it("rejects missing or malformed URLs", () => {
    expect(isRecordableUrl(undefined)).toBe(false);
    expect(isRecordableUrl("not a url")).toBe(false);
  });
});

describe("displayHost", () => {
  it("strips www and keeps the port-less hostname", () => {
    expect(displayHost("https://www.example.com/a?b")).toBe("example.com");
    expect(displayHost("http://localhost:3000/")).toBe("localhost");
  });

  it("falls back to the raw value", () => {
    expect(displayHost("nope")).toBe("nope");
    expect(displayHost(undefined)).toBe("");
  });
});

describe("formatElapsed", () => {
  it("formats minutes and seconds", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(65_900)).toBe("1:05");
  });

  it("adds hours past an hour and clamps negatives", () => {
    expect(formatElapsed(3_723_000)).toBe("1:02:03");
    expect(formatElapsed(-5)).toBe("0:00");
  });
});

describe("formatRelativeTime", () => {
  const now = 1_000_000_000_000;

  it("collapses the last minute into 'just now'", () => {
    expect(formatRelativeTime(now - 30_000, now)).toBe("just now");
  });

  it("uses minutes, hours and days", () => {
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5 minutes ago");
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe("3 hours ago");
    expect(formatRelativeTime(now - 26 * 3_600_000, now)).toBe("yesterday");
  });
});
