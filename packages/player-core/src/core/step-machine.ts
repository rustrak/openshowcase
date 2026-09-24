export interface StepMachineCallbacks {
  onChange: (index: number) => void;
  /** Reached the last step with autoplay off — caller should dismiss overlays and settle. */
  onFinish: () => void;
}

/**
 * DOM-free navigation state for the step list: current index, next/prev/goTo, and the
 * autoplay-wraps-vs-finish decision at the end. Rendering is the caller's job — this only
 * decides which index should be current and tells the caller via callbacks.
 */
export class StepMachine {
  private index = 0;

  constructor(
    private readonly stepCount: number,
    private readonly autoplay: boolean,
    private readonly callbacks: StepMachineCallbacks,
  ) {}

  get currentIndex(): number {
    return this.index;
  }

  next(): void {
    if (this.index < this.stepCount - 1) {
      this.index += 1;
      this.callbacks.onChange(this.index);
      return;
    }
    if (this.autoplay) {
      this.goTo(0);
      return;
    }
    this.callbacks.onFinish();
  }

  prev(): void {
    if (this.index > 0) {
      this.index -= 1;
      this.callbacks.onChange(this.index);
    }
  }

  goTo(index: number): void {
    if (index >= 0 && index < this.stepCount) {
      this.index = index;
      this.callbacks.onChange(index);
    }
  }
}
