/**
 * Undo/redo history over an immutable document, as pure functions — the editor wires
 * them into React state, tests call them directly.
 */
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** Coalesce key of the last recorded edit — consecutive edits with the same key merge. */
  lastKey?: string;
}

export function create<T>(initial: T): History<T> {
  return { past: [], present: initial, future: [] };
}

/**
 * Records `next` as a new undo entry. Passing a `coalesceKey` merges it into the previous
 * entry when that one was recorded with the same key (typing in a field, dragging a slider),
 * so one gesture undoes as one step.
 */
export function record<T>(
  h: History<T>,
  next: T,
  coalesceKey?: string,
): History<T> {
  if (coalesceKey !== undefined && coalesceKey === h.lastKey) {
    return { ...h, present: next, future: [] };
  }
  return {
    past: [...h.past, h.present],
    present: next,
    future: [],
    lastKey: coalesceKey,
  };
}

export function undo<T>(h: History<T>): History<T> {
  const previous = h.past.at(-1);
  if (previous === undefined) return h;
  return {
    past: h.past.slice(0, -1),
    present: previous,
    future: [h.present, ...h.future],
  };
}

export function redo<T>(h: History<T>): History<T> {
  const [next, ...rest] = h.future;
  if (next === undefined) return h;
  return { past: [...h.past, h.present], present: next, future: rest };
}

/**
 * Applies `patch` to every snapshot — present, past and future — without recording an
 * entry. For results that arrive asynchronously (extracted frames) and must survive any
 * undo/redo instead of being rolled back by it.
 */
export function patchAll<T>(h: History<T>, patch: (doc: T) => T): History<T> {
  return {
    ...h,
    past: h.past.map(patch),
    present: patch(h.present),
    future: h.future.map(patch),
  };
}
