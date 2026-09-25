<script lang="ts">
import { untrack } from "svelte";
import type {
  PhotoHotspotVisual,
  PhotoTooltipVisual,
} from "../core/photo-overlay";
import Hotspot from "./Hotspot.svelte";
import Tooltip from "./Tooltip.svelte";

interface Props {
  visible: boolean;
  src: string;
  alt: string;
  transform: string;
  /** Suspend the transform transition for one frame — used when swapping this layer back
   * into view, so it doesn't animate in from whatever transform it was left at while hidden. */
  transformInstant?: boolean;
  /** Transition duration (ms) / CSS timing-function driving the `transform` change — defaults
   * match the resolved cinematic default so this component is self-consistent standalone. */
  transitionMs?: number;
  transitionEasing?: string;
  stageSize: { width: number; height: number };
  hotspot?: PhotoHotspotVisual;
  tooltip?: PhotoTooltipVisual;
  /** Bumped by the parent for every photo step it shows, so showing the same `src` again (e.g.
   * returning to a photo after replaying the video before it) still fires `onReady`. */
  renderId?: number;
  /** Fires once per `src`/`renderId` change, after the browser has decoded the new frame (or
   * failed to) — the signal the parent waits for before swapping video/photo visibility, so the
   * swap never flashes a not-yet-decoded frame. */
  onReady?: () => void;
  /** Clicking the hotspot/tooltip themselves always means "seen it, continue". */
  onHotspotAdvance?: () => void;
}

let {
  visible,
  src,
  alt,
  transform,
  transformInstant = false,
  transitionMs = 1000,
  transitionEasing = "cubic-bezier(0.65, 0, 0.35, 1)",
  stageSize,
  hotspot,
  tooltip,
  renderId = 0,
  onReady,
  onHotspotAdvance,
}: Props = $props();

/** Photo→photo crossfade length. Must match `.media--entering` below. */
const CROSSFADE_MS = 220;

let imgEl: HTMLImageElement | undefined = $state();
let hovered = $state(false);

// The frame being replaced, kept underneath while the new one fades in — only when a photo
// follows a photo (from a video the swap is already a frame-exact cut).
let previous = $state<{ src: string; transform: string } | null>(null);
let entering = $state(false);
let lastShown: { src: string; transform: string; visible: boolean } | null =
  null;

$effect(() => {
  // re-run whenever `src` or `renderId` changes; decode (success or failure) is the "ready to
  // reveal" signal. The cleanup guards against a superseded decode (rapid navigation) reporting
  // ready late.
  void renderId;
  const current = src;
  const el = imgEl;
  if (!el) return;
  const prior = lastShown;
  if (prior?.visible && prior.src !== current) {
    previous = { src: prior.src, transform: prior.transform };
    entering = true;
  }
  let cancelled = false;
  let clearTimer: ReturnType<typeof setTimeout> | undefined;
  const ready = () => {
    if (cancelled) return;
    onReady?.();
    entering = false;
    clearTimer = setTimeout(() => {
      previous = null;
    }, CROSSFADE_MS + 40);
  };
  el.decode().then(ready, ready);
  return () => {
    cancelled = true;
    clearTimeout(clearTimer);
  };
});

$effect(() => {
  lastShown = { src, transform, visible };
});

// A new step never inherits the previous one's hover (the pointer may not have moved — and a
// hotspot that unmounts never gets its mouseleave).
$effect(() => {
  void src;
  void hotspot?.left;
  void hotspot?.top;
  hovered = false;
});

// The spotlight dim: one "light" per hotspot position. A moved hotspot fades the old light out
// where it was and a new one in where it lands (nothing slides). The layers are a small list
// managed here — each leaving light is removed by a timer after its fade — rather than Svelte
// outro transitions, which leave elements behind when a step changes mid-transition.
const LIGHT_OUT_MS = 500;
let lights = $state<
  { id: number; left: number; top: number; leaving: boolean }[]
>([]);
let lightId = 0;
let lastSpot: { left: number; top: number } | undefined;

function dismissLights() {
  if (!lights.some((l) => !l.leaving)) return;
  lights = lights.map((l) => ({ ...l, leaving: true }));
  setTimeout(() => {
    lights = lights.filter((l) => !l.leaving);
  }, LIGHT_OUT_MS);
}

$effect(() => {
  const spot =
    visible && hotspot ? { left: hotspot.left, top: hotspot.top } : undefined;
  const instant = hotspot?.instant ?? false;
  // only react to the hotspot; the list itself is read/written untracked
  untrack(() => updateLights(spot, instant));
});

function updateLights(
  spot: { left: number; top: number } | undefined,
  instant: boolean,
) {
  if (!spot) {
    lastSpot = undefined;
    dismissLights();
    return;
  }
  const current = lights.findLast((l) => !l.leaving);
  if (current && instant) {
    // a resize/reposition: move the current light with the hotspot, no new fade
    lights = lights.map((l) => (l.id === current.id ? { ...l, ...spot } : l));
  } else if (
    !current ||
    !lastSpot ||
    lastSpot.left !== spot.left ||
    lastSpot.top !== spot.top
  ) {
    dismissLights();
    // keep at most the one fading out + the new one
    lights = [
      ...lights.filter((l) => l.leaving).slice(-1),
      { id: ++lightId, ...spot, leaving: false },
    ];
  }
  lastSpot = spot;
}

