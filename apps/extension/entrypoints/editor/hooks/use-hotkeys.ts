import { useEffect, useRef } from "react";

export interface Hotkey {
  /** `KeyboardEvent.key`, compared case-insensitively ("z", "ArrowLeft", " ", "?"). */
  key: string;
  /** ⌘ on macOS, Ctrl elsewhere. */
  mod?: boolean;
  shift?: boolean;
  /** Also fire while typing in an input/textarea (default: false). */
  allowInInputs?: boolean;
  run: (e: KeyboardEvent) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/** Global keyboard shortcuts. Suspended while the user types in a field. */
export function useHotkeys(hotkeys: Hotkey[]) {
  const ref = useRef(hotkeys);
  ref.current = hotkeys;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const typing = isTypingTarget(e.target);
      const mod = e.metaKey || e.ctrlKey;
      for (const hotkey of ref.current) {
        if (hotkey.key.toLowerCase() !== e.key.toLowerCase()) continue;
        if (Boolean(hotkey.mod) !== mod) continue;
        if (hotkey.shift !== undefined && hotkey.shift !== e.shiftKey) continue;
        if (typing && !hotkey.allowInInputs) continue;
        e.preventDefault();
        hotkey.run(e);
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
