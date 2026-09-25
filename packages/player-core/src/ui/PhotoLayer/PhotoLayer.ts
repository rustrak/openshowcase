import type {
  PhotoHotspotVisual,
  PhotoTooltipVisual,
} from "../../core/photo-overlay";
import {
  cx,
  each,
  h,
  latest,
  show,
  untracked,
  type ViewProps,
} from "../../dom/h";
import { effect, signal } from "../../dom/signals";
import { injectStyles } from "../../dom/styles";
import { Hotspot, vanish } from "../Hotspot/Hotspot";
import { Tooltip, vanishTooltip } from "../Tooltip/Tooltip";
import { css } from "./PhotoLayer.styles";

export interface PhotoLayerProps {
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

/** Photo→photo crossfade length. Must match `.media--entering` in PhotoLayer.styles.ts. */
const CROSSFADE_MS = 220;
/** Spotlight fade-out length. Must match `.spotlight--leaving` in PhotoLayer.styles.ts. */
const LIGHT_OUT_MS = 500;

interface Light {
  id: number;
  left: number;
  top: number;
  leaving: boolean;
}

interface Burst {
  id: number;
  left: number;
  top: number;
  color: string;
}

/** The stage's photo layers — siblings of the video layer and the navbar, so it returns a fragment. */
export function PhotoLayer(
  props: ViewProps<PhotoLayerProps>,
): DocumentFragment {
  injectStyles(document, "photo-layer", css);
  const hovered = signal(false);

  // The frame being replaced, kept underneath while the new one fades in — only when a photo
  // follows a photo (from a video the swap is already a frame-exact cut).
  const previous = signal<{ src: string; transform: string } | null>(null);
  const entering = signal(false);
  let lastShown: { src: string; transform: string; visible: boolean } | null =
    null;

  const img = h("img", {
    class: () =>
      cx(
        "media absolute inset-0 h-full w-full object-contain",
        entering() && "media--entering",
        previous() !== null && "media--fading",
      ),
    style: () => {
      const transition = props.transformInstant?.()
        ? "none"
        : `transform ${props.transitionMs?.() ?? 1000}ms ${props.transitionEasing?.() ?? "cubic-bezier(0.65, 0, 0.35, 1)"}`;
      return `display: ${props.visible() ? "block" : "none"}; transform: ${props.transform()}; transition: ${transition};`;
    },
    src: () => props.src(),
    alt: () => props.alt(),
    draggable: "false",
  });

  effect(() => {
    // re-run whenever `src` or `renderId` changes; decode (success or failure) is the "ready
    // to reveal" signal. The cleanup guards against a superseded decode (rapid navigation)
    // reporting ready late.
    props.renderId?.();
    const current = props.src();
    return untracked(() => {
      const prior = lastShown;
      if (prior?.visible && prior.src !== current) {
        previous({ src: prior.src, transform: prior.transform });
        entering(true);
      }
      let cancelled = false;
      let clearTimer: ReturnType<typeof setTimeout> | undefined;
      const ready = () => {
        if (cancelled) return;
        props.onReady?.();
        entering(false);
        clearTimer = setTimeout(() => previous(null), CROSSFADE_MS + 40);
      };
      img.decode().then(ready, ready);
      return () => {
        cancelled = true;
        clearTimeout(clearTimer);
      };
    });
  });

  effect(() => {
    lastShown = {
      src: props.src(),
      transform: props.transform(),
      visible: props.visible(),
    };
  });

  // A new step never inherits the previous one's hover (the pointer may not have moved — and
  // a hotspot that unmounts never gets its mouseleave).
  effect(() => {
    props.src();
    props.hotspot?.();
    hovered(false);
  });

  // The spotlight dim: one "light" per hotspot position. A moved hotspot fades the old light
  // out where it was and a new one in where it lands (nothing slides). The layers are a small
  // list managed here — each leaving light is removed by a timer after its fade.
  const lights = signal<Light[]>([]);
  let lightId = 0;
  let lastSpot: { left: number; top: number } | undefined;

  function dismissLights() {
    if (!lights().some((l) => !l.leaving)) return;
    lights(lights().map((l) => ({ ...l, leaving: true })));
    setTimeout(() => {
      lights(lights().filter((l) => !l.leaving));
    }, LIGHT_OUT_MS);
  }

  function updateLights(
    spot: { left: number; top: number } | undefined,
    instant: boolean,
  ) {
    if (!spot) {
      lastSpot = undefined;
      dismissLights();
      return;
    }
    const current = lights().findLast((l) => !l.leaving);
    if (current && instant) {
      // a resize/reposition: move the current light with the hotspot, no new fade
      lights(
        lights().map((l) => (l.id === current.id ? { ...l, ...spot } : l)),
      );
    } else if (
      !current ||
      !lastSpot ||
      lastSpot.left !== spot.left ||
      lastSpot.top !== spot.top
    ) {
      dismissLights();
      // keep at most the one fading out + the new one
      lights([
        ...lights()
          .filter((l) => l.leaving)
          .slice(-1),
        { id: ++lightId, ...spot, leaving: false },
      ]);
    }
    lastSpot = spot;
  }

  effect(() => {
    const hotspot = props.hotspot?.();
    const spot =
      props.visible() && hotspot
        ? { left: hotspot.left, top: hotspot.top }
        : undefined;
    const instant = hotspot?.instant ?? false;
    // only react to the hotspot; the list itself is read/written untracked
    untracked(() => updateLights(spot, instant));
  });

  // Click feedback: a ring bursting from where the hotspot was, independent of the hotspot
  // element (which may unmount or glide away the moment the step advances).
  const bursts = signal<Burst[]>([]);
  let burstId = 0;
  function advance() {
    const hotspot = props.hotspot?.();
    if (hotspot) {
      const burst = {
        id: ++burstId,
        left: hotspot.left,
        top: hotspot.top,
        color: hotspot.color,
      };
      bursts([...bursts(), burst]);
      setTimeout(() => {
        bursts(bursts().filter((b) => b.id !== burst.id));
      }, 500);
    }
    props.onHotspotAdvance?.();
  }

  // Leaving views keep their last values while they play their exit.
  const lastPrevious = latest(() => previous() ?? undefined);
  const lastHotspot = latest(() => props.hotspot?.());
  const lastTooltip = latest(() => props.tooltip?.());

  const fragment = document.createDocumentFragment();
  fragment.append(
    show(
      () => previous(),
      () =>
        h("img", {
          class: "media absolute inset-0 h-full w-full object-contain",
          style: () => `transform: ${lastPrevious().transform};`,
          src: () => lastPrevious().src,
          alt: "",
          draggable: "false",
        }),
    ),
    img,
    each(
      () => lights(),
      (light) => light.id,
      (light) =>
        h("div", {
          class: () =>
            cx(
              "spotlight pointer-events-none absolute inset-0 z-1",
              light().leaving && "spotlight--leaving",
            ),
          style: () =>
            `--wd-spot-x: ${light().left}px; --wd-spot-y: ${light().top}px;`,
        }),
    ),
    show(
      () => props.visible() && props.hotspot?.(),
      () =>
        Hotspot({
          left: () => lastHotspot().left,
          top: () => lastHotspot().top,
          color: () => lastHotspot().color,
          instant: () => lastHotspot().instant,
          appear: () => lastHotspot().appear,
          hovered: () => hovered(),
          onclick: advance,
          onhoverchange: (value) => hovered(value),
        }),
      { exit: vanish },
    ),
    each(
      () => bursts(),
      (burst) => burst.id,
      (burst) =>
        h("span", {
          class: "burst",
          style: () =>
            `left: ${burst().left}px; top: ${burst().top}px; --openshowcase-color: ${burst().color};`,
        }),
    ),
    show(
      () => props.visible() && props.tooltip?.(),
      () =>
        Tooltip({
          anchor: () => lastTooltip().anchor,
          stageSize: () => props.stageSize(),
          position: () => lastTooltip().position,
          visible: () => lastTooltip().visible,
          text: () => lastTooltip().text,
          bgColor: () => lastTooltip().bgColor,
          textColor: () => lastTooltip().textColor,
          hovered: () => hovered(),
          onclick: advance,
          onhoverchange: (value) => hovered(value),
        }),
      { exit: vanishTooltip },
    ),
  );
  return fragment;
}
