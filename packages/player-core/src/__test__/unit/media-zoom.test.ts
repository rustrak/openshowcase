import type { PanZoom } from "@rustrak/openshowcase-schema";
import { describe, expect, it, vi } from "vitest";
import { IDENTITY_ZOOM_TRANSFORM, zoomTransform } from "../../core/geometry";
import {
  applyInheritedZoomOut,
  applyMediaZoom,
  type MediaZoomScheduler,
  type MediaZoomTarget,
} from "../../core/media-zoom";

const CINEMATIC_CSS = "cubic-bezier(0.65, 0, 0.35, 1)";
const LINEAR_CSS = "linear";

function createTarget() {
  return {
    setTransform: vi.fn<MediaZoomTarget["setTransform"]>(),
    setTransformInstant: vi.fn<MediaZoomTarget["setTransformInstant"]>(),
    setTransitionTiming: vi.fn<MediaZoomTarget["setTransitionTiming"]>(),
  } satisfies MediaZoomTarget;
}

/** Fake scheduler: captures `frame`/`delay` callbacks so the test can run them on demand,
 * instead of depending on real `requestAnimationFrame`/`setTimeout` timing. */
function createFakeScheduler(): {
  scheduler: MediaZoomScheduler;
  runFrames: () => void;
  runDelays: () => void;
} {
  let frameCb: (() => void) | undefined;
  let delayCb: (() => void) | undefined;
  return {
    scheduler: {
      frame: (cb) => {
        frameCb = cb;
      },
      delay: (cb) => {
        delayCb = cb;
      },
    },
    runFrames: () => {
      frameCb?.();
      frameCb = undefined;
    },
    runDelays: () => {
      delayCb?.();
      delayCb = undefined;
    },
  };
}

describe("applyMediaZoom", () => {
  it("resolves the cinematic default timing when panZoom omits duration/easing", () => {
    const target = createTarget();
    const { scheduler, runDelays } = createFakeScheduler();
    const panZoom: PanZoom = { x: 0.5, y: 0.5, scale: 2 };

    applyMediaZoom(target, panZoom, false, () => true, scheduler);
    runDelays();

    expect(target.setTransitionTiming).toHaveBeenCalledWith(
      1000,
      CINEMATIC_CSS,
    );
    expect(target.setTransform).toHaveBeenCalledWith(zoomTransform(panZoom));
  });

  it("resolves a custom duration/easing override", () => {
    const target = createTarget();
    const { scheduler, runDelays } = createFakeScheduler();
    const panZoom: PanZoom = {
      x: 0.5,
      y: 0.5,
      scale: 2,
      duration: 300,
      easing: "linear",
    };

    applyMediaZoom(target, panZoom, false, () => true, scheduler);
    runDelays();

    expect(target.setTransitionTiming).toHaveBeenCalledWith(300, LINEAR_CSS);
    expect(target.setTransform).toHaveBeenCalledWith(zoomTransform(panZoom));
  });

  it("uses the default timing (not the previous step's custom timing) when resetting to identity", () => {
    const target = createTarget();
    const { scheduler } = createFakeScheduler();

    applyMediaZoom(target, undefined, false, () => true, scheduler);

    expect(target.setTransitionTiming).toHaveBeenCalledWith(
      1000,
      CINEMATIC_CSS,
    );
    expect(target.setTransform).toHaveBeenCalledWith(IDENTITY_ZOOM_TRANSFORM);
  });

  it("does not apply the zoom transform (or its timing) once the step is no longer current", () => {
    const target = createTarget();
    const { scheduler, runDelays } = createFakeScheduler();
    const panZoom: PanZoom = { x: 0.5, y: 0.5, scale: 2 };

    applyMediaZoom(target, panZoom, false, () => false, scheduler);
    runDelays();

    expect(target.setTransform).not.toHaveBeenCalled();
  });

  it("still plays the instant identity entry animation when the media was previously hidden", () => {
    const target = createTarget();
    const { scheduler, runFrames } = createFakeScheduler();
    const panZoom: PanZoom = { x: 0.5, y: 0.5, scale: 2 };

    applyMediaZoom(target, panZoom, true, () => true, scheduler);

    expect(target.setTransformInstant).toHaveBeenCalledWith(true);
    expect(target.setTransform).toHaveBeenCalledWith(IDENTITY_ZOOM_TRANSFORM);

    runFrames();
    expect(target.setTransformInstant).toHaveBeenCalledWith(false);
  });
});

describe("applyInheritedZoomOut", () => {
  it("starts instantly at the given zoom (no re-entry flash) and eases back to identity using its own timing", () => {
    const target = createTarget();
    const { scheduler, runFrames } = createFakeScheduler();
    const panZoom: PanZoom = {
      x: 0.5,
      y: 0.5,
      scale: 2,
      duration: 700,
      easing: "smooth",
    };

    applyInheritedZoomOut(target, panZoom, () => true, scheduler);

    expect(target.setTransformInstant).toHaveBeenCalledWith(true);
    expect(target.setTransform).toHaveBeenCalledWith(zoomTransform(panZoom));
    expect(target.setTransitionTiming).not.toHaveBeenCalled();

    runFrames();

    expect(target.setTransformInstant).toHaveBeenCalledWith(false);
    expect(target.setTransitionTiming).toHaveBeenCalledWith(700, "ease-in-out");
    expect(target.setTransform).toHaveBeenLastCalledWith(
      IDENTITY_ZOOM_TRANSFORM,
    );
  });

  it("does not ease out once the step is no longer current", () => {
    const target = createTarget();
    const { scheduler, runFrames } = createFakeScheduler();
    const panZoom: PanZoom = { x: 0.5, y: 0.5, scale: 2 };

    applyInheritedZoomOut(target, panZoom, () => false, scheduler);
    runFrames();

    expect(target.setTransform).toHaveBeenCalledTimes(1); // only the instant starting frame
    expect(target.setTransitionTiming).not.toHaveBeenCalled();
  });
});
