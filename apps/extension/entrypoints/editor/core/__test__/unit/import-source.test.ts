import { describe, expect, it } from "vitest";
import { importPathFromQuery } from "../../import-source";

describe("importPathFromQuery", () => {
  it("reads a recording the recorder CLI put in the extension's imports folder", () => {
    expect(importPathFromQuery("?import=imports/factura-venta.osrec")).toBe(
      "imports/factura-venta.osrec",
    );
  });

  it("ignores pages without one", () => {
    expect(importPathFromQuery("?recordingId=abc")).toBeUndefined();
    expect(importPathFromQuery("")).toBeUndefined();
  });

  it("refuses anything outside the imports folder or not a recording", () => {
    expect(importPathFromQuery("?import=../secret.osrec")).toBeUndefined();
    expect(importPathFromQuery("?import=imports/../x.osrec")).toBeUndefined();
    expect(
      importPathFromQuery("?import=https://evil.example/x.osrec"),
    ).toBeUndefined();
    expect(importPathFromQuery("?import=imports/x.js")).toBeUndefined();
  });
});
