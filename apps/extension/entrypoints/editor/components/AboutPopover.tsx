import { ArrowUpRight, Code2, Keyboard } from "lucide-react";
import { RUSTRAK_URL } from "@/components/brand/made-by-rustrak";
import { OpenShowcaseWordmark } from "@/components/brand/openshowcase-wordmark";
import { RustrakWordmark } from "@/components/brand/rustrak-wordmark";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Shortcut } from "./controls";

const REPO_URL = "https://github.com/rustrak/openshowcase";

/** The OpenShowcase wordmark in the top bar; clicking it tells you what this is and who makes it. */
export function AboutPopover({
  onShowShortcuts,
}: {
  onShowShortcuts: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="About OpenShowcase"
        className="-mx-1 flex h-8 items-center rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <OpenShowcaseWordmark className="h-[15px] w-auto shrink-0 text-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-80 gap-0 overflow-hidden rounded-2xl p-0 shadow-float ring-0"
      >
        <div className="relative overflow-hidden bg-brand-ink px-5 pt-5 pb-4 text-white">
          {/* the brand lime, as light bleeding in from a corner */}
          <div
            aria-hidden
            className="absolute -top-16 -right-10 size-44 rounded-full bg-primary/40 blur-3xl"
          />
          <OpenShowcaseWordmark still className="relative h-5 w-auto" />
          <p className="relative mt-3 text-xs leading-relaxed text-white/65">
            Record a flow, edit it, ship an interactive demo. Open source,
            self-hosted, no tracking.
          </p>
        </div>

        <nav className="flex flex-col p-1.5">
          <LinkRow href={REPO_URL} icon={<Code2 />} label="Source code" />
          <button
            type="button"
            onClick={onShowShortcuts}
            className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs transition-colors hover:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground"
          >
            <Keyboard /> Keyboard shortcuts
            <span className="ml-auto">
              <Shortcut keys="?" />
            </span>
          </button>
        </nav>

        <a
          href={RUSTRAK_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3.5 transition-colors hover:bg-muted/60"
        >
          <span className="flex flex-col gap-1.5">
            <span className="text-2xs text-muted-foreground">
              From the makers of
            </span>
            <RustrakWordmark className="h-[14px] w-auto self-start text-foreground" />
            <span className="text-2xs text-muted-foreground">
              Self-hosted error tracking, Sentry-compatible.
            </span>
          </span>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </PopoverContent>
    </Popover>
  );
}

function LinkRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs transition-colors hover:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground"
    >
      {icon}
      {label}
      <ArrowUpRight className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
