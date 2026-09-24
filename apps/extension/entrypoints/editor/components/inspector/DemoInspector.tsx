import type {
  Theme,
  ThemeAppearance,
  ThemeWrapper,
} from "@rustrak/openshowcase-schema";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PLAYER_APPEARANCE } from "../../lib/player-appearance";
import { Section } from "../controls";

export function DemoInspector({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  const colors = PLAYER_APPEARANCE[theme.appearance];

  return (
    <div className="divide-y divide-border/60">
      <Section title="Frame">
        <div className="grid grid-cols-2 gap-2">
          {(["none", "browser"] as ThemeWrapper[]).map((wrapper) => (
            <ChoiceCard
              key={wrapper}
              label={wrapper === "none" ? "None" : "Browser"}
              selected={theme.wrapper === wrapper}
              onClick={() => onChange({ ...theme, wrapper })}
            >
              <div
                className="w-full overflow-hidden rounded-[4px] shadow-card"
                style={{ background: colors.frame }}
              >
                {wrapper === "browser" && (
                  <div
                    className="flex h-2.5 items-center gap-0.5 px-1"
                    style={{ background: colors.chromeBg }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-1 rounded-full"
                        style={{ background: colors.dot }}
                      />
                    ))}
                  </div>
                )}
                <div
                  className={wrapper === "browser" ? "h-7" : "h-[38px]"}
                  style={{ background: colors.stage }}
                />
              </div>
            </ChoiceCard>
          ))}
        </div>
      </Section>

      <Section title="Appearance">
        <div className="grid grid-cols-2 gap-2">
          {(["light", "dark"] as ThemeAppearance[]).map((appearance) => {
            const c = PLAYER_APPEARANCE[appearance];
            return (
              <ChoiceCard
                key={appearance}
                label={appearance === "light" ? "Light" : "Dark"}
                selected={theme.appearance === appearance}
                onClick={() => onChange({ ...theme, appearance })}
              >
                <div
                  className="w-full overflow-hidden rounded-[4px] shadow-card"
                  style={{ background: c.frame }}
                >
                  <div
                    className="flex h-2.5 items-center gap-0.5 px-1"
                    style={{ background: c.chromeBg }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-1 rounded-full"
                        style={{ background: c.dot }}
                      />
                    ))}
                  </div>
                  <div className="h-7" style={{ background: c.stage }} />
                </div>
              </ChoiceCard>
            );
          })}
        </div>
        <p className="text-2xs leading-relaxed text-muted-foreground">
          Colors of the frame and player controls — match the site you embed the
          demo in.
        </p>
      </Section>

      <Section title="Playback">
        <Label className="flex cursor-pointer items-start justify-between gap-3 font-normal">
          <span className="flex flex-col gap-0.5">
            <span className="text-ui font-medium">Loop</span>
            <span className="text-2xs leading-relaxed text-muted-foreground">
              Start over automatically after the last step.
            </span>
          </span>
          <Switch
            checked={theme.autoplay}
            onCheckedChange={(autoplay) => onChange({ ...theme, autoplay })}
          />
        </Label>
      </Section>
    </div>
  );
}

function ChoiceCard({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg bg-muted p-2.5 pb-2 text-2xs font-medium transition-[box-shadow,color] active:translate-y-px",
        selected
          ? "text-foreground ring-2 ring-ring dark:ring-primary"
          : "text-muted-foreground hover:text-foreground hover:ring-1 hover:ring-foreground/15",
      )}
    >
      {children}
      {label}
    </button>
  );
}
