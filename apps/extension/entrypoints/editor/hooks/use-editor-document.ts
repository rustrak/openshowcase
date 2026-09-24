import type { Theme } from "@rustrak/openshowcase-schema";
import { useCallback, useReducer } from "react";
import * as History from "../core/history";
import type { EditableStep } from "../lib/editable-step";

/** Everything the user edits — the unit that undo/redo moves through. */
export interface EditorDocument {
  title: string;
  theme: Theme;
  steps: EditableStep[];
}

type Action =
  | { type: "reset"; doc: EditorDocument }
  | {
      type: "commit";
      update: (doc: EditorDocument) => EditorDocument;
      coalesceKey?: string;
    }
  | { type: "patchAll"; patch: (doc: EditorDocument) => EditorDocument }
  | { type: "undo" }
  | { type: "redo" };

function reducer(
  h: History.History<EditorDocument>,
  action: Action,
): History.History<EditorDocument> {
  switch (action.type) {
    case "reset":
      return History.create(action.doc);
    case "commit": {
      const next = action.update(h.present);
      return next === h.present
        ? h
        : History.record(h, next, action.coalesceKey);
    }
    case "patchAll":
      return History.patchAll(h, action.patch);
    case "undo":
      return History.undo(h);
    case "redo":
      return History.redo(h);
  }
}

/**
 * The editor document plus its undo history. `commit` records an undoable edit (pass a
 * `coalesceKey` so a whole gesture — typing a label, dragging a slider — undoes as one);
 * `patchAll` applies background results (extracted frames) without an undo entry.
 */
export function useEditorDocument(initial: EditorDocument) {
  const [history, dispatch] = useReducer(reducer, initial, History.create);

  const commit = useCallback(
    (update: (doc: EditorDocument) => EditorDocument, coalesceKey?: string) =>
      dispatch({ type: "commit", update, coalesceKey }),
    [],
  );
  const patchAll = useCallback(
    (patch: (doc: EditorDocument) => EditorDocument) =>
      dispatch({ type: "patchAll", patch }),
    [],
  );
  const reset = useCallback(
    (doc: EditorDocument) => dispatch({ type: "reset", doc }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  return {
    doc: history.present,
    commit,
    patchAll,
    reset,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
