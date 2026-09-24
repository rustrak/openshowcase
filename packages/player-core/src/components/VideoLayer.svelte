<script lang="ts">
interface Props {
  /** Bindable ref — the parent needs raw imperative control (currentTime/play/pause/playbackRate)
   * that has no clean declarative equivalent for frame-accurate video seeking. */
  videoEl?: HTMLVideoElement;
  visible: boolean;
  transform: string;
  /** Suspend the transform transition for one frame — used when swapping this layer back
   * into view, so it doesn't animate in from whatever transform it was left at while hidden. */
  transformInstant?: boolean;
  /** Transition duration (ms) / CSS timing-function driving the `transform` change — defaults
   * match the resolved cinematic default so this component is self-consistent standalone. */
  transitionMs?: number;
  transitionEasing?: string;
  onended?: () => void;
}

let {
  videoEl = $bindable(),
  visible,
  transform,
  transformInstant = false,
  transitionMs = 1000,
  transitionEasing = "cubic-bezier(0.65, 0, 0.35, 1)",
  onended,
}: Props = $props();
</script>

<video
  bind:this={videoEl}
  class="media absolute inset-0 h-full w-full object-contain"
  style="display: {visible ? 'block' : 'none'}; transform: {transform}; transition: {transformInstant ? 'none' : `transform ${transitionMs}ms ${transitionEasing}`};"
  muted
  playsinline
  onended={() => onended?.()}
></video>

<style>
  .media {
    pointer-events: none;
  }
</style>
