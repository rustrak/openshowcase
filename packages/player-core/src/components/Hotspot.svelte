<script lang="ts">
import { cubicIn } from "svelte/easing";

interface Props {
  left: number;
  top: number;
  color?: string;
  /** Skip the left/top glide — used for instant repositioning (e.g. on resize). */
  instant?: boolean;
  /** Play the pop-in appear animation (first time this hotspot shows up with no "travel" origin). */
  appear?: boolean;
  /** Hover is shared visually with the Tooltip callout, so it's controlled by the parent
   * rather than tracked internally — hovering either one highlights both. */
  hovered?: boolean;
  onclick?: () => void;
  onhoverchange?: (hovered: boolean) => void;
}

let {
  left,
  top,
  color = "#C5F11E",
  instant = false,
  appear = false,
  hovered = false,
  onclick,
  onhoverchange,
}: Props = $props();

/** Exit: a quick shrink + fade, eased in — it's leaving, it shouldn't linger. */
function vanish(_node: Element) {
  return {
    duration: 160,
    easing: cubicIn,
    css: (t: number) => `opacity: ${t}; scale: ${0.8 + 0.2 * t};`,
  };
}
</script>

<!--
  Anatomy (all sized in --wd-u, so it scales with the player):
  - the button is an invisible ≥44px hit box, centered on the anchor
  - .halo: a soft static disc of the brand color
  - .ripple ×2: sonar rings, offset by half a period
  - .core: the solid dot — white inner ring + dark hairline outline, so it reads on light
    and dark screenshots alike, with a slight top-light gradient and lift
-->
<button
  type="button"
  aria-label="Hotspot"
  class="hotspot"
  class:hotspot--still={instant}
  class:hotspot--appear={appear}
  class:hotspot--hover={hovered}
  style="left: {left}px; top: {top}px; --openshowcase-color: {color};"
  onclick={() => onclick?.()}
  onmouseenter={() => onhoverchange?.(true)}
  onmouseleave={() => onhoverchange?.(false)}
  out:vanish
>
  <span class="dot">
    <span class="halo"></span>
    <span class="ripple"></span>
    <span class="ripple ripple--late"></span>
    <span class="core"></span>
  </span>
</button>

<style>
  .hotspot {
    position: absolute;
    z-index: 3;
    width: max(44px, calc(var(--wd-u, 14px) * 3));
    height: max(44px, calc(var(--wd-u, 14px) * 3));
    translate: -50% -50%;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    /* travelling between steps: a spring glide, so it reads like a cursor moving over */
    transition:
      left 700ms var(--wd-spring-glide, ease-out),
      top 700ms var(--wd-spring-glide, ease-out);
  }
  .hotspot--still {
    transition: none;
  }

  .dot {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    transition: scale 420ms var(--wd-spring-pop, ease-out);
  }
  .hotspot--appear .dot {
    animation: hotspot-pop 480ms var(--wd-spring-pop, ease-out) both;
  }
  .hotspot--hover .dot {
    scale: 1.15;
  }
  .hotspot:active .dot {
    scale: 0.85;
    transition-duration: 120ms;
  }

  .halo,
  .ripple,
  .core {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .halo {
    width: calc(var(--wd-u, 14px) * 2);
    height: calc(var(--wd-u, 14px) * 2);
    background: color-mix(in srgb, var(--openshowcase-color) 22%, transparent);
    transition:
      background-color 250ms ease,
      scale 420ms var(--wd-spring-pop, ease-out);
  }
  .hotspot--hover .halo {
    background: color-mix(in srgb, var(--openshowcase-color) 32%, transparent);
    scale: 1.1;
  }

  .ripple {
    width: calc(var(--wd-u, 14px) * 2.25);
    height: calc(var(--wd-u, 14px) * 2.25);
    border: 1.5px solid color-mix(in srgb, var(--openshowcase-color) 70%, transparent);
    background: radial-gradient(
      circle,
      transparent 40%,
      color-mix(in srgb, var(--openshowcase-color) 30%, transparent) 100%
    );
    opacity: 0;
    animation: hotspot-ripple 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
  .ripple--late {
    animation-delay: 0.9s;
  }
  .hotspot--hover .ripple {
    animation-play-state: paused;
    opacity: 0;
    transition: opacity 150ms ease;
  }

  .core {
    width: calc(var(--wd-u, 14px) * 1.125);
    height: calc(var(--wd-u, 14px) * 1.125);
    /* same relief language as the tooltip: a small specular glint top-left over a
       top-lit gradient */
    background:
      radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.55), transparent 42%),
      linear-gradient(
        180deg,
        color-mix(in oklab, var(--openshowcase-color) 85%, white),
        var(--openshowcase-color) 55%,
        color-mix(in oklab, var(--openshowcase-color) 90%, black)
      );
    box-shadow:
      0 0 0 2px #fff,
      0 0 0 3px rgb(0 0 0 / 0.22),
      0 2px 6px rgb(0 0 0 / 0.28);
    animation: hotspot-breathe 1.8s ease-in-out infinite;
  }
  .hotspot--hover .core {
    animation-play-state: paused;
  }

  .hotspot:focus-visible .core {
    box-shadow:
      0 0 0 2px #fff,
      0 0 0 3px rgb(0 0 0 / 0.22),
      0 0 0 6px color-mix(in srgb, var(--openshowcase-color) 55%, transparent),
      0 2px 6px rgb(0 0 0 / 0.28);
  }

  @keyframes hotspot-pop {
    from {
      scale: 0.4;
      opacity: 0;
    }
    to {
      scale: 1;
      opacity: 1;
    }
  }
  @keyframes hotspot-ripple {
    0% {
      scale: 0.5;
      opacity: 0;
    }
    15% {
      opacity: 0.6;
    }
    100% {
      scale: 1.7;
      opacity: 0;
    }
  }
  @keyframes hotspot-breathe {
    0%,
    100% {
      scale: 1;
    }
    50% {
      scale: 0.88;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hotspot,
    .dot,
    .halo {
      transition: none;
    }
    .hotspot--appear .dot,
    .core {
      animation: none;
    }
    .ripple {
      animation: none;
      opacity: 0;
    }
    .halo {
      background: color-mix(in srgb, var(--openshowcase-color) 35%, transparent);
    }
  }
</style>
