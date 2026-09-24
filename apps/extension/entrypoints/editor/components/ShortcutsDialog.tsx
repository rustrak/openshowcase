import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shortcut } from "./controls";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "General",
    items: [
      ["Undo", "mod+z"],
      ["Redo", "mod+shift+z"],
      ["Toggle preview", "p"],
      ["Export", "mod+e"],
      ["Show shortcuts", "?"],
    ],
  },
  {
    title: "Steps",
    items: [
      ["Previous / next step", "left/right"],
      ["Duplicate step", "mod+d"],
      ["Delete step", "backspace"],
    ],
  },
  {
    title: "Stage",
    items: [
      ["Hotspot tool", "h"],
      ["Zoom tool", "z"],
      ["Leave tool / preview", "esc"],
    ],
  },
  {
    title: "Video clips",
    items: [
      ["Play / pause", "space"],
      ["Split at playhead", "s"],
      ["Freeze frame as photo", "f"],
    ],
  },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl p-6 sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base">Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          {GROUPS.map((group) => (
            <section key={group.title} className="flex flex-col gap-1.5">
              <h3 className="mb-1 text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.title}
              </h3>
              {group.items.map(([label, keys]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span>{label}</span>
                  <Shortcut keys={keys} />
                </div>
              ))}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
