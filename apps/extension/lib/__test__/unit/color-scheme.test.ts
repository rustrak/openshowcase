import { describe, expect, it } from "vitest";
import {
  parseColorSchemePreference,
  resolveColorScheme,
} from "../../color-scheme";

describe("resolveColorScheme", () => {
  it("follows the OS setting when the preference is 'system'", () => {
    expect(resolveColorScheme("system", true)).toBe("dark");
    expect(resolveColorScheme("system", false)).toBe("light");
  });

  it("ignores the OS setting for an explicit preference", () => {
    expect(resolveColorScheme("light", true)).toBe("light");
    expect(resolveColorScheme("dark", false)).toBe("dark");
  });
});

describe("parseColorSchemePreference", () => {
  it("falls back to 'system' for anything that isn't a known preference", () => {
    expect(parseColorSchemePreference("dark")).toBe("dark");
    expect(parseColorSchemePreference(null)).toBe("system");
    expect(parseColorSchemePreference("purple")).toBe("system");
  });
});
