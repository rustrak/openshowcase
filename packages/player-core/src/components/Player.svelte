<script lang="ts">
import type {
  Demo,
  PhotoStep,
  Step,
  VideoStep,
} from "@rustrak/openshowcase-schema";
import { onMount, untrack } from "svelte";
import { loadVideoSrc, resolveAssetUrl } from "../core/asset-loader";
import {
  computeAnchorPoint,
  computeContainBox,
  IDENTITY_ZOOM_TRANSFORM,
} from "../core/geometry";
import {
  applyInheritedZoom,
  applyMediaZoom,
  resolveTiming,
  ZOOM_ANIMATION_DELAY_MS,
} from "../core/media-zoom";
import {
  type PhotoHotspotVisual,
  PhotoOverlayController,
  type PhotoTooltipVisual,
} from "../core/photo-overlay";
import { StepMachine } from "../core/step-machine";
import type { VideoClipWatcherHandle } from "../core/video-clip-watcher";
import {
  continuesInto,
  isContiguousPlayback,
  startVideoStep,
  whenAtTime,
} from "../core/video-step";
import BrowserChrome from "./BrowserChrome.svelte";
import Navbar from "./Navbar.svelte";
import PhotoLayer from "./PhotoLayer.svelte";
import type { NavbarSegment } from "./types";
import VideoLayer from "./VideoLayer.svelte";
// Tailwind's compiled output for the whole component tree. The build inlines this (and
// every scoped component <style>) into player.js as a runtime-injected <style> tag — see
// vite-plugin-css-injected-by-js in vite.config.ts — so the exporter's standalone bundle
// stays a single self-contained script, no second CSS file to link.
import "../app.css";

interface Props {
  demo: Demo;
  /** Prefix prepended to relative asset src (image/video), e.g. the bundle's base URL. */
  assetBaseUrl?: string;
  onStepChange?: (index: number, step: Step) => void;
}

let { demo: demoProp, assetBaseUrl, onStepChange }: Props = $props();
// A new Player instance is always created per Demo (see mount.ts) — `demo` never changes
// over this component's lifetime, so it's captured once as a plain, untracked reference
// rather than read reactively throughout.
const demo = untrack(() => demoProp);

function isPhotoStep(step: Step): step is PhotoStep {
  return step.type === "photo";
}
function isVideoStep(step: Step): step is VideoStep {
  return step.type === "video";
}

const firstPhoto = demo.steps.find(isPhotoStep);
const naturalWidth = demo.video?.width ?? firstPhoto?.image.width ?? 0;
const naturalHeight = demo.video?.height ?? firstPhoto?.image.height ?? 0;

let rootEl: HTMLDivElement | undefined = $state();
let stageEl: HTMLDivElement | undefined = $state();
let videoEl: HTMLVideoElement | undefined = $state();

let index = $state(0);
let stageSize = $state({ width: 0, height: 0 });

let photo = $state<{
  visible: boolean;
  src: string;
  /** Bumped per photo step render: PhotoLayer re-reports ready even when `src` is unchanged. */
  renderId: number;
  alt: string;
  transform: string;
  transformInstant: boolean;
  transitionMs: number;
  transitionEasing: string;
  hotspot?: PhotoHotspotVisual;
  tooltip?: PhotoTooltipVisual;
}>({
  visible: false,
  src: "",
  renderId: 0,
  alt: "",
  transform: IDENTITY_ZOOM_TRANSFORM,
  transformInstant: false,
  // Mirrors PhotoLayer/VideoLayer's own default props — applyMediaZoom overwrites these
  // as soon as the first step renders, this is only the value used for the brief instant
  // before that (while the layer is still hidden).
  transitionMs: 1000,
  transitionEasing: "cubic-bezier(0.65, 0, 0.35, 1)",
});

let video = $state<{
  visible: boolean;
  transform: string;
  transformInstant: boolean;
  transitionMs: number;
  transitionEasing: string;
}>({
  visible: false,
  transform: IDENTITY_ZOOM_TRANSFORM,
  transformInstant: false,
  transitionMs: 1000,
  transitionEasing: "cubic-bezier(0.65, 0, 0.35, 1)",
});

