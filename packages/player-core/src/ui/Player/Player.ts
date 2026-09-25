import type {
  Demo,
  PhotoStep,
  Step,
  VideoStep,
} from "@rustrak/openshowcase-schema";
import { loadVideoSrc, resolveAssetUrl } from "../../core/asset-loader";
import {
  computeAnchorPoint,
  computeContainBox,
  IDENTITY_ZOOM_TRANSFORM,
} from "../../core/geometry";
import {
  applyInheritedZoom,
  applyMediaZoom,
  type MediaZoomTarget,
  resolveTiming,
  ZOOM_ANIMATION_DELAY_MS,
} from "../../core/media-zoom";
import {
  type PhotoHotspotVisual,
  PhotoOverlayController,
  type PhotoTooltipVisual,
} from "../../core/photo-overlay";
import { StepMachine } from "../../core/step-machine";
import type { VideoClipWatcherHandle } from "../../core/video-clip-watcher";
import {
  isContiguousPlayback,
  startVideoStep,
  whenAtTime,
} from "../../core/video-step";
import { batch, cx, h } from "../../dom/h";
import { signal } from "../../dom/signals";
import { injectStyles } from "../../dom/styles";
import { BrowserChrome } from "../BrowserChrome/BrowserChrome";
import { Navbar, type NavbarSegment } from "../Navbar/Navbar";
import { PhotoLayer } from "../PhotoLayer/PhotoLayer";
import { VideoLayer } from "../VideoLayer/VideoLayer";
import { css } from "./Player.styles";
// Tailwind's compiled output for the whole component tree, shipped as `dist/app.css` and
// bundled by the host app (the only side-effect import in the package: see `sideEffects`).
import "../../app.css";

export interface PlayerViewOptions {
  demo: Demo;
  /** Prefix prepended to relative asset src (image/video), e.g. the bundle's base URL. */
  assetBaseUrl?: string;
  onStepChange?: (index: number, step: Step) => void;
}

export interface PlayerView {
  element: HTMLDivElement;
  /** Renders the first step and starts watching the size. Call once `element` is in the page. */
  start(): void;
  /** Stops playback, timers and observers. */
  stop(): void;
  next(): void;
  prev(): void;
  goTo(index: number): void;
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
  onStepChange,
}: PlayerViewOptions): PlayerView {
  injectStyles(document, "player", css);

  const firstPhoto = demo.steps.find(isPhotoStep);
  const naturalWidth = demo.video?.width ?? firstPhoto?.image.width ?? 0;
  const naturalHeight = demo.video?.height ?? firstPhoto?.image.height ?? 0;

  let index = 0;
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
  let videoWatchHandle: VideoClipWatcherHandle | undefined;
  let currentStepRef: Step | undefined;
  let previousStepRef: Step | undefined;

  const overlay = new PhotoOverlayController({
    setHotspot: (hotspot) => photo.hotspot(hotspot),
    setTooltip: (tooltip) => photo.tooltip(tooltip),
    showTooltip: () => {
      const tooltip = photo.tooltip();
      if (tooltip) photo.tooltip({ ...tooltip, visible: true });
    },
    hideTooltip: () => {
      const tooltip = photo.tooltip();
      if (tooltip) photo.tooltip({ ...tooltip, visible: false });
    },
  });

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
    const resolved = await loadVideoSrc(src, assetBaseUrl);
    videoObjectUrl = resolved.objectUrl;
    videoEl.src = resolved.src;
  }

  const videoReady: Promise<void> = demo.video
    ? loadVideoAsset(demo.video.src)
    : Promise.resolve();

  /** On the last step, advancing means dismissing the overlays and settling on a clean view. */
  function finish(): void {
    batch(() => {
      overlay.reset();
      segments(
        segments().map(() => ({ active: false, done: true, progress: 1 })),
      );
    });
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
      videoWatchHandle = startVideoStep(
        videoEl,
        step,
        // already positioned on the first frame (contiguous, or by whenAtTime above)
        true,
        {
          onProgress: (progress) => {
            segments(
              segments().map((segment, i) =>
                i === index ? { ...segment, progress } : segment,
              ),
            );
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
    photo.src(resolveAssetUrl(step.image.src, assetBaseUrl));
    photo.renderId(photo.renderId() + 1);
    photo.alt(step.hotspot?.label ?? `Step ${index + 1}`);
    // the actual reveal happens in handlePhotoReady, once PhotoLayer's decode resolves
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

      const anchor = step.hotspot
        ? computeAnchor(step, step.hotspot)
        : undefined;
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
    });
    preSeekNextVideoStep();
  }

  function preSeekNextVideoStep(): void {
    const nextStep = demo.steps[index + 1];
    if (!nextStep || !isVideoStep(nextStep)) return;
    videoReady.then(() => {
      if (demo.steps[index + 1] !== nextStep) return;
      videoEl.currentTime = nextStep.startTime;
    });
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

  // Navbar visibility: shown while the viewer is active over the player, hidden after a
  // short idle — like a video player's controls. Hovering the bar itself keeps it up.
  const NAV_IDLE_MS = 2200;
  const navVisible = signal(false);
  let navTimer: ReturnType<typeof setTimeout> | undefined;
  function showNav(event?: Event): void {
    navVisible(true);
    clearTimeout(navTimer);
    const overBar = (event?.target as Element | null)?.closest?.(".navbar");
    if (!overBar) navTimer = setTimeout(() => navVisible(false), NAV_IDLE_MS);
  }
  function hideNavSoon(): void {
    clearTimeout(navTimer);
    navTimer = setTimeout(() => navVisible(false), 400);
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
      visible: () => navVisible(),
      onPrev: prev,
      onNext: next,
      onSeek: goTo,
    }),
  );

  // root needs focus + arrow-key nav, like native <video> controls
  const element = h(
    "div",
    {
      class: cx(
        "openshowcase-player relative block overflow-hidden leading-[1.45] select-none",
        demo.theme.appearance === "dark" && "openshowcase-player--dark",
      ),
      role: "application",
      tabindex: "0",
      onkeydown: (event: KeyboardEvent) => {
        if (event.key === "ArrowRight") next();
        if (event.key === "ArrowLeft") prev();
      },
      onpointermove: showNav,
      onpointerdown: showNav,
      onpointerleave: hideNavSoon,
    },
    h(
      "div",
      {
        class: cx(
          "frame relative flex w-full flex-col overflow-hidden bg-white dark:bg-[#18181b]",
          demo.theme.wrapper === "browser" && "frame--browser",
        ),
      },
      demo.theme.wrapper === "browser" &&
        BrowserChrome({ title: () => demo.title, onReload: () => goTo(0) }),
      stage,
    ),
  );

  let resizeObserver: ResizeObserver | undefined;

  return {
    element,
    start() {
      layoutOverlay();
      renderStep(0, -1);
      resizeObserver = new ResizeObserver(() => layoutOverlay());
      resizeObserver.observe(element);
    },
    stop() {
      videoEl.pause();
      videoWatchHandle?.cancel();
      overlay.dispose();
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
      resizeObserver?.disconnect();
      clearTimeout(navTimer);
    },
    next,
    prev,
    goTo,
    currentIndex: () => index,
    currentStep: () => demo.steps[index],
  };
}
