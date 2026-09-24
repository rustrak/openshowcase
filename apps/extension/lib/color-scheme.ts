export type ColorSchemePreference = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

const PREFERENCES: readonly string[] = ["system", "light", "dark"];

export function parseColorSchemePreference(
  raw: string | null,
): ColorSchemePreference {
  return raw && PREFERENCES.includes(raw)
    ? (raw as ColorSchemePreference)
    : "system";
}

export function resolveColorScheme(
  preference: ColorSchemePreference,
  systemPrefersDark: boolean,
): ColorScheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}
