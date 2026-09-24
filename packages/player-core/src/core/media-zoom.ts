import {
  defaultPanZoomTiming,
  type PanZoom,
  type PanZoomEasing,
} from "@rustrak/openshowcase-schema";
import { IDENTITY_ZOOM_TRANSFORM, zoomTransform } from "./geometry";

export interface MediaZoomTarget {
  setTransform: (transform: string) => void;
  setTransformInstant: (instant: boolean) => void;
  /** Sets the CSS transition duration/timing-function used for the NEXT `setTransform` call. */
  setTransitionTiming: (ms: number, easing: string) => void;
}

/** Named easing preset -> CSS `transition-timing-function`, kept local to this file so the
 * schema/extension never need to know (or store) a raw `cubic-bezier(...)` string. */
const EASING_CSS: Record<PanZoomEasing, string> = {
  smooth: "ease-in-out",
  cinematic: "cubic-bezier(0.65, 0, 0.35, 1)",
  fast: "ease-out",
  linear: "linear",
};

/** Resolves a `panZoom`'s duration/easing (falling back to `defaultPanZoomTiming`) to the
 * CSS values `MediaZoomTarget.setTransitionTiming` expects. Exported so callers can also
 * compute "how long until this zoom settles" (e.g. to delay revealing a hotspot). */
export function resolveTiming(
  panZoom: Pick<PanZoom, "duration" | "easing"> | undefined,
): { ms: number; css: string } {
  const ms = panZoom?.duration ?? defaultPanZoomTiming.duration;
  const easing = panZoom?.easing ?? defaultPanZoomTiming.easing;
  return { ms, css: EASING_CSS[easing] };
}

export interface MediaZoomScheduler {
  /** Runs once the browser has painted the current frame. */
  frame: (callback: () => void) => void;
  /** Runs after `ms` milliseconds. */
  delay: (callback: () => void, ms: number) => void;
}

const defaultScheduler: MediaZoomScheduler = {
  frame: (callback) => requestAnimationFrame(callback),
  delay: (callback, ms) => void setTimeout(callback, ms),
};

export const ZOOM_ANIMATION_DELAY_MS = 180;

/**
 * Applies pan&zoom with an ENTRY animation: if the media had just been revealed, it starts
 * at scale 1 with no transition and animates to the zoom after a beat. `transform-origin`
 * is never touched (stays at 50%/50%): the "where to" of the zoom always lives inside
 * `transform` (see `zoomTransform`), so coming from ANOTHER zoom (or another center) is a
 * continuous transition, never a jump.
 */
export function applyMediaZoom(
  target: MediaZoomTarget,
  panZoom: PanZoom | undefined,
  wasHidden: boolean,
  isStillCurrent: () => boolean,
  scheduler: MediaZoomScheduler = defaultScheduler,
): void {
  if (!panZoom) {
    const { ms, css } = resolveTiming(undefined);
    target.setTransitionTiming(ms, css);
    target.setTransform(IDENTITY_ZOOM_TRANSFORM);
    return;
  }
  if (wasHidden) {
    target.setTransformInstant(true);
    target.setTransform(IDENTITY_ZOOM_TRANSFORM);
    // let the browser paint the instant/identity frame before animating away from it
    scheduler.frame(() => target.setTransformInstant(false));
  }
  scheduler.delay(() => {
    if (isStillCurrent()) {
      const { ms, css } = resolveTiming(panZoom);
      target.setTransitionTiming(ms, css);
      target.setTransform(zoomTransform(panZoom));
    }
  }, ZOOM_ANIMATION_DELAY_MS);
}

/**
 * For a video step with no zoom of its own, immediately following a photo step that WAS
 * zoomed in: starts the video already at that same framing (no re-entry flash, no delay
 * before the video appears) and eases it back to identity right away, using the outgoing
 * photo's own duration/easing — the zoom-out plays out on the video instead of vanishing
 * with the (now-hidden) photo.
 */
export function applyInheritedZoomOut(
  target: MediaZoomTarget,
  panZoomToLeave: PanZoom,
  isStillCurrent: () => boolean,
  scheduler: MediaZoomScheduler = defaultScheduler,
): void {
  target.setTransformInstant(true);
  target.setTransform(zoomTransform(panZoomToLeave));
  scheduler.frame(() => {
    if (!isStillCurrent()) return;
    target.setTransformInstant(false);
    const { ms, css } = resolveTiming(panZoomToLeave);
    target.setTransitionTiming(ms, css);
    target.setTransform(IDENTITY_ZOOM_TRANSFORM);
  });
}