let segments = $state<NavbarSegment[]>(
  demo.steps.map(() => ({ progress: 0, active: false, done: false })),
);

// Plain instance bookkeeping — not read by the template, so plain `let` rather than `$state`.
let videoObjectUrl: string | undefined;
let videoWatchHandle: VideoClipWatcherHandle | undefined;
let currentStepRef: Step | undefined;

const overlay = new PhotoOverlayController({
  setHotspot: (hotspot) => {
    photo.hotspot = hotspot;
  },
  setTooltip: (tooltip) => {
    photo.tooltip = tooltip;
  },
  showTooltip: () => {
    if (photo.tooltip) photo.tooltip.visible = true;
  },
  hideTooltip: () => {
    if (photo.tooltip) photo.tooltip.visible = false;
  },
});

async function loadVideoAsset(src: string): Promise<void> {
  const resolved = await loadVideoSrc(src, assetBaseUrl);
  videoObjectUrl = resolved.objectUrl;
  if (videoEl) videoEl.src = resolved.src;
}

const videoReady: Promise<void> = demo.video
  ? loadVideoAsset(demo.video.src)
  : Promise.resolve();

const stepMachine = new StepMachine(demo.steps.length, demo.theme.autoplay, {
  onChange: (newIndex) => renderStep(newIndex, index),
  onFinish: () => finish(),
});

export function next(): void {
  stepMachine.next();
}
export function prev(): void {
  stepMachine.prev();
}
export function goTo(i: number): void {
  stepMachine.goTo(i);
}
export function currentIndex(): number {
  return index;
}
export function currentStep(): Step | undefined {
  return demo.steps[index];
}

/** On the last step, advancing means dismissing the overlays and settling on a clean view. */
function finish(): void {
  overlay.reset();
  segments.forEach((segment) => {
    segment.active = false;
    segment.done = true;
    segment.progress = 1;
  });
}

function handleAdvanceGesture(): void {
  const step = currentStepRef;
  if (step && isPhotoStep(step) && !step.hotspot) next();
}

function renderStep(newIndex: number, previousIndex: number): void {
  const step = demo.steps[newIndex];
  if (!step) return;
  index = newIndex;
  currentStepRef = step;
  videoWatchHandle?.cancel();
  videoWatchHandle = undefined;

  segments.forEach((segment, i) => {
    segment.active = i === newIndex;
    segment.done = i < newIndex;
    // a photo step has no duration: its segment is complete on arrival; a video step's
    // fills as the clip plays (onProgress below)
    if (i === newIndex) segment.progress = isVideoStep(step) ? 0 : 1;
    else segment.progress = i < newIndex ? 1 : 0;
  });

  if (isVideoStep(step)) {
    renderVideoStep(step, previousIndex);
  } else {
    renderPhotoStep(step, previousIndex);
  }

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

  const videoWasHidden = !video.visible;
  // The layers swap only once the video shows this clip's first frame (see whenAtTime below):
  // until then the photo — which IS that frame — stays up, so the cut is invisible.
  const showVideoLayer = () => {
    photo.visible = false;
    video.visible = true;
  };
  overlay.reset();
  photo.transform = IDENTITY_ZOOM_TRANSFORM;

  const videoTarget = {
    setTransform: (transform: string) => {
      video.transform = transform;
    },
    setTransformInstant: (instant: boolean) => {
      video.transformInstant = instant;
    },
    setTransitionTiming: (ms: number, easing: string) => {
      video.transitionMs = ms;
      video.transitionEasing = easing;
    },
  };

  if (inheritedZoom) {
    applyInheritedZoom(
      videoTarget,
      inheritedZoom,
      step.panZoom,
      () => currentStepRef === step,
    );
  } else {
    applyMediaZoom(
      videoTarget,
      step.panZoom,
      videoWasHidden,
      () => currentStepRef === step,
    );
  }

  videoReady.then(async () => {
    if (currentStepRef !== step || !videoEl) return;
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
          const segment = segments[index];
          if (segment) segment.progress = progress;
        },
        onZoomOut: () => {
          video.transform = IDENTITY_ZOOM_TRANSFORM;
        },
        onEnded: () => {
          videoWatchHandle = undefined;
          next();
        },
      },
      continuesInto(step, demo.steps[index + 1]),
    );
  });
}

