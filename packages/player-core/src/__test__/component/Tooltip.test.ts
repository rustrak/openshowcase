import { describe, expect, it, vi } from "vitest";
import { Tooltip, type TooltipProps } from "../../ui/Tooltip/Tooltip";
import { renderView } from "../render-view";

const stageSize = { width: 400, height: 300 };

const render = (props: TooltipProps) => renderView(Tooltip, props);

describe("Tooltip", () => {
  it("renders the label text and colors, self-measuring its placement from the anchor", async () => {
    const screen = await render({
      anchor: { left: 100, top: 100 },
      stageSize,
      visible: true,
      text: "Click here",
      bgColor: "#123456",
      textColor: "#fedcba",
    });
    const el = screen.getByText("Click here").element() as HTMLElement;

    await vi.waitFor(() => expect(el.style.left).not.toBe(""));
    expect(el.style.getPropertyValue("--wd-tip-bg")).toBe("#123456");
    expect(el.style.color).toBe("rgb(254, 220, 186)");
    expect(el.classList.contains("tooltip--visible")).toBe(true);
    // enough room below a mid-stage anchor — auto prefers the bottom side
    expect(el.classList.contains("tooltip--side-bottom")).toBe(true);
  });

  it("splits the text into staggered words, reading the same", async () => {
    const screen = await render({
      anchor: { left: 100, top: 100 },
      stageSize,
      visible: true,
      text: "Open  the issue",
    });
    const el = screen.getByText("Open the issue").element() as HTMLElement;

    const words = [...el.querySelectorAll<HTMLElement>(".tip-word")];
    expect(words.map((word) => word.textContent)).toEqual([
      "Open",
      "the",
      "issue",
    ]);
    expect(words[2]?.style.getPropertyValue("--wd-i")).toBe("2");
    expect(el.textContent).toBe("Open  the issue");
    expect(getComputedStyle(words[0] as HTMLElement).animationName).toBe(
      "openshowcase-tip-word",
    );
  });

  it("flips to the top side when there is no room below the anchor", async () => {
    const screen = await render({
      anchor: { left: 100, top: 295 },
      stageSize,
      visible: true,
      text: "Hi there",
    });
    await vi.waitFor(() =>
      expect(
        screen
          .getByText("Hi there")
          .element()
          .classList.contains("tooltip--side-top"),
      ).toBe(true),
    );
  });

  it("is not marked visible when visible is false", async () => {
    const screen = await render({
      anchor: { left: 0, top: 0 },
      stageSize,
      visible: false,
      text: "Hi there",
    });
    expect(
      (
        screen.getByText("Hi there").element() as HTMLElement
      ).classList.contains("tooltip--visible"),
    ).toBe(false);
  });

  it("reports raw hover events without deciding its own hover state", async () => {
    // hover is shared with the Hotspot point and owned by the parent (PhotoLayer), so this
    // component must only report the raw enter/leave — it does not toggle itself.
    const onhoverchange = vi.fn();
    const screen = await render({
      anchor: { left: 0, top: 0 },
      stageSize,
      visible: true,
      text: "Hi there",
      onhoverchange,
    });
    const el = screen.getByText("Hi there");

    await el.hover();
    expect(onhoverchange).toHaveBeenLastCalledWith(true);

    await el.unhover();
    expect(onhoverchange).toHaveBeenLastCalledWith(false);
  });

  it("has a footer with the demo's progress, only when told the step", async () => {
    const screen = await render({
      anchor: { left: 100, top: 100 },
      stageSize,
      visible: true,
      text: "Hi there",
    });
    const part = (selector: string) =>
      screen.container.querySelector<HTMLElement>(selector);
    expect(part(".tip-foot")).toBeNull();

    await screen.rerender({
      anchor: { left: 100, top: 100 },
      stageSize,
      visible: true,
      text: "Hi there",
      step: { current: 1, total: 4 },
    });
    expect(part(".tip-count")?.textContent).toBe("1/4");
    expect(part(".tip-bar-fill")?.style.width).toBe("25%");
    expect(part(".tip-go svg")).not.toBeNull();
  });

  it("doesn't move on hover, only when pressed", async () => {
    const screen = await render({
      anchor: { left: 100, top: 100 },
      stageSize,
      visible: true,
      text: "Hi there",
      onhoverchange: vi.fn(),
    });
    const el = screen.getByText("Hi there");
    await vi.waitFor(() =>
      expect(getComputedStyle(el.element()).scale).toBe("1"),
    );

    await el.hover();
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(getComputedStyle(el.element()).scale).toBe("1");
  });

  it("keeps a demo's colors from adding other styles", async () => {
    const evil = "red; background: url(https://example.com/x)";
    const screen = await render({
      anchor: { left: 100, top: 100 },
      stageSize,
      visible: true,
      text: "Hi there",
      bgColor: evil,
      textColor: evil,
    });
    const el = screen.getByText("Hi there").element() as HTMLElement;

    expect(el.getAttribute("style") ?? "").not.toContain("url(");
    expect(screen.container.innerHTML).not.toContain("url(https://");
  });

  it("calls onclick when clicked", async () => {
    const onclick = vi.fn();
    const screen = await render({
      anchor: { left: 0, top: 0 },
      stageSize,
      visible: true,
      text: "Hi there",
      onclick,
    });

    await screen.getByText("Hi there").click();

    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it("keeps showing the old text while fading out, then swaps it in", async () => {
    const props = {
      anchor: { left: 100, top: 100 },
      stageSize,
      visible: true,
      text: "First text",
    };
    const screen = await render(props);
    const el = screen.getByText("First text").element() as HTMLElement;

    await screen.rerender({ ...props, visible: false, text: "Second text" });
    expect(el.textContent).toBe("First text");

    await vi.waitFor(() => expect(el.textContent).toBe("Second text"));
    expect(el.classList.contains("tooltip--visible")).toBe(false);
  });
});
