import { TriangleAlert } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { Row, Section } from "../../editor/components/controls";
import type { InspectedBundle } from "../core/inspect-bundle";

/** What's in the file: its size, what the bytes go to, and the demo it holds. */
export function BundlePanel({
  name,
  inspected,
}: {
  name: string;
  inspected: InspectedBundle | { ok: false; error: string };
}) {
  return (
    <aside
      aria-label="File details"
      className="flex w-[304px] shrink-0 flex-col overflow-y-auto rounded-xl bg-card shadow-card"
    >
      <Section title="File">
        <p className="truncate font-mono text-xs" title={name}>
          {name}
        </p>
        {inspected.ok && (
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {formatBytes(inspected.summary.total)}
          </p>
        )}
      </Section>

      {inspected.ok ? (
        <>
          <Section title="Contents" className="border-t border-border/60">
            <ul className="flex flex-col gap-2.5">
              {inspected.summary.parts.map((part) => (
                <li key={part.kind} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span>
                      {part.label}
                      {part.kind === "photos" && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {part.files}
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatBytes(part.size)}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.max(1, (part.size / inspected.summary.total) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Demo" className="border-t border-border/60">
            <div className="flex flex-col">
              <Row label="Title">
                <span className="truncate text-xs">{inspected.title}</span>
              </Row>
              <Row label="Steps">
                <span className="text-xs tabular-nums">
                  {inspected.photoSteps} photos · {inspected.videoSteps} clips
                </span>
              </Row>
              {inspected.videoSec > 0 && (
                <Row label="Video">
                  <span className="text-xs tabular-nums">
                    {inspected.videoSec.toFixed(1)} s
                  </span>
                </Row>
              )}
              <Row label="Resolution">
                <span className="text-xs tabular-nums">
                  {inspected.width} × {inspected.height}
                </span>
              </Row>
            </div>
          </Section>
        </>
      ) : (
        <Section
          title="Can't play this file"
          className="border-t border-border/60"
        >
          <p className="flex items-start gap-2 rounded-lg bg-muted px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            {inspected.error}
          </p>
        </Section>
      )}
    </aside>
  );
}
