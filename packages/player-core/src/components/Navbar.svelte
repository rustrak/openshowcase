<script lang="ts">
import type { NavbarSegment } from "./types";

interface Props {
  segments: NavbarSegment[];
  /** Shown while the viewer is interacting (pointer moving over the player, keyboard focus
   * inside it). Hidden, it doesn't take pointer events — hotspots underneath stay clickable. */
  visible?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onSeek?: (index: number) => void;
}

let { segments, visible = false, onPrev, onNext, onSeek }: Props = $props();

const activeIndex = $derived(segments.findIndex((s) => s.active));
</script>

<div class="navbar" class:navbar--visible={visible}>
  <button
    type="button"
    title="Previous step"
    aria-label="Previous step"
    class="nav-btn"
    onclick={(event) => {
      event.stopPropagation();
      onPrev?.();
    }}
  >
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>
  </button>

  <div class="segments">
    {#each segments as segment, i (i)}
      <button
        type="button"
        title="Go to step {i + 1}"
        class="segment"
        class:segment--active={segment.active}
        class:segment--done={segment.done}
        onclick={(event) => {
          event.stopPropagation();
          onSeek?.(i);
        }}
      >
        <span class="segment-track">
          <span
            class="segment-fill"
            class:segment-fill--done={segment.done}
            style="width: {segment.progress * 100}%"
          ></span>
        </span>
      </button>
    {/each}
  </div>

  <span class="counter" aria-live="polite">
    {Math.max(0, activeIndex) + 1}<span class="counter-total">/{segments.length}</span>
  </span>

  <button
    type="button"
    title="Next step"
    aria-label="Next step"
    class="nav-btn"
    onclick={(event) => {
      event.stopPropagation();
      onNext?.();
    }}
  >
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" /></svg>
  </button>
</div>

<style>
  .navbar {
    position: absolute;
    inset: auto 0 0 0;
    z-index: 6;
    display: flex;
    align-items: center;
    gap: calc(var(--wd-u, 14px) * 0.5);
    padding: calc(var(--wd-u, 14px) * 2) calc(var(--wd-u, 14px) * 0.75)
      calc(var(--wd-u, 14px) * 0.6);
    background: linear-gradient(to top, rgb(9 9 11 / 0.55), rgb(9 9 11 / 0));
    color: #fff;
    opacity: 0;
    translate: 0 4px;
    pointer-events: none;
    transition:
      opacity 220ms var(--wd-ease-out, ease-out),
      translate 220ms var(--wd-ease-out, ease-out);
  }
  .navbar--visible,
  .navbar:focus-within {
    opacity: 1;
    translate: 0 0;
    pointer-events: auto;
  }

  .nav-btn {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: calc(var(--wd-u, 14px) * 2);
    height: calc(var(--wd-u, 14px) * 2);
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.14);
    color: #fff;
    cursor: pointer;
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    transition:
      background-color 150ms ease,
      scale 150ms ease;
  }
  .nav-btn:hover {
    background: rgb(255 255 255 / 0.26);
  }
  .nav-btn:active {
    scale: 0.92;
  }
  .nav-btn:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
  .nav-btn svg {
    width: 55%;
    height: 55%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .segments {
    display: flex;
    flex: 1;
    align-items: center;
    gap: calc(var(--wd-u, 14px) * 0.3);
    min-width: 0;
  }

  /* A tall invisible hit row around a thin bar that thickens on hover. */
  .segment {
    flex: 1 1 0;
    min-width: 6px;
    height: calc(var(--wd-u, 14px) * 1.5);
    display: flex;
    align-items: center;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    transition: flex-grow 260ms cubic-bezier(0.6, 0.6, 0, 1);
  }
  .segment--active {
    flex-grow: 3;
  }
  .segment-track {
    position: relative;
    width: 100%;
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.32);
    transition: height 200ms cubic-bezier(0.6, 0.6, 0, 1);
  }
  .segment:hover .segment-track,
  .segment--active .segment-track {
    height: 6px;
  }
  .segment:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
    border-radius: 4px;
  }
  .segment-fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: 0%;
    border-radius: inherit;
    background: #fff;
  }
  .segment-fill--done {
    background: rgb(255 255 255 / 0.85);
  }

  .counter {
    flex-shrink: 0;
    font-size: calc(var(--wd-u, 14px) * 0.8);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #fff;
    text-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
  }
  .counter-total {
    color: rgb(255 255 255 / 0.6);
  }

  @media (prefers-reduced-motion: reduce) {
    .navbar {
      translate: 0 0;
    }
  }
</style>
