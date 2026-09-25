import { onTestFinished } from "vitest";
import { type LocatorSelectors, utils } from "vitest/browser";
import { mount, type ViewProps } from "../dom/h";
import { signal } from "../dom/signals";

type Signal<T> = { (): T; (value: T): void };

export interface ViewScreen<P> extends LocatorSelectors {
  container: HTMLElement;
  rerender(next: Partial<P>): void;
}

/**
 * The `vitest-browser-svelte` `render()` contract for `dom/h` components, so one test file
 * can run against both the Svelte component and its replacement while migrating. Plain prop
 * values become signals (`rerender` sets them); `on*` callbacks are passed through.
 */
export function renderView<P extends object>(
  component: (props: ViewProps<P>) => Node,
  props: P,
): ViewScreen<P> {
  const callbacks: Record<string, unknown> = {};
  const signals = new Map<string, Signal<unknown>>();
  const signalFor = (name: string) => {
    let sig = signals.get(name);
    if (!sig) {
      sig = signal<unknown>(undefined) as Signal<unknown>;
      signals.set(name, sig);
    }
    return sig;
  };
  const set = (values: object) => {
    for (const [name, value] of Object.entries(values)) {
      if (name.startsWith("on")) callbacks[name] = value;
      else signalFor(name)(value);
    }
  };
  set(props);
  // Any prop, even one first passed by a later `rerender`, reads as a getter (like a Svelte prop).
  const viewProps = new Proxy(
    {},
    {
      get: (_, name) =>
        typeof name !== "string"
          ? undefined
          : name.startsWith("on")
            ? callbacks[name]
            : () => signalFor(name)(),
    },
  ) as ViewProps<P>;

  // components always live inside the player root, which scopes their CSS
  const container = document.createElement("div");
  container.className = "openshowcase-player";
  document.body.appendChild(container);
  const dispose = mount(() => component(viewProps), container);
  onTestFinished(() => {
    dispose();
    container.remove();
  });

  return {
    container,
    ...utils.getElementLocatorSelectors(container),
    rerender(next: Partial<P>) {
      set(next);
    },
  };
}
