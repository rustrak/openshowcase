import { afterEach, describe, expect, it, vi } from "vitest";
import { each, h, mount, onCleanup, show, svg, untracked } from "../../dom/h";
import { signal } from "../../dom/signals";
import { injectStyles } from "../../dom/styles";

describe("h", () => {
  it("creates an element with static attributes and children", () => {
    const el = h(
      "button",
      { type: "button", "aria-label": "Go", class: "a b" },
      h("span", null, "Hi"),
      " there",
      42,
    );

    expect(el.tagName).toBe("BUTTON");
    expect(el.getAttribute("type")).toBe("button");
    expect(el.getAttribute("aria-label")).toBe("Go");
    expect(el.className).toBe("a b");
    expect(el.innerHTML).toBe("<span>Hi</span> there42");
  });

  it("skips null, undefined and false children and flattens arrays", () => {
    const el = h("div", null, null, undefined, false, ["a", ["b", null]], "c");
    expect(el.textContent).toBe("abc");
  });

  it("wires on* props as event listeners", () => {
    const onclick = vi.fn();
    const el = h("button", { onclick });

    el.click();

    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it("removes an attribute whose value is false, null or undefined, and sets true as empty", () => {
    const el = h("input", { disabled: true, hidden: false, title: undefined });
    expect(el.getAttribute("disabled")).toBe("");
    expect(el.hasAttribute("hidden")).toBe(false);
    expect(el.hasAttribute("title")).toBe(false);
  });

  it("keeps a function prop bound to the signals it reads", () => {
    const left = signal(10);
    const on = signal(false);
    const el = h("div", {
      class: () => (on() ? "x x--on" : "x"),
      style: () => `left: ${left()}px;`,
    });
    expect(el.className).toBe("x");
    expect(el.style.left).toBe("10px");

    left(20);
    on(true);

    expect(el.className).toBe("x x--on");
    expect(el.style.left).toBe("20px");
  });

  it("keeps a function child bound as reactive text", () => {
    const count = signal(1);
    const el = h("p", null, "n=", () => count());

    count(2);

    expect(el.textContent).toBe("n=2");
  });
});

describe("mount", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("appends the view and, on dispose, removes it and stops its bindings", () => {
    const text = signal("a");
    const container = document.createElement("div");
    document.body.append(container);
    let el!: HTMLElement;

    const dispose = mount(() => {
      el = h("p", { title: () => text() }, () => text());
      return el;
    }, container);
    expect(container.firstChild).toBe(el);

    dispose();
    text("b");

    expect(container.firstChild).toBeNull();
    expect(el.textContent).toBe("a");
    expect(el.getAttribute("title")).toBe("a");
  });
});

describe("injectStyles", () => {
  it("adds a <style> once per id and document", () => {
    const doc = document.implementation.createHTMLDocument();

    injectStyles(doc, "thing", ".thing { color: red; }");
    injectStyles(doc, "thing", ".thing { color: red; }");

    const styles = doc.head.querySelectorAll("style");
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toBe(".thing { color: red; }");
  });
});

describe("svg", () => {
  it("creates SVG-namespaced elements with reactive attributes", () => {
    const d = signal("M0 0");
    const el = svg("svg", { width: 10 }, svg("path", { d: () => d() }));

    d("M1 1");

    expect(el.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(el.firstElementChild?.namespaceURI).toBe(
      "http://www.w3.org/2000/svg",
    );
    expect(el.getAttribute("width")).toBe("10");
    expect(el.firstElementChild?.getAttribute("d")).toBe("M1 1");
  });
});

describe("show", () => {
  it("mounts the view while the condition holds, keeping the same instance", () => {
    const on = signal(false);
    const label = signal("a");
    let created = 0;
    const host = document.createElement("div");
    const dispose = mount(() => {
      host.append(
        h("i"),
        show(
          () => on(),
          () => {
            created++;
            return h("b", null, () => label());
          },
        ),
      );
      return host;
    }, document.createElement("div"));

    expect(host.querySelector("b")).toBeNull();
    on(true);
    label("b");
    on(true);
    expect(host.querySelector("b")?.textContent).toBe("b");
    expect(created).toBe(1);
    // placed where show() was put, after the <i>
    expect(host.lastElementChild?.tagName).toBe("B");

    on(false);
    expect(host.querySelector("b")).toBeNull();
    dispose();
  });

  it("stops the view's bindings when it hides", () => {
    const on = signal(true);
    const label = signal("a");
    let b!: HTMLElement;
    const dispose = mount(
      () =>
        h(
          "div",
          null,
          show(
            () => on(),
            () => {
              b = h("b", null, () => label());
              return b;
            },
          ),
        ),
      document.createElement("div"),
    );

    on(false);
    label("z");

    expect(b.textContent).toBe("a");
    dispose();
  });

  it("plays the exit before removing the view, frozen at its last values", async () => {
    const on = signal(true);
    const label = signal("a");
    let finish!: () => void;
    const exit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const host = h(
      "div",
      null,
      show(
        () => on(),
        () => h("b", null, () => label()),
        { exit },
      ),
    );
    const b = host.querySelector("b") as HTMLElement;

    on(false);
    label("z");
    expect(exit).toHaveBeenCalledWith(b);
    expect(host.contains(b)).toBe(true);
    expect(b.textContent).toBe("a");

    finish();
    await vi.waitFor(() => expect(host.contains(b)).toBe(false));
  });
});

describe("each", () => {
  it("renders one view per item, keeps nodes by key and updates them in place", () => {
    const items = signal([
      { id: 1, label: "a" },
      { id: 2, label: "b" },
    ]);
    const host = h(
      "ul",
      null,
      each(
        () => items(),
        (item) => item.id,
        (item) => h("li", null, () => item().label),
      ),
    );
    const [first, second] = [...host.children];

    items([
      { id: 2, label: "B" },
      { id: 3, label: "c" },
      { id: 1, label: "a" },
    ]);

    const lis = [...host.children];
    expect(lis.map((li) => li.textContent)).toEqual(["B", "c", "a"]);
    expect(lis[0]).toBe(second);
    expect(lis[2]).toBe(first);
  });

  it("removes views whose key is gone and stops their bindings", () => {
    const label = signal("x");
    const items = signal([1, 2]);
    const host = h(
      "ul",
      null,
      each(
        () => items(),
        (n) => n,
        (n) => h("li", null, () => `${n()}${label()}`),
      ),
    );
    const gone = host.children[1] as HTMLElement;

    items([1]);
    label("y");

    expect(host.children).toHaveLength(1);
    expect(host.textContent).toBe("1y");
    expect(gone.textContent).toBe("2x");
  });
});

describe("onCleanup and untracked", () => {
  it("runs cleanups when the scope is disposed", () => {
    const cleanup = vi.fn();
    const dispose = mount(() => {
      onCleanup(cleanup);
      return h("div");
    }, document.createElement("div"));

    expect(cleanup).not.toHaveBeenCalled();
    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("reads a signal without subscribing to it", () => {
    const tracked = signal(1);
    const other = signal(1);
    const el = h("p", { title: () => `${tracked()}-${untracked(other)}` });

    other(2);
    expect(el.getAttribute("title")).toBe("1-1");
    tracked(2);
    expect(el.getAttribute("title")).toBe("2-2");
  });
});