// Click feedback: a ring bursting from where the hotspot was, independent of the hotspot
// element (which may unmount or glide away the moment the step advances).
let bursts = $state<{ id: number; left: number; top: number; color: string }[]>(
  [],
);
let burstId = 0;
function advance() {
  if (hotspot) {
    const burst = {
      id: ++burstId,
      left: hotspot.left,
      top: hotspot.top,
      color: hotspot.color,
    };
    bursts = [...bursts, burst];
    setTimeout(() => {
      bursts = bursts.filter((b) => b.id !== burst.id);
    }, 500);
  }
  onHotspotAdvance?.();
}
</script>

{#if previous}
  <img
    class="media absolute inset-0 h-full w-full object-contain"
    style="transform: {previous.transform};"
    src={previous.src}
    alt=""
    draggable="false"
  />
{/if}

<img
  bind:this={imgEl}
  class="media absolute inset-0 h-full w-full object-contain"
  class:media--entering={entering}
  class:media--fading={previous !== null}
  style="display: {visible ? 'block' : 'none'}; transform: {transform}; transition: {transformInstant ? 'none' : `transform ${transitionMs}ms ${transitionEasing}`};"
  {src}
  {alt}
  draggable="false"
/>

{#each lights as light (light.id)}
  <div
    class="spotlight pointer-events-none absolute inset-0 z-1"
    class:spotlight--leaving={light.leaving}
    style="--wd-spot-x: {light.left}px; --wd-spot-y: {light.top}px;"
  ></div>
{/each}

{#if visible && hotspot}
  <Hotspot
    left={hotspot.left}
    top={hotspot.top}
    color={hotspot.color}
    instant={hotspot.instant}
    appear={hotspot.appear}
    {hovered}
    onclick={advance}
    onhoverchange={(value) => (hovered = value)}
  />
{/if}

{#each bursts as burst (burst.id)}
  <span
    class="burst"
    style="left: {burst.left}px; top: {burst.top}px; --openshowcase-color: {burst.color};"
  ></span>
{/each}

{#if visible && tooltip}
  <Tooltip
    anchor={tooltip.anchor}
    {stageSize}
    position={tooltip.position}
    visible={tooltip.visible}
    text={tooltip.text}
    bgColor={tooltip.bgColor}
    textColor={tooltip.textColor}
    {hovered}
    onclick={advance}
    onhoverchange={(value) => (hovered = value)}
  />
{/if}

<style>
  .media {
    pointer-events: none;
    will-change: transform;
  }
  /* the incoming frame stays transparent until decoded, then fades over the previous one */
  .media--fading {
    animation: media-in 220ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  .media--entering {
    opacity: 0;
    animation: none;
  }
  @keyframes media-in {
    from {
      opacity: 0;
    }
  }

  /* Dim the frame except a soft pool of light around the hotspot. The falloff is spread
     over many stops (roughly a smoothstep) so there's no visible edge — it reads like light,
     not like a hole cut in a gray sheet. --wd-spot-k (registered in app.css) scales the pool
     during the in/out transitions. */
  .spotlight {
    /* enter: the room dims while the light gathers onto the hotspot */
    animation: light-in 900ms cubic-bezier(0.33, 1, 0.68, 1) both;
    --wd-spot-r: calc(var(--wd-u, 14px) * 1.5 * var(--wd-spot-k, 1));
    background: radial-gradient(
      circle at var(--wd-spot-x) var(--wd-spot-y),
      rgb(12 14 20 / 0) calc(var(--wd-spot-r) * 1),
      rgb(12 14 20 / 0.015) calc(var(--wd-spot-r) * 1.5),
      rgb(12 14 20 / 0.05) calc(var(--wd-spot-r) * 2.2),
      rgb(12 14 20 / 0.1) calc(var(--wd-spot-r) * 3.2),
      rgb(12 14 20 / 0.16) calc(var(--wd-spot-r) * 4.6),
      rgb(12 14 20 / 0.21) calc(var(--wd-spot-r) * 6.5),
      rgb(12 14 20 / 0.24) calc(var(--wd-spot-r) * 9)
    );
  }

  /* leave: the light lifts and spreads as it fades — in place, no sliding */
  .spotlight--leaving {
    animation: light-out 500ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
  }
  @keyframes light-in {
    from {
      opacity: 0;
      --wd-spot-k: 1.6;
    }
  }
  @keyframes light-out {
    from {
      opacity: 1;
      --wd-spot-k: 1;
    }
    to {
      opacity: 0;
      --wd-spot-k: 1.35;
    }
  }

  .burst {
    position: absolute;
    z-index: 3;
    width: calc(var(--wd-u, 14px) * 2);
    height: calc(var(--wd-u, 14px) * 2);
    translate: -50% -50%;
    border-radius: 50%;
    border: 2px solid var(--openshowcase-color);
    pointer-events: none;
    animation: hotspot-burst 450ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
  }
  @keyframes hotspot-burst {
    from {
      scale: 0.4;
      opacity: 0.7;
    }
    to {
      scale: 2.4;
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .burst {
      display: none;
    }
    .spotlight {
      --wd-spot-k: 1 !important;
    }
  }
</style>
