import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import Navbar from "../../components/Navbar.svelte";
import type { NavbarSegment } from "../../components/types";

function segments(): NavbarSegment[] {
  return [
    { progress: 1, active: false, done: true },
    { progress: 0.4, active: true, done: false },
    { progress: 0, active: false, done: false },
  ];
}

describe("Navbar", () => {
  it("renders one segment per step with the right fill width", async () => {
    const screen = await render(Navbar, { segments: segments() });

    const fills = screen.container.querySelectorAll(".segment-fill");
    expect(fills).toHaveLength(3);
    expect((fills[0] as HTMLElement).style.width).toBe("100%");
    expect((fills[1] as HTMLElement).style.width).toBe("40%");
    expect((fills[2] as HTMLElement).style.width).toBe("0%");
  });

  it("marks the done segment with the done fill class and the active one with the active class", async () => {
    const screen = await render(Navbar, { segments: segments() });
    const buttons = screen.container.querySelectorAll(".segment");
    const fills = screen.container.querySelectorAll(".segment-fill");

    expect(fills[0]!.classList.contains("segment-fill--done")).toBe(true);
    expect(buttons[1]!.classList.contains("segment--active")).toBe(true);
    expect(buttons[0]!.classList.contains("segment--active")).toBe(false);
  });

  it("calls onSeek with the clicked segment index", async () => {
    const onSeek = vi.fn();
    const screen = await render(Navbar, {
      segments: segments(),
      visible: true,
      onSeek,
    });

    await screen.getByTitle("Go to step 3").click();

    expect(onSeek).toHaveBeenCalledWith(2);
  });

  it("calls onPrev and onNext from the nav buttons", async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const screen = await render(Navbar, {
      segments: segments(),
      visible: true,
      onPrev,
      onNext,
    });

    await screen.getByTitle("Previous step").click();
    await screen.getByTitle("Next step").click();

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("doesn't take pointer events while hidden, so hotspots underneath stay clickable", async () => {
    const hidden = await render(Navbar, { segments: segments() });
    const bar = hidden.container.querySelector(".navbar") as HTMLElement;
    expect(getComputedStyle(bar).pointerEvents).toBe("none");

    const shown = await render(Navbar, { segments: segments(), visible: true });
    const shownBar = shown.container.querySelector(
      ".navbar--visible",
    ) as HTMLElement;
    expect(getComputedStyle(shownBar).pointerEvents).toBe("auto");
  });
});
