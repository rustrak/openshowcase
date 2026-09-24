import type { Demo, Step } from "@rustrak/openshowcase-schema";
import { mount as svelteMount, unmount as svelteUnmount } from "svelte";
import PlayerComponent from "./components/Player.svelte";

export interface PlayerOptions {
  container: HTMLElement;
  demo: Demo;
  /** Prefix prepended to relative asset src (image/video), e.g. the bundle's base URL. */
  assetBaseUrl?: string;
  onStepChange?: (index: number, step: Step) => void;
}

/** The functions `Player.svelte` exports from its instance script. */
interface PlayerInstance {
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  currentIndex: () => number;
  currentStep: () => Step | undefined;
}

/**
 * Thin imperative wrapper around `Player.svelte`, keeping the same construct-then-mount
 * contract the vanilla implementation had — so `player-react`, the exporter, and the
 * extension can all consume this without any changes on their end.
 */
export class Player {
  private readonly options: PlayerOptions;
  // The ambient `*.svelte` module shim can't reflect Player.svelte's specific exports, so
  // `svelteMount` infers a generic record here — narrowed to `PlayerInstance` at call sites.
  private instance: ReturnType<typeof svelteMount> | undefined;

  constructor(options: PlayerOptions) {
    this.options = options;
  }

  private get exports(): PlayerInstance | undefined {
    return this.instance as PlayerInstance | undefined;
  }

  mount(): void {
    this.instance = svelteMount(PlayerComponent, {
      target: this.options.container,
      props: {
        demo: this.options.demo,
        assetBaseUrl: this.options.assetBaseUrl,
        onStepChange: this.options.onStepChange,
      },
    });
  }

  destroy(): void {
    if (this.instance) svelteUnmount(this.instance);
    this.instance = undefined;
  }

  next(): void {
    this.exports?.next();
  }

  prev(): void {
    this.exports?.prev();
  }

  goTo(index: number): void {
    this.exports?.goTo(index);
  }

  get currentIndex(): number {
    return this.exports?.currentIndex() ?? 0;
  }

  get currentStep(): Step | undefined {
    return this.exports?.currentStep();
  }
}
