import {
  type Backdrop,
  type Demo,
  defaultBackdrop,
  type PhotoStep,
  type Step,
  type ThemeAppearance,
  type ThemeWrapper,
  type VideoStep,
} from "@rustrak/openshowcase-schema";
import { loadVideoSrc, resolveAssetUrl } from "../../core/asset-loader";
import {
  computeAnchorPoint,
  computeContainBox,
  IDENTITY_ZOOM_TRANSFORM,
} from "../../core/geometry";
import type { AssetResolver } from "../../core/load-demo";
import {
  applyInheritedZoom,
  applyMediaZoom,
  type MediaZoomTarget,
  resolveTiming,
  ZOOM_ANIMATION_DELAY_MS,
} from "../../core/media-zoom";
import {
  type HotspotStyle,
  type PhotoHotspotVisual,
  PhotoOverlayController,
  type PhotoTooltipVisual,
  upcomingHotspot,
} from "../../core/photo-overlay";
import { StepMachine } from "../../core/step-machine";
import {
  isContiguousPlayback,
  startVideoStep,
  type VideoStepHandle,
  whenAtTime,
} from "../../core/video-step";
import { batch, cx, h, show } from "../../dom/h";
import { effect, signal } from "../../dom/signals";
import { injectStyles } from "../../dom/styles";
import { BrowserChrome } from "../BrowserChrome/BrowserChrome";
import { Navbar, type NavbarSegment } from "../Navbar/Navbar";
import { PhotoLayer } from "../PhotoLayer/PhotoLayer";
import { VideoLayer } from "../VideoLayer/VideoLayer";
import { css } from "./Player.styles";
// Tailwind's compiled output for the whole component tree, shipped as `dist/app.css` and
// bundled by the host app (the only side-effect import in the package: see `sideEffects`).
import "../../app.css";

/** The demo's own appearance, or `"auto"`: follow the viewer's `prefers-color-scheme`, live. */
export type PlayerAppearance = ThemeAppearance | "auto";

export interface PlayerViewOptions {
  demo: Demo;
  /** Prefix prepended to relative asset src (image/video), e.g. the bundle's base URL. */
  assetBaseUrl?: string;
  /** Serves asset URLs instead of `assetBaseUrl`, e.g. from a single-file bundle. */
  resolveAsset?: AssetResolver;
  /** Overrides every step's hotspot/tooltip colors, whatever they were recorded with. */
  hotspotStyle?: HotspotStyle;
  /** Overrides the demo's light/dark appearance, e.g. to follow the host page's mode. */
  appearance?: PlayerAppearance;
  /** Overrides the demo's wrapper. */
  wrapper?: ThemeWrapper;
  /** Overrides the demo's backdrop; `null` removes it. */
  backdrop?: Backdrop | null;
  /** Shows the first step but holds its playback (clip, zoom, hotspot) until the player
   * is at least half on screen, e.g. for a demo below the fold. */
  startWhenVisible?: boolean;
  onStepChange?: (index: number, step: Step) => void;
}

/** How much of the player must be on screen for `startWhenVisible` to start it. */
// ponytail: a player over twice the viewport's height never gets there; measure the visible
// height against the viewport instead if such embeds show up.
const VISIBLE_RATIO = 0.5;

export interface PlayerView {
  element: HTMLDivElement;
  /** Renders the first step and starts watching the size. Call once `element` is in the page. */
  start(): void;
  /** Stops playback, timers and observers. */
  stop(): void;
  next(): void;
  prev(): void;
  goTo(index: number): void;
  /** Live: no remount, the current step keeps playing. `undefined` goes back to the demo's. */
  setAppearance(appearance: PlayerAppearance | undefined): void;
  /** Live: no remount. `undefined` goes back to the demo's. */
  setWrapper(wrapper: ThemeWrapper | undefined): void;
  /** Live: no remount. `undefined` goes back to the demo's, `null` removes it. */
  setBackdrop(backdrop: Backdrop | null | undefined): void;
  /** Live: the hotspot/tooltip on screen recolors at once. */
  setHotspotStyle(style: HotspotStyle | undefined): void;
  currentIndex(): number;
  currentStep(): Step | undefined;
}

