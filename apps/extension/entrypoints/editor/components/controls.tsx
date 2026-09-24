import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Renders a shortcut like "mod+shift+z" as ⌘⇧Z (macOS) or Ctrl+Shift+Z; "left/right"
 * renders alternatives side by side.
 */
export function Shortcut({ keys }: { keys: string }) {
  const parts = keys.split(/[+/]/).map((part) => {
    switch (part) {
      case "mod":
        return IS_MAC ? "⌘" : "Ctrl";
      case "shift":
        return "⇧";
      case "alt":
        return IS_MAC ? "⌥" : "Alt";
      case "space":
        return "Space";
      case "backspace":
        return "⌫";
      case "esc":
        return "Esc";
      case "left":
        return "←";
      case "right":
        return "→";
      default:
        return part.toUpperCase();
    }
  });
  return (
    <span className="inline-flex items-center gap-0.5">
      {parts.map((part) => (
        <Kbd
          key={part}
          className="h-[18px] min-w-[18px] px-1 font-sans text-2xs"
        >
          {part}
        </Kbd>
      ))}
    </span>
  );
}

/** Tooltip with an optional shortcut chip — every icon-only control gets one. */
export function Hint({
  label,
  shortcut,
  side = "top",
  children,
}: {
  label: string;
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} className="data-[instant]:duration-0">
        {label}
        {shortcut && <Shortcut keys={shortcut} />}
      </TooltipContent>
    </Tooltip>
  );
}

/** Icon button with a tooltip. Prefer this over a bare icon-only `Button`. */
export function IconButton({
  label,
  shortcut,
  side,
  className,
  active,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string;
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  active?: boolean;
}) {
  return (
    <Hint label={label} shortcut={shortcut} side={side}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "text-muted-foreground hover:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground [&_svg]:size-4",
          className,
        )}
        {...props}
      />
    </Hint>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when `label` is an icon. */
  title?: string;
}

/**
 * Segmented control with a thumb that slides between options (ease-in-out, 200ms — it's
 * something already on screen that moves). Keyboard: arrows move the selection.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number }>();

  useLayoutEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>(
      `[data-value="${CSS.escape(value)}"]`,
    );
    if (!list || !active) return;
    const update = () =>
      setThumb({ left: active.offsetLeft, width: active.offsetWidth });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => observer.disconnect();
  }, [value]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const index = options.findIndex((o) => o.value === value);
    const nextIndex =
      (index + (e.key === "ArrowRight" ? 1 : -1) + options.length) %
      options.length;
    const next = options[nextIndex];
    if (!next) return;
    onChange(next.value);
    listRef.current
      ?.querySelectorAll<HTMLElement>('[role="radio"]')
      [nextIndex]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex rounded-lg bg-muted p-0.5",
        size === "sm" ? "h-7" : "h-8",
        className,
      )}
    >
      {thumb && (
        <span
          aria-hidden
          className="absolute inset-y-0.5 left-0 rounded-md bg-background shadow-card transition-[translate,width] duration-200 ease-(--ease-in-out-strong) motion-reduce:transition-none dark:bg-secondary"
          style={{ width: thumb.width, translate: `${thumb.left}px 0` }}
        />
      )}
      {options.map((option) => {
        const checked = option.value === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a styled segmented control; native radios can't host the sliding thumb
          <button
            key={option.value}
            type="button"
            role="radio"
            data-value={option.value}
            aria-checked={checked}
            aria-label={option.title}
            title={option.title}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 [&_svg]:size-3.5 [&_svg]:shrink-0",
              size === "sm" ? "text-2xs" : "text-xs",
              checked
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A titled group in the inspector. */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3 px-4 py-4", className)}>
      <header className="flex h-5 items-center justify-between gap-2">
        <h3 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Label-on-the-left row, control on the right. */
export function Row({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-8 items-center gap-3", className)}>
      <span className="w-20 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-end">
        {children}
      </div>
    </div>
  );
}

/** Slider with its value readout; `onCommitStart` lets callers open a coalesced edit. */
export function ValueSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-2xs text-foreground tabular-nums">
          {format(value)}
        </span>
      </div>
      <Slider
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) =>
          onChange(Array.isArray(next) ? (next[0] ?? value) : (next as number))
        }
      />
    </div>
  );
}

/** Preset hotspot colors. Content data for the exported demo (like `defaultHotspotStyle`),
 * not UI theme colors — so literal hex is correct here. */
const SWATCHES = [
  "#C5F11E",
  "#2142E7",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#EA580C",
  "#16A34A",
  "#0891B2",
  "#111111",
  "#FFFFFF",
];

const HEX = /^#?([0-9a-f]{6})$/i;

/** Hex color: a swatch that opens presets + custom picker, and an editable hex field. */
export function ColorField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function commitDraft() {
    if (draft === null) return;
    const match = HEX.exec(draft.trim());
    if (match) onChange(`#${match[1]?.toUpperCase()}`);
    setDraft(null);
  }

  return (
    <div className="flex h-8 w-full items-center gap-2 rounded-md bg-muted pr-2 pl-1 transition-colors focus-within:ring-2 focus-within:ring-ring/50 hover:bg-accent">
      <Popover>
        <PopoverTrigger
          aria-label={`${label}: pick a color`}
          className="size-6 shrink-0 rounded-[5px] outline-1 -outline-offset-1 outline-foreground/15 transition-transform active:scale-95"
          style={{ background: value }}
        />
        <PopoverContent
          align="start"
          className="w-auto gap-3 rounded-xl p-3 shadow-float ring-0"
        >
          <div className="grid grid-cols-5 gap-2">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                onClick={() => onChange(swatch)}
                className={cn(
                  "size-7 rounded-full outline-1 -outline-offset-1 outline-foreground/15 transition-transform hover:scale-110 active:scale-95",
                  swatch.toUpperCase() === value.toUpperCase() &&
                    "ring-2 ring-foreground ring-offset-2 ring-offset-popover",
                )}
                style={{ background: swatch }}
              />
            ))}
          </div>
          <label className="flex h-8 cursor-pointer items-center justify-between gap-2 rounded-md bg-muted px-2.5 text-xs text-muted-foreground hover:text-foreground">
            Custom…
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="size-5 cursor-pointer appearance-none border-0 bg-transparent p-0"
            />
          </label>
        </PopoverContent>
      </Popover>
      <input
        aria-label={`${label} hex`}
        value={draft ?? value.toUpperCase()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitDraft();
          if (e.key === "Escape") setDraft(null);
        }}
        spellCheck={false}
        className="w-full min-w-0 bg-transparent font-mono text-xs text-foreground uppercase outline-none"
      />
    </div>
  );
}
