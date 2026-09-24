import {
  Download,
  Keyboard,
  Monitor,
  Moon,
  Redo2,
  Sun,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColorSchemePreference } from "@/lib/color-scheme";
import { AboutPopover } from "./AboutPopover";
import { Hint, IconButton, Segmented } from "./controls";

export type EditorMode = "edit" | "preview";

interface TopBarProps {
  title: string;
  onTitleChange: (title: string) => void;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onShowShortcuts: () => void;
  colorScheme: ColorSchemePreference;
  onColorSchemeChange: (preference: ColorSchemePreference) => void;
  onExport: () => void;
  exportDisabled: boolean;
}

const SCHEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

export function TopBar({
  title,
  onTitleChange,
  mode,
  onModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onShowShortcuts,
  colorScheme,
  onColorSchemeChange,
  onExport,
  exportDisabled,
}: TopBarProps) {
  const SchemeIcon = SCHEME_ICON[colorScheme];

  return (
    <header className="relative grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 px-3">
      <div className="flex min-w-0 items-center gap-3">
        <AboutPopover onShowShortcuts={onShowShortcuts} />
        <span aria-hidden className="h-4 w-px shrink-0 bg-border" />
        <TitleInput value={title} onChange={onTitleChange} />
      </div>

      <Segmented
        aria-label="Mode"
        value={mode}
        onChange={onModeChange}
        className="w-48"
        options={[
          { value: "edit", label: "Edit" },
          { value: "preview", label: "Preview" },
        ]}
      />

      <div className="flex items-center justify-end gap-1">
        <IconButton
          label="Undo"
          shortcut="mod+z"
          side="bottom"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 />
        </IconButton>
        <IconButton
          label="Redo"
          shortcut="mod+shift+z"
          side="bottom"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2 />
        </IconButton>
        <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        <IconButton
          label="Keyboard shortcuts"
          shortcut="?"
          side="bottom"
          onClick={onShowShortcuts}
        >
          <Keyboard />
        </IconButton>
        <DropdownMenu>
          <Hint label="Theme" side="bottom">
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Theme"
                  className="text-muted-foreground hover:text-foreground [&_svg]:size-4"
                />
              }
            >
              <SchemeIcon />
            </DropdownMenuTrigger>
          </Hint>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuRadioGroup
              value={colorScheme}
              onValueChange={(value) =>
                onColorSchemeChange(value as ColorSchemePreference)
              }
            >
              <DropdownMenuRadioItem value="system" closeOnClick>
                <Monitor /> System
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light" closeOnClick>
                <Sun /> Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" closeOnClick>
                <Moon /> Dark
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Hint label="Export demo" shortcut="mod+e" side="bottom">
          <Button
            size="sm"
            className="ml-1.5 gap-1.5 px-3"
            onClick={onExport}
            disabled={exportDisabled}
          >
            <Download className="size-3.5" /> Export
          </Button>
        </Hint>
      </div>
    </header>
  );
}

/**
 * Looks like a label until hovered/focused. Enter or blur commits, Escape reverts —
 * edits are local until then so typing doesn't spam the undo history.
 */
function TitleInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft?.trim() && draft !== value) onChange(draft.trim());
    setDraft(null);
  }

  return (
    <input
      aria-label="Demo title"
      value={draft ?? value}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(null);
          requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
        }
      }}
      spellCheck={false}
      className="h-7 w-full max-w-64 min-w-0 truncate rounded-md px-2 text-ui font-medium text-foreground outline-none transition-colors hover:bg-foreground/5 focus:bg-card focus:shadow-card"
    />
  );
}
