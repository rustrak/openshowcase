import type { Theme } from "@rustrak/openshowcase-schema";
import { Segmented } from "../controls";
import { DemoInspector } from "./DemoInspector";
import { StepInspector, type StepInspectorProps } from "./StepInspector";

export type InspectorTab = "step" | "demo";

/** Right panel: the selected step's properties, or demo-wide settings. */
export function Inspector({
  tab,
  onTabChange,
  stepProps,
  theme,
  onThemeChange,
}: {
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  stepProps: StepInspectorProps | undefined;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}) {
  return (
    <aside
      aria-label="Inspector"
      className="flex w-[304px] shrink-0 flex-col overflow-hidden rounded-xl bg-card shadow-card"
    >
      <div className="border-b border-border/60 p-2">
        <Segmented
          aria-label="Inspector"
          value={tab}
          onChange={onTabChange}
          options={[
            { value: "step", label: "Step" },
            { value: "demo", label: "Demo" },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "demo" ? (
          <DemoInspector theme={theme} onChange={onThemeChange} />
        ) : stepProps ? (
          <StepInspector key={stepProps.step.id} {...stepProps} />
        ) : (
          <p className="p-4 text-xs text-muted-foreground">
            Select a step in the sequence.
          </p>
        )}
      </div>
    </aside>
  );
}
