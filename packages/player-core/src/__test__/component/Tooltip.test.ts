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

  it("flips to the top side when there is no room below the anchor", async () => {
    const screen = await render({
      anchor: { left: 100, top: 295 },
      stageSize,
      visible: true,
      text: "Hi",
    });
    await vi.waitFor(() =>
      expect(
        screen
          .getByText("Hi")
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
      text: "Hi",
    });
    expect(
      (screen.getByText("Hi").element() as HTMLElement).classList.contains(
        "tooltip--visible",
      ),
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
      text: "Hi",
      onhoverchange,
    });
    const el = screen.getByText("Hi");

    await el.hover();
    expect(onhoverchange).toHaveBeenLastCalledWith(true);

    await el.unhover();
    expect(onhoverchange).toHaveBeenLastCalledWith(false);
  });

  it("applies the hover class when the parent sets the hovered prop", async () => {
    const screen = await render({
      anchor: { left: 0, top: 0 },
      stageSize,
      visible: true,
      text: "Hi",
      hovered: true,
    });
    expect(
      (screen.getByText("Hi").element() as HTMLElement).classList.contains(
        "tooltip--hover",
      ),
    ).toBe(true);
  });

  it("calls onclick when clicked", async () => {
    const onclick = vi.fn();
    const screen = await render({
      anchor: { left: 0, top: 0 },
      stageSize,
      visible: true,
      text: "Hi",
      onclick,
    });

    await screen.getByText("Hi").click();

    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it("keeps showing the old text while fading out, then swaps it in", async () => {
    const props = {
      anchor: { left: 100, top: 100 },
      stageSize,
      visible: true,
      text: "First",
    };
    const screen = await render(props);
    const el = screen.getByText("First").element() as HTMLElement;

    await screen.rerender({ ...props, visible: false, text: "Second" });
    expect(el.textContent).toBe("First");

    await vi.waitFor(() => expect(el.textContent).toBe("Second"));
    expect(el.classList.contains("tooltip--visible")).toBe(false);
  });
});
