import { describe, expect, it } from "vitest";
import { playgroundQuery, playgroundSource } from "../../playground-url";

describe("playground URL", () => {
  it("round-trips a file's URL and name", () => {
    const query = playgroundQuery({
      url: "blob:chrome-extension://abc/1234",
      name: "my demo.openshowcase",
    });
    expect(playgroundSource(query)).toEqual({
      url: "blob:chrome-extension://abc/1234",
      name: "my demo.openshowcase",
    });
  });

  it("opens empty without a file", () => {
    expect(playgroundSource("")).toBeUndefined();
  });

  it("names a file without a name after its URL's end", () => {
    expect(
      playgroundSource("?src=https%3A%2F%2Fx.dev%2Fdemos%2Fa.openshowcase"),
    ).toEqual({
      url: "https://x.dev/demos/a.openshowcase",
      name: "a.openshowcase",
    });
  });
});
