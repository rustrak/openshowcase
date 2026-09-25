import { h, type ViewProps } from "../../dom/h";
import { injectStyles } from "../../dom/styles";
import { css } from "./VideoLayer.styles";

export interface VideoLayerProps {
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

/** Returns the <video> itself: the parent needs raw imperative control (currentTime/play/
 * pause/playbackRate) that has no clean declarative equivalent for frame-accurate seeking. */
export function VideoLayer(
  props: ViewProps<VideoLayerProps>,
): HTMLVideoElement {
  injectStyles(document, "video-layer", css);
  const video = h("video", {
    class: "media absolute inset-0 h-full w-full object-contain",
    style: () => {
      const transition = props.transformInstant?.()
        ? "none"
        : `transform ${props.transitionMs?.() ?? 1000}ms ${props.transitionEasing?.() ?? "cubic-bezier(0.65, 0, 0.35, 1)"}`;
      return `display: ${props.visible() ? "block" : "none"}; transform: ${props.transform()}; transition: ${transition};`;
    },
    playsinline: true,
    onended: () => props.onended?.(),
  });
  // `muted` as a property, like Svelte: the attribute only sets the default for a scripted <video>
  video.muted = true;
  return video;
}
