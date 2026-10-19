import type { Demo, Step } from "@rustrak/openshowcase-schema";
import type { AssetResolver } from "./core/load-demo";
import type { HotspotStyle } from "./core/photo-overlay";
import { mount as mountView } from "./dom/h";
import {
  createPlayerView,
  type PlayerAppearance,
  type PlayerView,
} from "./ui/Player/Player";

export interface PlayerOptions {
  container: HTMLElement;
  demo: Demo;
  /** Prefix prepended to relative asset src (image/video), e.g. the bundle's base URL. */
  assetBaseUrl?: string;
  /** Serves asset URLs instead of `assetBaseUrl`: pass `loadDemo()`'s for a bundle. */
  resolveAsset?: AssetResolver;
  /** Overrides every step's hotspot/tooltip colors, whatever they were recorded with. */
  hotspotStyle?: HotspotStyle;
  /** Overrides the demo's light/dark appearance, e.g. to follow the host page's mode, or
   * `"auto"` to follow the viewer's `prefers-color-scheme`. */
  appearance?: PlayerAppearance;
  onStepChange?: (index: number, step: Step) => void;
}

/**
 * The player's public API: construct, then `mount()` into the container. `player-react`,
 * `player-vue`, the exporter and the extension all consume it through this class.
 */
export class Player {
  private readonly options: PlayerOptions;
  private view: PlayerView | undefined;
  private unmount: (() => void) | undefined;

  constructor(options: PlayerOptions) {
    // a copy: the setters below update it, and it's the caller's object
    this.options = { ...options };
  }

  mount(): void {
    const {
      container,
      demo,
      assetBaseUrl,
      resolveAsset,
      hotspotStyle,
      appearance,
      onStepChange,
    } = this.options;
    let view!: PlayerView;
    this.unmount = mountView(() => {
      view = createPlayerView({
        demo,
        assetBaseUrl,
        resolveAsset,
        hotspotStyle,
        appearance,
        onStepChange,
      });
      return view.element;
    }, container);
    this.view = view;
    view.start();
  }

  destroy(): void {
    this.view?.stop();
    this.unmount?.();
    this.view = undefined;
    this.unmount = undefined;
  }

  next(): void {
    this.view?.next();
  }

  prev(): void {
    this.view?.prev();
  }

  goTo(index: number): void {
    this.view?.goTo(index);
  }

  /** Switches light/dark without remounting (`undefined`: back to the demo's own). */
  setAppearance(appearance: PlayerAppearance | undefined): void {
    this.options.appearance = appearance;
    this.view?.setAppearance(appearance);
  }

  /** Swaps the hotspot/tooltip color override without remounting. */
  setHotspotStyle(style: HotspotStyle | undefined): void {
    this.options.hotspotStyle = style;
    this.view?.setHotspotStyle(style);
  }

  get currentIndex(): number {
    return this.view?.currentIndex() ?? 0;
  }

  get currentStep(): Step | undefined {
    return this.view?.currentStep();
  }
}
