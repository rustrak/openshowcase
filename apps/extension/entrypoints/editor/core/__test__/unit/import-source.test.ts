import { describe, expect, it } from "vitest";
import {
  importedRecordingQuery,
  importPathFromQuery,
  opensInPreview,
} from "../../import-source";

describe("opensInPreview", () => {
  it("is only when asked", () => {
    expect(opensInPreview("?recordingId=a&view=preview")).toBe(true);
    expect(opensInPreview("?recordingId=a")).toBe(false);
    expect(opensInPreview("?view=edit")).toBe(false);
  });
});

describe("importedRecordingQuery", () => {
  it("keeps the view the import was asked to open in", () => {
    expect(
      importedRecordingQuery("abc", "?import=imports/x.osrec&view=preview"),
    ).toBe("?recordingId=abc&view=preview");
    expect(importedRecordingQuery("abc", "?import=imports/x.osrec")).toBe(
      "?recordingId=abc",
    );
    expect(importedRecordingQuery("abc", "")).toBe("?recordingId=abc");
  });
});

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
