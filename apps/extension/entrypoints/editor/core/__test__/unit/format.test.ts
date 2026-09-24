import { describe, expect, it } from "vitest";
import { formatClock, formatSeconds } from "../../format";

describe("formatClock", () => {
  it("renders minutes, seconds and hundredths with fixed width", () => {
    expect(formatClock(0)).toBe("00:00.00");
    expect(formatClock(1.234)).toBe("00:01.23");
    expect(formatClock(75.5)).toBe("01:15.50");
  });

  it("never shows a negative time", () => {
    expect(formatClock(-0.01)).toBe("00:00.00");
  });

  it("does not round 59.999s up to an invalid 60 seconds", () => {
    expect(formatClock(59.999)).toBe("00:59.99");
  });
});

describe("formatSeconds", () => {
  it("renders a short duration with one decimal", () => {
    expect(formatSeconds(3.24)).toBe("3.2s");
    expect(formatSeconds(12)).toBe("12.0s");
  });
});
