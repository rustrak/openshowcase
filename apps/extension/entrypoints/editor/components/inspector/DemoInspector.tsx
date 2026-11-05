import {
  type Backdrop,
  type BackdropFill,
  defaultBackdrop,
  type Theme,
  type ThemeAppearance,
  type ThemeWrapper,
} from "@rustrak/openshowcase-schema";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  backdropBackground,
  PLAYER_APPEARANCE,
  TRAFFIC_LIGHTS,
} from "../../lib/player-appearance";
import { ColorField, Section, ValueSlider } from "../controls";

const WRAPPERS: { value: ThemeWrapper; label: string }[] = [
  { value: "none", label: "None" },
  { value: "browser", label: "Browser" },
  { value: "bezel", label: "Bezel" },
];

const FILLS: { value: BackdropFill; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "soft", label: "Soft" },
  { value: "glow", label: "Glow" },
];

export function DemoInspector({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme, coalesceKey?: string) => void;
}) {
  const colors = PLAYER_APPEARANCE[theme.appearance];
  const { backdrop } = theme;
  const patchBackdrop = (patch: Partial<Backdrop>, coalesceKey?: string) =>
    onChange(
      {
        ...theme,
        backdrop: { ...defaultBackdrop, ...backdrop, ...patch },
      },
      coalesceKey,
    );

  return (
    <div className="divide-y divide-border/60">
      <Section title="Frame">
        <div className="grid grid-cols-3 gap-2">
          {WRAPPERS.map(({ value: wrapper, label }) => (
            <ChoiceCard
              key={wrapper}
              label={label}
              selected={theme.wrapper === wrapper}
              onClick={() => onChange({ ...theme, wrapper })}
            >
              <div
                className={cn(
                  "w-full rounded-[6px]",
                  wrapper === "bezel" && "bg-foreground/15 p-[3px]",
                )}
              >
                <div
                  className="w-full overflow-hidden rounded-[4px] shadow-card"
                  style={{ background: colors.frame }}
                >
                  {wrapper !== "none" && <MiniBar colors={colors} />}
                  <div
                    className={wrapper === "none" ? "h-[38px]" : "h-7"}
                    style={{ background: colors.stage }}
                  />
                </div>
              </div>
            </ChoiceCard>
          ))}
        </div>
      </Section>

      <Section
        title="Backdrop"
        action={
          <Switch
            aria-label="Backdrop"
            checked={backdrop != null}
            onCheckedChange={(on) =>
              onChange({
                ...theme,
                backdrop: on ? { ...defaultBackdrop } : undefined,
              })
            }
          />
        }
      >
        {backdrop ? (
          <>
            <ColorField
              label="Backdrop color"
              value={backdrop.color}
              onChange={(color) => patchBackdrop({ color }, "backdrop-color")}
            />
            <div className="grid grid-cols-3 gap-2">
              {FILLS.map(({ value: fill, label }) => (
                <ChoiceCard
                  key={fill}
                  label={label}
                  selected={(backdrop.fill ?? defaultBackdrop.fill) === fill}
                  onClick={() => patchBackdrop({ fill })}
                >
                  <div
                    className="h-[38px] w-full rounded-[4px] shadow-card"
                    style={{
                      background: backdropBackground({ ...backdrop, fill }),
                    }}
                  />
                </ChoiceCard>
              ))}
            </div>
            <ValueSlider
              label="Margin"
              value={backdrop.padding ?? defaultBackdrop.padding}
              min={0}
              max={15}
              step={0.5}
              format={(value) => `${value}%`}
              onChange={(padding) =>
                patchBackdrop({ padding }, "backdrop-padding")
              }
            />
          </>
        ) : (
          <p className="text-2xs leading-relaxed text-muted-foreground">
            A colored surface behind the frame, with the demo centered on it.
          </p>
        )}
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
                  <MiniBar colors={c} />
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

function MiniBar({
  colors,
}: {
  colors: (typeof PLAYER_APPEARANCE)[ThemeAppearance];
}) {
  return (
    <div
      className="flex h-2.5 items-center gap-0.5 px-1"
      style={{ background: colors.chromeBg }}
    >
      {TRAFFIC_LIGHTS.map((light) => (
        <span
          key={light}
          className="size-1 rounded-full"
          style={{ background: light }}
        />
      ))}
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
