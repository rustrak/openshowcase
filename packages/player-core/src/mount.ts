import type { Demo, Step } from "@rustrak/openshowcase-schema";
import { mount as mountView } from "./dom/h";
import { createPlayerView, type PlayerView } from "./ui/Player/Player";

export interface PlayerOptions {
  container: HTMLElement;
  demo: Demo;
  /** Prefix prepended to relative asset src (image/video), e.g. the bundle's base URL. */
  assetBaseUrl?: string;
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
    this.options = options;
  }

  mount(): void {
    const { container, demo, assetBaseUrl, onStepChange } = this.options;
    let view!: PlayerView;
    this.unmount = mountView(() => {
      view = createPlayerView({ demo, assetBaseUrl, onStepChange });
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

  get currentIndex(): number {
    return this.view?.currentIndex() ?? 0;
  }

  get currentStep(): Step | undefined {
    return this.view?.currentStep();
  }
}
