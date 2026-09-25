import { describe, expect, it, vi } from "vitest";
import { Hotspot, type HotspotProps, vanish } from "../../ui/Hotspot/Hotspot";
import { renderView } from "../render-view";

const render = (props: HotspotProps) => renderView(Hotspot, props);

describe("Hotspot", () => {
  it("positions itself at the given left/top and sets the color custom property", async () => {
    const screen = await render({
      left: 42,
      top: 17,
      color: "#ABCDEF",
    });
    const button = screen.getByRole("button").element() as HTMLElement;

    expect(button.style.left).toBe("42px");
    expect(button.style.top).toBe("17px");
    expect(button.style.getPropertyValue("--openshowcase-color")).toBe(
      "#ABCDEF",
    );
  });

  it("calls onclick when clicked", async () => {
    const onclick = vi.fn();
    const screen = await render({ left: 50, top: 50, onclick });

    await screen.getByRole("button").click();

    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it("reports raw hover events without deciding its own hover state", async () => {
    // hover is shared with the Tooltip and owned by the parent (PhotoLayer), so this
    // component must only report the raw enter/leave — it does not toggle itself.
    const onhoverchange = vi.fn();
    const screen = await render({ left: 50, top: 50, onhoverchange });
    const button = screen.getByRole("button");

    await button.hover();
    expect(onhoverchange).toHaveBeenLastCalledWith(true);

    await button.unhover();
    expect(onhoverchange).toHaveBeenLastCalledWith(false);
  });

  it("applies the hover class when the parent sets the hovered prop", async () => {
    const screen = await render({ left: 0, top: 0, hovered: true });
    expect(
      (screen.getByRole("button").element() as HTMLElement).classList.contains(
        "hotspot--hover",
      ),
    ).toBe(true);
  });

  it('applies the "still" class when instant is true', async () => {
    const screen = await render({ left: 0, top: 0, instant: true });
    expect(
      (screen.getByRole("button").element() as HTMLElement).classList.contains(
        "hotspot--still",
      ),
    ).toBe(true);
  });

  it('does not apply the "still" class when instant is false', async () => {
    const screen = await render({ left: 0, top: 0, instant: false });
    expect(
      (screen.getByRole("button").element() as HTMLElement).classList.contains(
        "hotspot--still",
      ),
    ).toBe(false);
  });

  it("follows prop changes: moves and toggles its classes in place", async () => {
    const screen = await render({ left: 10, top: 20, hovered: false });
    const button = screen.getByRole("button").element() as HTMLElement;

    await screen.rerender({ left: 30, top: 40, hovered: true });

    expect(screen.getByRole("button").element()).toBe(button);
    expect(button.style.left).toBe("30px");
    expect(button.style.top).toBe("40px");
    expect(button.classList.contains("hotspot--hover")).toBe(true);
  });

  it('applies the "appear" class only when appear is true', async () => {
    const screen = await render({ left: 0, top: 0, appear: true });
    expect(
      (screen.getByRole("button").element() as HTMLElement).classList.contains(
        "hotspot--appear",
      ),
    ).toBe(true);
  });
});

describe("Hotspot exit", () => {
  it("vanish() fades and shrinks the element out, then resolves", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    const done = vanish(el);
    expect(el.getAnimations()).toHaveLength(1);
    await done;

    expect(getComputedStyle(el).opacity).toBe("0");
    el.remove();
  });
});
