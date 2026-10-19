import { describe, expect, it } from "vitest";
import { extensionIdForPath } from "../../browser";

describe("extensionIdForPath", () => {
  it("matches the id Chromium gives an unpacked extension at that path", () => {
    // Read from a real Chromium launch with --load-extension at this path.
    expect(
      extensionIdForPath(
        "/Users/abiansuarezbrito/Documents/openshowcase/apps/extension/.output/chrome-mv3",
      ),
    ).toBe("hgcmjhpgnammaphhnaomjpapgjbmeopf");
  });

  it("is 32 letters from a to p", () => {
    expect(extensionIdForPath("/any/where")).toMatch(/^[a-p]{32}$/);
  });
});
