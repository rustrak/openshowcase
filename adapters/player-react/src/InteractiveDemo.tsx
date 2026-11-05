import {
  type AssetResolver,
  type HotspotStyle,
  loadDemo,
  Player,
  type PlayerAppearance,
} from "@rustrak/openshowcase-player-core";
import type {
  Backdrop,
  Demo,
  Step,
  ThemeWrapper,
} from "@rustrak/openshowcase-schema";
import { type CSSProperties, useEffect, useRef, useState } from "react";

export interface InteractiveDemoProps {
  /**
   * URL of an exported demo: a single `.openshowcase` file (or the exported `.zip`), or an
   * unzipped bundle's `steps.json`, whose assets are resolved relative to its directory.
   */
  src?: string;
  /** A pre-loaded Demo object, as an alternative to `src`. */
  demo?: Demo;
  /** Overrides the inferred asset base URL (only relevant when using `src`). */
  assetBaseUrl?: string;
  /** Width/height ratio used while no explicit height is set via `className`/`style`. Defaults to 16/9. */
  aspectRatio?: number;
  className?: string;
  style?: CSSProperties;
  /** Overrides every step's hotspot/tooltip colors, e.g. to force your brand color. */
  hotspotStyle?: HotspotStyle;
  /** Overrides the demo's light/dark appearance, e.g. to follow your site's mode,
   * or `"auto"` for the viewer's `prefers-color-scheme`. Changes apply live. */
  appearance?: PlayerAppearance;
  /** Overrides the demo's wrapper: `"none"`, `"browser"` or `"bezel"`. Changes apply live. */
  wrapper?: ThemeWrapper;
  /** Overrides the demo's backdrop (color, fill, padding) as a whole; `null` removes it.
   * Changes apply live. */
  backdrop?: Backdrop | null;
  /** Holds playback until the player is at least half on screen (shows its first step
   * meanwhile), e.g. for a demo below the fold or several on one page. */
  startWhenVisible?: boolean;
  onStepChange?: (index: number, step: Step) => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      demo: Demo;
      assetBaseUrl?: string;
      resolveAsset?: AssetResolver;
    };

export function InteractiveDemo({
  src,
  demo,
  assetBaseUrl,
  aspectRatio = 16 / 9,
  className,
  style,
  hotspotStyle,
  appearance,
  wrapper,
  backdrop,
  startWhenVisible,
  onStepChange,
}: InteractiveDemoProps) {
  const [state, setState] = useState<LoadState>(
    demo ? { status: "ready", demo, assetBaseUrl } : { status: "loading" },
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player>(undefined);
  // Compared by value: an inline `hotspotStyle={{...}}` is a new object every render
  const { bgColor, textColor } = hotspotStyle ?? {};
  const backdropKey = JSON.stringify(backdrop);
  // Read at mount; later changes go through the setters below, without a remount
  const live = useRef({ appearance, wrapper, backdrop, bgColor, textColor });
  live.current = { appearance, wrapper, backdrop, bgColor, textColor };

  useEffect(() => {
    if (demo) {
      setState({ status: "ready", demo, assetBaseUrl });
      return;
    }
    if (!src) {
      setState({
        status: "error",
        message: 'InteractiveDemo needs either a "src" or a "demo" prop.',
      });
      return;
    }

    const abort = new AbortController();
    let dispose: (() => void) | undefined;
    setState({ status: "loading" });

    loadDemo(src, { assetBaseUrl, signal: abort.signal })
      .then(({ dispose: free, ...loaded }) => {
        // Unmounted (or src changed) while loading: free it right away
        if (abort.signal.aborted) return free();
        dispose = free;
        setState({ status: "ready", ...loaded });
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error ? error.message : "Failed to load demo",
        });
      });

    return () => {
      abort.abort();
      dispose?.();
    };
  }, [src, demo, assetBaseUrl]);

  useEffect(() => {
    if (state.status !== "ready") return;
    const container = containerRef.current;
    if (!container) return;
    const player = new Player({
      container,
      demo: state.demo,
      assetBaseUrl: state.assetBaseUrl,
      resolveAsset: state.resolveAsset,
      hotspotStyle: {
        bgColor: live.current.bgColor,
        textColor: live.current.textColor,
      },
      appearance: live.current.appearance,
      wrapper: live.current.wrapper,
      backdrop: live.current.backdrop,
      startWhenVisible,
      onStepChange,
    });
    player.mount();
    playerRef.current = player;
    return () => {
      player.destroy();
      playerRef.current = undefined;
    };
  }, [state, startWhenVisible, onStepChange]);

  useEffect(() => {
    playerRef.current?.setAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    playerRef.current?.setWrapper(wrapper);
  }, [wrapper]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: by value, as `backdropKey`: an inline `backdrop={{...}}` is a new object every render
  useEffect(() => {
    playerRef.current?.setBackdrop(live.current.backdrop);
  }, [backdropKey]);

  useEffect(() => {
    playerRef.current?.setHotspotStyle({ bgColor, textColor });
  }, [bgColor, textColor]);

  // The player always takes its content's own size — the container imposes no aspect ratio.
  const ready = state.status === "ready";

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", ...style }}
    >
      <div ref={containerRef} style={{ position: "relative" }} />
      {!ready && (
        <div style={{ position: "relative", width: "100%", aspectRatio }}>
          {state.status === "loading" && (
            <div style={OVERLAY_STYLE}>Loading demo…</div>
          )}
          {state.status === "error" && (
            <div style={{ ...OVERLAY_STYLE, color: "#f87171" }}>
              {state.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const OVERLAY_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#9ca3af",
  fontSize: 14,
  fontFamily: "system-ui, sans-serif",
  background: "#f4f4f5",
};