function handleVideoEnded(): void {
  next();
}

function renderPhotoStep(step: PhotoStep, previousIndex: number): void {
  videoEl?.pause();
  const previousStep = demo.steps[previousIndex];
  // A hotspot "traveling" from its last position only makes visual sense when the two photos
  // share the same framing. If either side of this transition has a panZoom, the on-screen
  // geometry isn't comparable anymore — clear the old marker now (instead of leaving it frozen
  // in its now-stale spot for the whole zoom) so the new one pops in fresh once it settles.
  if (step.panZoom || previousStep?.panZoom) {
    overlay.reset();
  } else {
    overlay.hide();
  }
  photo.src = resolveAssetUrl(step.image.src, assetBaseUrl);
  photo.renderId += 1;
  photo.alt = step.hotspot?.label ?? `Step ${index + 1}`;
  // the actual reveal happens in handlePhotoReady, once PhotoLayer's decode resolves
}

/**
 * The video (or previous photo) stays visible until the new image is DECODED — otherwise
 * the swap would show a stale frame and look like a jump.
 */
function handlePhotoReady(): void {
  const step = currentStepRef;
  if (!step || !isPhotoStep(step)) return;
  const wasHidden = !photo.visible;
  // Captured BEFORE applyMediaZoom below changes it: true when the photo layer was already
  // showing a zoomed-in frame and this step has no zoom of its own — i.e. it's about to ease
  // back out to identity, not just cut straight to it.
  const isZoomingOut =
    !wasHidden && !step.panZoom && photo.transform !== IDENTITY_ZOOM_TRANSFORM;
  video.visible = false;
  video.transform = IDENTITY_ZOOM_TRANSFORM;
  photo.visible = true;

  applyMediaZoom(
    {
      setTransform: (transform) => {
        photo.transform = transform;
      },
      setTransformInstant: (instant) => {
        photo.transformInstant = instant;
      },
      setTransitionTiming: (ms, easing) => {
        photo.transitionMs = ms;
        photo.transitionEasing = easing;
      },
    },
    step.panZoom,
    wasHidden,
    () => currentStepRef === step,
  );

  const anchor = step.hotspot ? computeAnchor(step, step.hotspot) : undefined;
  // The hotspot/tooltip are positioned at their POST-zoom coordinates (see computeAnchorPoint)
  // but aren't part of the image's own transform, so they can't visually "ride along" with a
  // pan-zoom in progress — revealing them only once the zoom has settled avoids the mismatch.
  const revealDelayMs = step.panZoom
    ? ZOOM_ANIMATION_DELAY_MS + resolveTiming(step.panZoom).ms
    : isZoomingOut
      ? resolveTiming(undefined).ms
      : 0;
  setTimeout(() => {
    if (currentStepRef !== step) return;
    overlay.reveal(step.hotspot, anchor, () => currentStepRef === step);
  }, revealDelayMs);
  preSeekNextVideoStep();
}

function preSeekNextVideoStep(): void {
  const nextStep = demo.steps[index + 1];
  if (!nextStep || !isVideoStep(nextStep)) return;
  videoReady.then(() => {
    if (demo.steps[index + 1] !== nextStep) return;
    if (videoEl) videoEl.currentTime = nextStep.startTime;
  });
}

function computeAnchor(
  step: PhotoStep,
  hotspot: PhotoStep["hotspot"],
): { left: number; top: number } {
  const box = computeContainBox(
    stageEl?.clientWidth ?? 0,
    stageEl?.clientHeight ?? 0,
    naturalWidth,
    naturalHeight,
  );
  return computeAnchorPoint(
    hotspot!,
    box,
    naturalWidth,
    naturalHeight,
    step.panZoom,
  );
}

