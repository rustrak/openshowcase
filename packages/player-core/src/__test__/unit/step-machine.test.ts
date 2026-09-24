import { describe, expect, it, vi } from "vitest";
import { StepMachine } from "../../core/step-machine";

function createMachine(stepCount: number, autoplay: boolean) {
  const onChange = vi.fn();
  const onFinish = vi.fn();
  const machine = new StepMachine(stepCount, autoplay, { onChange, onFinish });
  return { machine, onChange, onFinish };
}

describe("StepMachine", () => {
  it("starts at index 0", () => {
    const { machine } = createMachine(3, false);
    expect(machine.currentIndex).toBe(0);
  });

  it("advances one step at a time and reports the new index", () => {
    const { machine, onChange } = createMachine(3, false);
    machine.next();
    expect(machine.currentIndex).toBe(1);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("calls onFinish on the last step when autoplay is off", () => {
    const { machine, onChange, onFinish } = createMachine(2, false);
    machine.next(); // -> index 1 (last)
    machine.next(); // last step, no autoplay
    expect(machine.currentIndex).toBe(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("wraps back to index 0 on the last step when autoplay is on", () => {
    const { machine, onChange, onFinish } = createMachine(2, true);
    machine.next(); // -> index 1 (last)
    machine.next(); // autoplay wraps
    expect(machine.currentIndex).toBe(0);
    expect(onFinish).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("does nothing when going prev from index 0", () => {
    const { machine, onChange } = createMachine(3, false);
    machine.prev();
    expect(machine.currentIndex).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("goes back one step with prev", () => {
    const { machine, onChange } = createMachine(3, false);
    machine.next();
    machine.prev();
    expect(machine.currentIndex).toBe(0);
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("ignores out-of-range goTo calls", () => {
    const { machine, onChange } = createMachine(3, false);
    machine.goTo(-1);
    machine.goTo(3);
    expect(machine.currentIndex).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("jumps directly to a valid index with goTo", () => {
    const { machine, onChange } = createMachine(3, false);
    machine.goTo(2);
    expect(machine.currentIndex).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
