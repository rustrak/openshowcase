import {
  computed,
  effect,
  effectScope,
  endBatch,
  setActiveSub,
  signal,
  startBatch,
} from "./signals";

/** A value, or a getter re-read whenever the signals it reads change. */
export type Reactive<T> = T | (() => T);

/** A component's props: data as getters (so it stays live), `on*` callbacks as they are. */
export type ViewProps<P> = {
  [K in keyof P]: K extends `on${string}` ? P[K] : () => P[K];
};

type Primitive = string | number | boolean | null | undefined;
export type Child = Node | Primitive | (() => Primitive) | Child[];

type AttributeValue = Reactive<Primitive>;
// biome-ignore lint/suspicious/noExplicitAny: handlers receive the event type of their `on*` name
type EventHandler = (event: any) => void;
export type Props = Record<string, AttributeValue | EventHandler>;

const SVG_NS = "http://www.w3.org/2000/svg";

/** Joins the truthy class names — `cx("a", on && "a--on")`, like Svelte's `class:` directives. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** Runs `fn` without subscribing the current effect to the signals it reads. */
export function untracked<T>(fn: () => T): T {
  const prev = setActiveSub(undefined);
  try {
    return fn();
  } finally {
    setActiveSub(prev);
  }
}

/** Runs `fn` when the current scope (a `mount()`, or a `show()`/`each()` view) is disposed. */
export function onCleanup(fn: () => void): void {
  effect(() => fn);
}

/** Builds a view in its own scope, detached from whatever effect is running (which would
 * otherwise dispose it on its next run). Returns the view and the scope's dispose. */
function createView<T>(render: () => T): { view: T; stop: () => void } {
  let view!: T;
  const stop = untracked(() =>
    effectScope(() => {
      view = render();
    }),
  );
  return { view, stop };
}

function setAttribute(el: Element, name: string, value: Primitive): void {
  if (name.startsWith("aria-") && typeof value === "boolean") {
    el.setAttribute(name, String(value));
  } else if (value === false || value == null) {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, value === true ? "" : String(value));
  }
}

function appendChild(parent: Node, child: Child): void {
  if (child == null || child === false || child === true) return;
  if (Array.isArray(child)) {
    for (const nested of child) appendChild(parent, nested);
  } else if (child instanceof Node) {
    parent.appendChild(child);
  } else if (typeof child === "function") {
    const text = document.createTextNode("");
    effect(() => {
      const value = child();
      text.data = value == null || value === false ? "" : String(value);
    });
    parent.appendChild(text);
  } else {
    parent.appendChild(document.createTextNode(String(child)));
  }
}

function build<E extends Element>(
  el: E,
  props: Props | null | undefined,
  children: Child[],
): E {
  for (const [name, value] of Object.entries(props ?? {})) {
    if (name.startsWith("on") && typeof value === "function") {
      el.addEventListener(name.slice(2), value as EventHandler);
    } else if (typeof value === "function") {
      effect(() => setAttribute(el, name, (value as () => Primitive)()));
    } else {
      setAttribute(el, name, value);
    }
  }
  appendChild(el, children);
  return el;
}

/**
 * Creates an element. `on*` props become event listeners; a function prop or child stays
 * bound to the signals it reads (one effect per binding, so only that attribute or text
 * node is touched when they change). Bindings belong to the enclosing scope.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  return build(document.createElement(tag), props, children);
}

/** `h()` for SVG elements. */
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Child[]
): SVGElementTagNameMap[K] {
  return build(document.createElementNS(SVG_NS, tag), props, children);
}

/** Builds `view` inside a scope and appends it; the returned dispose stops every binding and
 * removes what it appended (every node, when the view is a fragment). */
export function mount(view: () => Node, container: Node): () => void {
  const { view: node, stop } = createView(view);
  const nodes =
    node instanceof DocumentFragment ? [...node.childNodes] : [node];
  container.appendChild(node);
  return () => {
    stop();
    for (const n of nodes) n.parentNode?.removeChild(n);
  };
}

/** Applies several signal writes as one change: effects run once, after `fn`. */
export function batch(fn: () => void): void {
  startBatch();
  try {
    fn();
  } finally {
    endBatch();
  }
}

/** The last value `get()` returned that wasn't undefined — what a view that is leaving (its
 * data already gone) keeps showing while it plays its exit. */
export function latest<T>(get: () => T | undefined): () => T {
  return computed<T>((previous) => get() ?? (previous as T));
}

export interface ShowOptions {
  /** Plays when the view hides; the view is removed once it resolves. Its bindings are
   * already stopped, so it stays frozen at its last values while leaving. */
  exit?: (el: Element) => Promise<void>;
}

/**
 * `{#if}`: the view exists while `when()` is truthy. It's created once per time the
 * condition turns true (never re-created while it stays true) and disposed when it turns false.
 */
export function show(
  when: () => unknown,
  render: () => Node,
  options: ShowOptions = {},
): Node {
  const anchor = document.createComment("");
  const fragment = document.createDocumentFragment();
  fragment.appendChild(anchor);
  let current: { view: Node; stop: () => void } | undefined;

  const hide = (animate: boolean) => {
    if (!current) return;
    const { view, stop } = current;
    current = undefined;
    stop();
    if (animate && options.exit && view instanceof Element) {
      void options.exit(view).then(() => view.remove());
    } else {
      view.parentNode?.removeChild(view);
    }
  };

  effect(() => {
    const on = Boolean(when());
    untracked(() => {
      if (on && !current) {
        current = createView(render);
        anchor.parentNode?.insertBefore(current.view, anchor);
      } else if (!on) {
        hide(true);
      }
    });
  });
  onCleanup(() => hide(false));
  return fragment;
}

/**
 * `{#each}` with keys: one view per item. A view whose key stays is kept and updated in place
 * (`item()` returns the latest item); a view whose key goes away is disposed and removed.
 */
export function each<T>(
  items: () => readonly T[],
  key: (item: T, index: number) => unknown,
  render: (item: () => T, index: number) => Node,
): Node {
  const anchor = document.createComment("");
  const fragment = document.createDocumentFragment();
  fragment.appendChild(anchor);
  type Entry = {
    view: Node;
    stop: () => void;
    set: (item: T) => void;
  };
  let entries = new Map<unknown, Entry>();

  effect(() => {
    const list = items();
    untracked(() => {
      const next = new Map<unknown, Entry>();
      list.forEach((item, index) => {
        const k = key(item, index);
        let entry = entries.get(k);
        if (entry) {
          entry.set(item);
        } else {
          const value = signal(item);
          const created = createView(() => render(() => value(), index));
          entry = { ...created, set: (v) => value(v) };
        }
        next.set(k, entry);
      });
      for (const [k, entry] of entries) {
        if (next.has(k)) continue;
        entry.stop();
        entry.view.parentNode?.removeChild(entry.view);
      }
      entries = next;
      const parent = anchor.parentNode;
      if (parent)
        for (const { view } of next.values()) parent.insertBefore(view, anchor);
    });
  });
  onCleanup(() => {
    for (const entry of entries.values()) {
      entry.stop();
      entry.view.parentNode?.removeChild(entry.view);
    }
    entries = new Map();
  });
  return fragment;
}
