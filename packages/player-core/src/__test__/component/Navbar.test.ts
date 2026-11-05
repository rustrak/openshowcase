import { describe, expect, it, vi } from "vitest";
import {
  Navbar,
  type NavbarProps,
  type NavbarSegment,
} from "../../ui/Navbar/Navbar";
import { renderView } from "../render-view";

function segments(): NavbarSegment[] {
  return [
    { progress: 1, active: false, done: true },
    { progress: 0.4, active: true, done: false },
    { progress: 0, active: false, done: false },
  ];
}

const render = (props: NavbarProps) => renderView(Navbar, props);

describe("Navbar", () => {
  it("renders one segment per step with the right fill width", async () => {
    const screen = await render({ segments: segments() });

    const fills = screen.container.querySelectorAll(".segment-fill");
    expect(fills).toHaveLength(3);
    expect((fills[0] as HTMLElement).style.width).toBe("100%");
    expect((fills[1] as HTMLElement).style.width).toBe("40%");
    expect((fills[2] as HTMLElement).style.width).toBe("0%");
  });

  it("marks the done segment with the done fill class and the active one with the active class", async () => {
    const screen = await render({ segments: segments() });
    const buttons = screen.container.querySelectorAll(".segment");
    const fills = screen.container.querySelectorAll(".segment-fill");

    expect(fills[0]!.classList.contains("segment-fill--done")).toBe(true);
    expect(buttons[1]!.classList.contains("segment--active")).toBe(true);
    expect(buttons[0]!.classList.contains("segment--active")).toBe(false);
  });

  it("paints the current step with the accent color, and the passed ones white", async () => {
    const screen = await render({ segments: segments(), accent: "#ff0000" });
    const fills = screen.container.querySelectorAll(".segment-fill");

    expect(getComputedStyle(fills[1] as Element).backgroundColor).toBe(
      "rgb(255, 0, 0)",
    );
    expect(getComputedStyle(fills[0] as Element).backgroundColor).toBe(
      "rgba(255, 255, 255, 0.9)",
    );
  });

  it("shows play/pause and the time only for a clip", async () => {
    const screen = await render({ segments: segments() });
    expect(screen.container.querySelector(".clip-toggle")).toBeNull();
    expect(screen.container.querySelector(".clip-time")).toBeNull();

    await screen.rerender({
      segments: segments(),
      clip: { elapsed: 1.2, total: 2.3 },
    });
    expect(screen.container.querySelector(".clip-time")?.textContent).toBe(
      "1.2 / 2.3s",
    );
    await expect
      .element(screen.getByRole("button", { name: "Pause" }))
      .toBeInTheDocument();

    await screen.rerender({
      segments: segments(),
      clip: { elapsed: 1.2, total: 2.3 },
      paused: true,
    });
    await expect
      .element(screen.getByRole("button", { name: "Play" }))
      .toBeInTheDocument();
  });

  it("calls onTogglePlay from its button", async () => {
    const onTogglePlay = vi.fn();
    const screen = await render({
      segments: segments(),
      clip: { elapsed: 0, total: 2 },
      visible: true,
      onTogglePlay,
    });

    await screen.getByRole("button", { name: "Pause" }).click();

    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it("has no previous/next buttons", async () => {
    const screen = await render({ segments: segments() });
    expect(screen.container.querySelector('[title="Next step"]')).toBeNull();
    expect(
      screen.container.querySelector('[title="Previous step"]'),
    ).toBeNull();
  });

  it("calls onSeek with the clicked segment index", async () => {
    const onSeek = vi.fn();
    const screen = await render({
      segments: segments(),
      visible: true,
      onSeek,
    });

    await screen.getByRole("button", { name: "Go to step 3" }).click();

    expect(onSeek).toHaveBeenCalledWith(2);
  });

  it("doesn't take pointer events while hidden, so hotspots underneath stay clickable", async () => {
    const hidden = await render({ segments: segments() });
    const bar = hidden.container.querySelector(".navbar") as HTMLElement;
    expect(getComputedStyle(bar).pointerEvents).toBe("none");

    const shown = await render({ segments: segments(), visible: true });
    const shownBar = shown.container.querySelector(
      ".navbar--visible",
    ) as HTMLElement;
    expect(getComputedStyle(shownBar).pointerEvents).toBe("auto");
  });

  it("follows prop changes: progress, active step and counter update in place", async () => {
    const screen = await render({ segments: segments() });
    const fill = () =>
      screen.container.querySelectorAll<HTMLElement>(".segment-fill")[1];
    const before = fill();

    await screen.rerender({
      segments: [
        { progress: 1, active: false, done: true },
        { progress: 1, active: false, done: true },
        { progress: 0.25, active: true, done: false },
      ],
    });

    expect(fill()).toBe(before);
    expect(before?.style.width).toBe("100%");
    expect(before?.classList.contains("segment-fill--done")).toBe(true);
    expect(
      screen.container
        .querySelectorAll(".segment")[2]
        ?.classList.contains("segment--active"),
    ).toBe(true);
    expect(screen.container.querySelector(".counter")?.textContent).toBe("3/3");
  });
});