function isPhotoStep(step: Step): step is PhotoStep {
  return step.type === "photo";
}
function isVideoStep(step: Step): step is VideoStep {
  return step.type === "video";
}

/** A signal per field, so each layer only re-renders what changed. */
function layerState(extra: object = {}) {
  return {
    visible: signal(false),
    transform: signal(IDENTITY_ZOOM_TRANSFORM),
    transformInstant: signal(false),
    // Mirrors PhotoLayer/VideoLayer's own defaults — applyMediaZoom overwrites these as soon
    // as the first step renders, this is only the value used for the brief instant before
    // that (while the layer is still hidden).
    transitionMs: signal(1000),
    transitionEasing: signal("cubic-bezier(0.65, 0, 0.35, 1)"),
    ...extra,
  };
}

function zoomTarget(layer: ReturnType<typeof layerState>): MediaZoomTarget {
  return {
    setTransform: (transform) => layer.transform(transform),
    setTransformInstant: (instant) => layer.transformInstant(instant),
    setTransitionTiming: (ms, easing) => {
      layer.transitionMs(ms);
      layer.transitionEasing(easing);
    },
  };
}

export function createPlayerView({
  demo,
  assetBaseUrl,
  resolveAsset = (src) => resolveAssetUrl(src, assetBaseUrl),
  hotspotStyle,
  appearance: appearanceOverride,
  wrapper: wrapperOverride,
  backdrop: backdropOverride,
  startWhenVisible = false,
  onStepChange,
}: PlayerViewOptions): PlayerView {
  injectStyles(document, "player", css);

  const firstPhoto = demo.steps.find(isPhotoStep);
  const naturalWidth = demo.video?.width ?? firstPhoto?.image.width ?? 0;
  const naturalHeight = demo.video?.height ?? firstPhoto?.image.height ?? 0;

  let index = 0;
  // startWhenVisible: what moves waits here until the player is on screen (see start())
  let onScreen = !startWhenVisible;
  const heldUntilOnScreen: (() => void)[] = [];
  const whenOnScreen = (fn: () => void) => {
    if (onScreen) fn();
    else heldUntilOnScreen.push(fn);
  };
  let visibility: IntersectionObserver | undefined;
  const appearance = signal(appearanceOverride);
  // Only read when the appearance is "auto"; the listener lives from start() to stop()
  const darkQuery = matchMedia("(prefers-color-scheme: dark)");
  const systemDark = signal(darkQuery.matches);
  const onSchemeChange = (event: MediaQueryListEvent) =>
    systemDark(event.matches);
  const isDark = () => {
    const value = appearance() ?? demo.theme.appearance;
    return value === "auto" ? systemDark() : value === "dark";
  };
  const wrapper = signal(wrapperOverride);
  const currentWrapper = () => wrapper() ?? demo.theme.wrapper;
  const backdrop = signal(backdropOverride);
  const currentBackdrop = () => {
    const value = backdrop();
    return value === undefined ? demo.theme.backdrop : value;
  };
  const stageSize = signal({ width: 0, height: 0 });

  const photo = {
    ...layerState(),
    src: signal(""),
    /** Bumped per photo step render: PhotoLayer re-reports ready even when `src` is unchanged. */
    renderId: signal(0),
    alt: signal(""),
    hotspot: signal<PhotoHotspotVisual | undefined>(undefined),
    tooltip: signal<PhotoTooltipVisual | undefined>(undefined),
  };
  const video = layerState();

  const segments = signal<NavbarSegment[]>(
    demo.steps.map(() => ({ progress: 0, active: false, done: false })),
  );

  let videoObjectUrl: string | undefined;
  let videoWatchHandle: VideoStepHandle | undefined;
  const clip = signal<{ elapsed: number; total: number } | undefined>(
    undefined,
  );
  const paused = signal(false);
  const accent = signal<string | undefined>(undefined);
  let currentStepRef: Step | undefined;
  let previousStepRef: Step | undefined;

  const overlay = new PhotoOverlayController(
    {
      setHotspot: (hotspot) => photo.hotspot(hotspot),
      setTooltip: (tooltip) =>
        photo.tooltip(
          tooltip && {
            ...tooltip,
            step: { current: index + 1, total: demo.steps.length },
          },
        ),
      showTooltip: () => {
        const tooltip = photo.tooltip();
        if (tooltip) photo.tooltip({ ...tooltip, visible: true });
      },
      hideTooltip: () => {
        const tooltip = photo.tooltip();
        if (tooltip) photo.tooltip({ ...tooltip, visible: false });
      },
    },
    hotspotStyle,
  );

  const stepMachine = new StepMachine(demo.steps.length, demo.theme.autoplay, {
    onChange: (newIndex) => renderStep(newIndex, index),
    onFinish: () => finish(),
  });
  const next = () => stepMachine.next();
  const prev = () => stepMachine.prev();
  const goTo = (i: number) => stepMachine.goTo(i);

  const videoEl = VideoLayer({
    visible: () => video.visible(),
    transform: () => video.transform(),
    transformInstant: () => video.transformInstant(),
    transitionMs: () => video.transitionMs(),
    transitionEasing: () => video.transitionEasing(),
    onended: () => next(),
  });

  async function loadVideoAsset(src: string): Promise<void> {
    const resolved = await loadVideoSrc(await resolveAsset(src));
    videoObjectUrl = resolved.objectUrl;
    videoEl.src = resolved.src;
  }

  // A video that fails to load leaves its steps blank rather than breaking the photo steps
  const videoReady: Promise<void> = demo.video
    ? loadVideoAsset(demo.video.src).catch(() => {})
    : Promise.resolve();

  /** On the last step, advancing means dismissing the overlays and settling on a clean view. */
  function finish(): void {
    batch(() => {
      overlay.reset();
      clip(undefined);
      paused(false);
      segments(
        segments().map(() => ({ active: false, done: true, progress: 1 })),
      );
    });
  }

  function togglePlay(): void {
    if (!videoWatchHandle) return;
    if (paused()) videoWatchHandle.resume();
    else videoWatchHandle.pause();
    paused(!paused());
  }

  function updateAccent(): void {
    accent(overlay.colors(upcomingHotspot(demo.steps, index)).bgColor);
  }

  function handleAdvanceGesture(): void {
    const step = currentStepRef;
    if (step && isPhotoStep(step) && !step.hotspot) next();
  }

  function renderStep(newIndex: number, previousIndex: number): void {
    const step = demo.steps[newIndex];
    if (!step) return;
    batch(() => {
      index = newIndex;
      previousStepRef = demo.steps[previousIndex];
      currentStepRef = step;
      videoWatchHandle?.cancel();
      videoWatchHandle = undefined;
      paused(false);
      clip(
        isVideoStep(step)
          ? {
              elapsed: 0,
              total: (step.endTime - step.startTime) / (step.playbackRate ?? 1),
            }
          : undefined,
      );
      updateAccent();

      segments(
        segments().map((_, i) => ({
          active: i === newIndex,
          done: i < newIndex,
          // a photo step has no duration: its segment is complete on arrival; a video
          // step's fills as the clip plays (onProgress below)
          progress:
            i === newIndex ? (isVideoStep(step) ? 0 : 1) : i < newIndex ? 1 : 0,
        })),
      );

      if (isVideoStep(step)) {
        renderVideoStep(step, previousIndex);
      } else {
        renderPhotoStep(step, previousIndex);
      }
    });

    onStepChange?.(newIndex, step);
  }

  function renderVideoStep(step: VideoStep, previousIndex: number): void {
    const previousStep = demo.steps[previousIndex];
    // A video step right after a zoomed photo: rather than restarting from full frame (the
    // photo is hidden the instant this render happens), the video inherits that same framing
    // and moves on from it itself — into its own zoom, or back out to identity if it has none.
    const inheritedZoom =
      previousStep && isPhotoStep(previousStep)
        ? previousStep.panZoom
        : undefined;

    const videoWasHidden = !video.visible();
    // The layers swap only once the video shows this clip's first frame (see whenAtTime
    // below): until then the photo — which IS that frame — stays up, so the cut is invisible.
    const showVideoLayer = () =>
      batch(() => {
        photo.visible(false);
        video.visible(true);
      });
    overlay.reset();
    photo.transform(IDENTITY_ZOOM_TRANSFORM);

    if (inheritedZoom) {
      applyInheritedZoom(
        zoomTarget(video),
        inheritedZoom,
        step.panZoom,
        () => currentStepRef === step,
      );
    } else {
      applyMediaZoom(
        zoomTarget(video),
        step.panZoom,
        videoWasHidden,
        () => currentStepRef === step,
      );
    }

    videoReady.then(async () => {
      if (currentStepRef !== step) return;
      const wasContiguous = isContiguousPlayback(
        previousIndex,
        index,
        videoEl.currentTime,
        step.startTime,
      );
      if (!wasContiguous) {
        await whenAtTime(videoEl, step.startTime);
        if (currentStepRef !== step) return;
      }
      showVideoLayer();
      whenOnScreen(() => {
        if (currentStepRef !== step) return;
        videoWatchHandle = startVideoStep(
          videoEl,
          step,
          // already positioned on the first frame (contiguous, or by whenAtTime above)
          true,
          {
            onProgress: (progress) => {
              batch(() => {
                segments(
                  segments().map((segment, i) =>
                    i === index ? { ...segment, progress } : segment,
                  ),
                );
                const current = clip();
                if (current)
                  clip({ ...current, elapsed: progress * current.total });
              });
            },
            onZoomOut: () => {
              video.transform(IDENTITY_ZOOM_TRANSFORM);
            },
            onEnded: () => {
              videoWatchHandle = undefined;
              next();
            },
          },
          demo.steps[index + 1],
        );
      });
    });
  }

  function renderPhotoStep(step: PhotoStep, previousIndex: number): void {
    videoEl.pause();
    const previousStep = demo.steps[previousIndex];
    // A hotspot "traveling" from its last position only makes visual sense when the two
    // photos share the same framing. If either side of this transition has a panZoom, the
    // on-screen geometry isn't comparable anymore — clear the old marker now (instead of
    // leaving it frozen in its now-stale spot for the whole zoom) so the new one pops in
    // fresh once it settles.
    if (step.panZoom || previousStep?.panZoom) {
      overlay.reset();
    } else {
      overlay.hide();
    }
    const show = (src: string) =>
      batch(() => {
        photo.src(src);
        photo.renderId(photo.renderId() + 1);
        photo.alt(step.hotspot?.label ?? `Step ${index + 1}`);
      });
    // the actual reveal happens in handlePhotoReady, once PhotoLayer's decode resolves
    const src = resolveAsset(step.image.src);
    if (typeof src === "string") show(src);
    // Still downloading (a bundle): the previous view stays up until it arrives
    else
      src.then(
        (url) => currentStepRef === step && show(url),
        () => {},
      );
  }

  /**
   * The video (or previous photo) stays visible until the new image is DECODED — otherwise
   * the swap would show a stale frame and look like a jump.
   */
  function handlePhotoReady(): void {
    const step = currentStepRef;
    if (!step || !isPhotoStep(step)) return;
    batch(() => {
      const wasHidden = !photo.visible();
      // Captured BEFORE applyMediaZoom below changes it: true when the photo layer was
      // already showing a zoomed-in frame and this step has no zoom of its own — i.e. it's
      // about to ease back out to identity, not just cut straight to it.
      const isZoomingOut =
        !wasHidden &&
        !step.panZoom &&
        photo.transform() !== IDENTITY_ZOOM_TRANSFORM;
      video.visible(false);
      video.transform(IDENTITY_ZOOM_TRANSFORM);
      photo.visible(true);
      whenOnScreen(() => {
        if (currentStepRef === step)
          batch(() => playPhotoStep(step, wasHidden, isZoomingOut));
      });
    });
  }

  /** A shown photo's motion: its zoom, then its hotspot and tooltip once the zoom settles. */
  function playPhotoStep(
    step: PhotoStep,
    wasHidden: boolean,
    isZoomingOut: boolean,
  ): void {
    const previousStep = previousStepRef;
    // A zoomed photo right after a zoomed clip: the clip kept its zoom to the end (see
    // handsZoomTo), so the photo picks up that framing and moves on to its own zoom from
    // there instead of restarting from full frame.
    if (
      wasHidden &&
      step.panZoom &&
      previousStep &&
      isVideoStep(previousStep) &&
      previousStep.panZoom
    ) {
      applyInheritedZoom(
        zoomTarget(photo),
        previousStep.panZoom,
        step.panZoom,
        () => currentStepRef === step,
      );
    } else {
      applyMediaZoom(
        zoomTarget(photo),
        step.panZoom,
        wasHidden,
        () => currentStepRef === step,
      );
    }

    const anchor = step.hotspot ? computeAnchor(step, step.hotspot) : undefined;
    // The hotspot/tooltip are positioned at their POST-zoom coordinates (see
    // computeAnchorPoint) but aren't part of the image's own transform, so they can't
    // visually "ride along" with a pan-zoom in progress — revealing them only once the zoom
    // has settled avoids the mismatch.
    const revealDelayMs = step.panZoom
      ? ZOOM_ANIMATION_DELAY_MS + resolveTiming(step.panZoom).ms
      : isZoomingOut
        ? resolveTiming(undefined).ms
        : 0;
    setTimeout(() => {
      if (currentStepRef !== step) return;
      overlay.reveal(step.hotspot, anchor, () => currentStepRef === step);
    }, revealDelayMs);
  }

  function computeAnchor(
    step: PhotoStep,
    hotspot: NonNullable<PhotoStep["hotspot"]>,
  ): { left: number; top: number } {
    const box = computeContainBox(
      stage.clientWidth,
      stage.clientHeight,
      naturalWidth,
      naturalHeight,
    );
    return computeAnchorPoint(
      hotspot,
      box,
      naturalWidth,
      naturalHeight,
      step.panZoom,
    );
  }

  function layoutOverlay(): void {
    stageSize({ width: stage.clientWidth, height: stage.clientHeight });
    const step = currentStepRef;
    const hotspot = photo.hotspot();
    if (!step || !isPhotoStep(step) || !step.hotspot || !hotspot) return;
    const anchor = computeAnchor(step, step.hotspot);
    overlay.reposition(hotspot, photo.tooltip(), anchor);
  }

  // Navbar visibility: up while the pointer is near the bottom of the stage, where it shows.
  // Elsewhere it stays out of the demo's way, unless paused: the play button must stay findable.
  // No hover on touch: a tap anywhere shows it for a moment.
  const NAV_ZONE_RATIO = 0.2;
  const NAV_TOUCH_MS = 2200;
  const pointerNearNav = signal(false);
  const touchedNav = signal(false);
  let navTimer: ReturnType<typeof setTimeout> | undefined;
  function trackPointer(event: PointerEvent): void {
    if (event.pointerType === "touch") return;
    const { bottom, height } = stage.getBoundingClientRect();
    pointerNearNav(event.clientY >= bottom - height * NAV_ZONE_RATIO);
  }
  function showNavOnTouch(event: PointerEvent): void {
    if (event.pointerType !== "touch") {
      trackPointer(event);
      return;
    }
    touchedNav(true);
    clearTimeout(navTimer);
    navTimer = setTimeout(() => touchedNav(false), NAV_TOUCH_MS);
  }

  const stage = h(
    "div",
    {
      class:
        "stage relative flex-none overflow-hidden bg-[#fafafa] dark:bg-[#0f0f10]",
      style: `aspect-ratio: ${naturalWidth} / ${naturalHeight};`,
      onclick: (event: MouseEvent) => {
        if (event.target === stage) handleAdvanceGesture();
      },
      role: "presentation",
    },
    videoEl,
    PhotoLayer({
      visible: () => photo.visible(),
      src: () => photo.src(),
      renderId: () => photo.renderId(),
      alt: () => photo.alt(),
      transform: () => photo.transform(),
      transformInstant: () => photo.transformInstant(),
      transitionMs: () => photo.transitionMs(),
      transitionEasing: () => photo.transitionEasing(),
      stageSize: () => stageSize(),
      hotspot: () => photo.hotspot(),
      tooltip: () => photo.tooltip(),
      onReady: handlePhotoReady,
      onHotspotAdvance: next,
    }),
    Navbar({
      segments: () => segments(),
      accent: () => accent(),
      clip: () => clip(),
      paused: () => paused(),
      visible: () => pointerNearNav() || touchedNav() || paused(),
      onTogglePlay: togglePlay,
      onSeek: goTo,
    }),
  );

  const backdropEl = h(
    "div",
    {
      class: () => {
        const value = currentBackdrop();
        const fill = value?.fill ?? defaultBackdrop.fill;
        return cx(
          "frame-backdrop",
          value && "frame-backdrop--on",
          value && fill !== "solid" && `frame-backdrop--${fill}`,
        );
      },
    },
    h(
      "div",
      {
        class: () => {
          const value = currentWrapper();
          return cx(
            "frame relative w-full",
            value !== "none" && `frame--${value}`,
          );
        },
      },
      h(
        "div",
        {
          class:
            "frame-window flex w-full flex-col overflow-hidden bg-white dark:bg-[#18181b]",
        },
        show(
          () => currentWrapper() !== "none",
          () =>
            BrowserChrome({ title: () => demo.title, onReload: () => goTo(0) }),
        ),
        stage,
      ),
    ),
  );
  // Custom properties, not a style attribute: a demo's color can't add declarations
  effect(() => {
    const value = currentBackdrop();
    const { style } = backdropEl;
    if (value) {
      style.setProperty("--wd-backdrop", value.color);
      style.setProperty(
        "--wd-backdrop-padding",
        String(value.padding ?? defaultBackdrop.padding),
      );
    } else {
      style.removeProperty("--wd-backdrop");
      style.removeProperty("--wd-backdrop-padding");
    }
  });

  // root needs focus + arrow-key nav, like native <video> controls
  // No overflow clipping here: it would cut the frame's shadow
  const element = h(
    "div",
    {
      class: () =>
        cx(
          "openshowcase-player relative block leading-[1.45] select-none",
          isDark() && "openshowcase-player--dark",
        ),
      role: "application",
      tabindex: "0",
      onkeydown: (event: KeyboardEvent) => {
        if (event.key === "ArrowRight") next();
        if (event.key === "ArrowLeft") prev();
      },
      onpointermove: trackPointer,
      onpointerdown: showNavOnTouch,
      onpointerleave: () => pointerNearNav(false),
    },
    backdropEl,
  );

  let resizeObserver: ResizeObserver | undefined;

  return {
    element,
    start() {
      layoutOverlay();
      renderStep(0, -1);
      resizeObserver = new ResizeObserver(() => layoutOverlay());
      // The stage, not the root: a backdrop or bezel resizes it at the same player width
      resizeObserver.observe(stage);
      darkQuery.addEventListener("change", onSchemeChange);
      if (!onScreen) {
        visibility = new IntersectionObserver(
          (entries) => {
            if (!entries.some((e) => e.intersectionRatio >= VISIBLE_RATIO))
              return;
            onScreen = true;
            visibility?.disconnect();
            for (const fn of heldUntilOnScreen.splice(0)) fn();
          },
          { threshold: VISIBLE_RATIO },
        );
        visibility.observe(element);
      }
    },
    stop() {
      videoEl.pause();
      videoWatchHandle?.cancel();
      overlay.dispose();
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
      resizeObserver?.disconnect();
      visibility?.disconnect();
      darkQuery.removeEventListener("change", onSchemeChange);
      clearTimeout(navTimer);
    },
    next,
    prev,
    goTo,
    setAppearance(value) {
      appearance(value);
    },
    setWrapper(value) {
      wrapper(value);
    },
    setBackdrop(value) {
      backdrop(value);
    },
    setHotspotStyle(style) {
      overlay.setStyle(style);
      updateAccent();
      const step = currentStepRef;
      if (!step || !isPhotoStep(step) || !step.hotspot) return;
      const { bgColor, textColor } = overlay.colors(step.hotspot);
      batch(() => {
        const hotspot = photo.hotspot();
        if (hotspot) photo.hotspot({ ...hotspot, color: bgColor });
        const tooltip = photo.tooltip();
        if (tooltip) photo.tooltip({ ...tooltip, bgColor, textColor });
      });
    },
    currentIndex: () => index,
    currentStep: () => demo.steps[index],
  };
}
