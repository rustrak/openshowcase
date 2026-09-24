import { useCallback, useEffect, useState } from "react";
import {
  type ColorScheme,
  type ColorSchemePreference,
  parseColorSchemePreference,
  resolveColorScheme,
} from "@/lib/color-scheme";

const STORAGE_KEY = "openshowcase:color-scheme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ColorSchemePreference {
  try {
    return parseColorSchemePreference(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "system";
  }
}

/**
 * Editor/popup chrome theme: follows the OS by default, can be pinned to light or dark
 * (remembered per browser). Applies the `.dark` class on `<html>` that `theme.css` keys on.
 */
export function useColorScheme() {
  const [preference, setPreferenceState] =
    useState<ColorSchemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia(DARK_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const scheme: ColorScheme = resolveColorScheme(preference, systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", scheme === "dark");
  }, [scheme]);

  const setPreference = useCallback((next: ColorSchemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice just won't persist */
    }
  }, []);

  return { preference, scheme, setPreference };
}
