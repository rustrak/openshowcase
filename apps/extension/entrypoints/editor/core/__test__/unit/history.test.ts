import { describe, expect, it } from "vitest";
import * as History from "../../history";

describe("history", () => {
  it("undoes a recorded edit back to the previous value", () => {
    let h = History.create(1);
    h = History.record(h, 2);
    h = History.undo(h);
    expect(h.present).toBe(1);
  });

  it("redoes an undone edit", () => {
    let h = History.record(History.create(1), 2);
    h = History.redo(History.undo(h));
    expect(h.present).toBe(2);
  });

  it("merges consecutive edits that share a coalesce key into one undo entry", () => {
    let h = History.create("");
    h = History.record(h, "a", "title");
    h = History.record(h, "ab", "title");
    h = History.record(h, "abc", "title");
    expect(History.undo(h).present).toBe("");
  });

  it("starts a new undo entry when the key changes or after an undo", () => {
    let h = History.create("");
    h = History.record(h, "a", "title");
    h = History.record(h, "a!", "label");
    expect(History.undo(h).present).toBe("a");

    h = History.undo(
      History.record(History.record(History.create(""), "x", "k"), "xy", "k"),
    );
    h = History.record(h, "z", "k");
    expect(h.past).toEqual([""]);
  });

  it("applies a background patch to every snapshot without adding an undo entry", () => {
    type Doc = { title: string; frame?: string };
    let h = History.create<Doc>({ title: "a" });
    h = History.record(h, { title: "b" });
    h = History.undo(h);
    h = History.patchAll(h, (doc) => ({ ...doc, frame: "img" }));

    expect(h.present).toEqual({ title: "a", frame: "img" });
    expect(h.past).toEqual([]);
    expect(History.redo(h).present).toEqual({ title: "b", frame: "img" });
  });
});
