import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type PhotoHotspotVisual,
  PhotoOverlayController,
  type PhotoTooltipVisual,
} from "../../core/photo-overlay";

// Node has no requestAnimationFrame — stub it as an immediate microtask-ish callback so the
// "travels" branch (which schedules the animated target position on the next frame) is
// deterministic under fake timers.
function stubAnimationFrame() {
  vi.stubGlobal(
    "requestAnimationFrame",
    (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0) as unknown as number,
  );
}

function createController() {
  const hotspot = { current: undefined as PhotoHotspotVisual | undefined };
  const tooltip = { current: undefined as PhotoTooltipVisual | undefined };
  const controller = new PhotoOverlayController({
    setHotspot: (h) => (hotspot.current = h),
    setTooltip: (t) => (tooltip.current = t),
    showTooltip: () => {
      if (tooltip.current) tooltip.current.visible = true;
    },
    hideTooltip: () => {
      if (tooltip.current) tooltip.current.visible = false;
    },
  });
  return { controller, hotspot, tooltip };
}

describe("PhotoOverlayController", () => {
  beforeEach(() => {
    stubAnimationFrame();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does nothing when the step has no hotspot", () => {
    const { controller, hotspot, tooltip } = createController();
    controller.reveal(undefined, undefined, () => true);
    expect(hotspot.current).toBeUndefined();
    expect(tooltip.current).toBeUndefined();
  });

  it("pops the hotspot in instantly on first reveal (no previous anchor)", () => {
    const { controller, hotspot } = createController();
    controller.reveal(
      { x: 0.5, y: 0.5, bgColor: "#111" },
      { left: 10, top: 20 },
      () => true,
    );

    expect(hotspot.current).toEqual({
      left: 10,
      top: 20,
      color: "#111",
      instant: true,
      appear: true,
    });
  });

  it("makes the hotspot travel from the last anchor when it moved more than 2px", () => {
    const { controller, hotspot } = createController();
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111" },
      { left: 10, top: 20 },
      () => true,
    );

    controller.reveal(
      { x: 0, y: 0, bgColor: "#111" },
      { left: 100, top: 120 },
      () => true,
    );
    expect(hotspot.current).toEqual({
      left: 10,
      top: 20,
      color: "#111",
      instant: true,
      appear: false,
    });

    vi.runAllTimers(); // flushes the stubbed requestAnimationFrame
    expect(hotspot.current).toEqual({
      left: 100,
      top: 120,
      color: "#111",
      instant: false,
      appear: false,
    });
  });

  it("does not travel for a sub-2px move — treats it as the same spot", () => {
    const { controller, hotspot } = createController();
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111" },
      { left: 10, top: 20 },
      () => true,
    );
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111" },
      { left: 11, top: 21 },
      () => true,
    );

    expect(hotspot.current).toEqual({
      left: 11,
      top: 21,
      color: "#111",
      instant: true,
      appear: false,
    });
  });

  it("skips the deferred hotspot update if the step changed before the frame fires", () => {
    const { controller, hotspot } = createController();
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111" },
      { left: 10, top: 20 },
      () => true,
    );
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111" },
      { left: 100, top: 120 },
      () => false,
    );

    vi.runAllTimers();
    // still at the "from" position — the deferred travel update never applied
    expect(hotspot.current).toEqual({
      left: 10,
      top: 20,
      color: "#111",
      instant: true,
      appear: false,
    });
  });

  it("shows the tooltip after 220ms when the hotspot pops in, 660ms when it travels", () => {
    const { controller, tooltip } = createController();
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111", label: "Hi" },
      { left: 0, top: 0 },
      () => true,
    );

    vi.advanceTimersByTime(219);
    expect(tooltip.current?.visible).toBe(false);
    vi.advanceTimersByTime(1);
    expect(tooltip.current?.visible).toBe(true);

    controller.reveal(
      { x: 0, y: 0, bgColor: "#111", label: "Hi again" },
      { left: 500, top: 500 },
      () => true,
    );
    vi.advanceTimersByTime(659);
    expect(tooltip.current?.visible).toBe(false);
    vi.advanceTimersByTime(1);
    expect(tooltip.current?.visible).toBe(true);
  });

  it("clears any previous tooltip when the new hotspot has no label", () => {
    const { controller, tooltip } = createController();
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111", label: "Hi" },
      { left: 0, top: 0 },
      () => true,
    );
    vi.runAllTimers();
    expect(tooltip.current).toBeDefined();

    controller.reveal(
      { x: 0, y: 0, bgColor: "#111" },
      { left: 5, top: 5 },
      () => true,
    );
    expect(tooltip.current).toBeUndefined();
  });

  it("reposition updates left/top instantly without touching color/appear, and keeps the tooltip anchor in sync", () => {
    const { controller, hotspot, tooltip } = createController();
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111", label: "Hi" },
      { left: 10, top: 20 },
      () => true,
    );
    vi.runAllTimers();

    controller.reposition(hotspot.current!, tooltip.current, {
      left: 50,
      top: 60,
    });

    expect(hotspot.current).toMatchObject({
      left: 50,
      top: 60,
      instant: true,
      color: "#111",
    });
    expect(tooltip.current?.anchor).toEqual({ left: 50, top: 60 });
  });

  it("reset clears the hotspot, tooltip, and the travel bookkeeping", () => {
    const { controller, hotspot, tooltip } = createController();
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111", label: "Hi" },
      { left: 10, top: 20 },
      () => true,
    );

    controller.reset();

    expect(hotspot.current).toBeUndefined();
    expect(tooltip.current).toBeUndefined();

    // bookkeeping is gone too — the next reveal treats it as a first appearance again
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111" },
      { left: 200, top: 200 },
      () => true,
    );
    expect(hotspot.current).toMatchObject({ appear: true });
  });

  it("hide only fades the tooltip out, leaving the hotspot and travel bookkeeping untouched", () => {
    const { controller, hotspot, tooltip } = createController();
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111", label: "Hi" },
      { left: 10, top: 20 },
      () => true,
    );
    vi.runAllTimers();

    controller.hide();

    expect(tooltip.current?.visible).toBe(false);
    expect(hotspot.current).toBeDefined();

    // still travels from (10, 20) — hide() did not clear lastAnchor
    controller.reveal(
      { x: 0, y: 0, bgColor: "#111" },
      { left: 200, top: 200 },
      () => true,
    );
    expect(hotspot.current).toMatchObject({ left: 10, top: 20, appear: false });
  });
});