function layoutOverlay(): void {
  stageSize = {
    width: stageEl?.clientWidth ?? 0,
    height: stageEl?.clientHeight ?? 0,
  };
  const step = currentStepRef;
  if (!step || !isPhotoStep(step) || !step.hotspot || !photo.hotspot) return;
  const anchor = computeAnchor(step, step.hotspot);
  overlay.reposition(photo.hotspot, photo.tooltip, anchor);
}

// Navbar visibility: shown while the viewer is active over the player, hidden after a short
// idle — like a video player's controls. Hovering the bar itself keeps it up.
const NAV_IDLE_MS = 2200;
let navVisible = $state(false);
let navTimer: ReturnType<typeof setTimeout> | undefined;
function showNav(event?: Event): void {
  navVisible = true;
  clearTimeout(navTimer);
  const overBar = (event?.target as Element | null)?.closest?.(".navbar");
  if (!overBar) navTimer = setTimeout(() => (navVisible = false), NAV_IDLE_MS);
}
function hideNavSoon(): void {
  clearTimeout(navTimer);
  navTimer = setTimeout(() => (navVisible = false), 400);
}

function handleStageClick(event: MouseEvent): void {
  if (event.target === stageEl) handleAdvanceGesture();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "ArrowRight") next();
  if (event.key === "ArrowLeft") prev();
}

onMount(() => {
  layoutOverlay();
  renderStep(0, -1);

  const resizeObserver = new ResizeObserver(() => layoutOverlay());
  if (rootEl) resizeObserver.observe(rootEl);

  return () => {
    videoEl?.pause();
    videoWatchHandle?.cancel();
    overlay.dispose();
    if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
    resizeObserver.disconnect();
    clearTimeout(navTimer);
  };
});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -- root needs focus + arrow-key nav, like native <video> controls -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={rootEl}
  class="openshowcase-player relative block overflow-hidden leading-[1.45] select-none"
  class:openshowcase-player--dark={demo.theme.appearance === 'dark'}
  role="application"
  tabindex="0"
  onkeydown={handleKeydown}
  onpointermove={showNav}
  onpointerdown={showNav}
  onpointerleave={hideNavSoon}
>
  <div
    class="frame relative flex w-full flex-col overflow-hidden bg-white dark:bg-[#18181b]"
    class:frame--browser={demo.theme.wrapper === 'browser'}
  >
    {#if demo.theme.wrapper === 'browser'}
      <BrowserChrome title={demo.title} onReload={() => goTo(0)} />
    {/if}

    <div
      bind:this={stageEl}
      class="stage relative flex-none overflow-hidden bg-[#fafafa] dark:bg-[#0f0f10]"
      style="aspect-ratio: {naturalWidth} / {naturalHeight};"
      onclick={handleStageClick}
      role="presentation"
    >
      <VideoLayer
        bind:videoEl
        visible={video.visible}
        transform={video.transform}
        transformInstant={video.transformInstant}
        transitionMs={video.transitionMs}
        transitionEasing={video.transitionEasing}
        onended={handleVideoEnded}
      />
      <PhotoLayer
        visible={photo.visible}
        src={photo.src}
        renderId={photo.renderId}
        alt={photo.alt}
        transform={photo.transform}
        transformInstant={photo.transformInstant}
        transitionMs={photo.transitionMs}
        transitionEasing={photo.transitionEasing}
        {stageSize}
        hotspot={photo.hotspot}
        tooltip={photo.tooltip}
        onReady={handlePhotoReady}
        onHotspotAdvance={next}
      />
      <Navbar {segments} visible={navVisible} onPrev={prev} onNext={next} onSeek={goTo} />
    </div>
  </div>
</div>

<style>
  .frame--browser {
    border-radius: 12px;
    box-shadow:
      0 0 0 1px rgb(15 23 42 / 0.06),
      0 2px 6px rgb(15 23 42 / 0.06),
      0 24px 60px -16px rgb(15 23 42 / 0.4);
  }
</style>
