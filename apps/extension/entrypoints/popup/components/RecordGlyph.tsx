import { cn } from "@/lib/utils";

/**
 * Record mark: a dot with a ripple that keeps expanding into the ring, drawn in
 * `currentColor` so it follows the button. Static under `prefers-reduced-motion`.
 */
export function RecordGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn("size-4 shrink-0 overflow-visible", className)}
    >
      <circle
        cx="8"
        cy="8"
        r="6.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <circle
        cx="8"
        cy="8"
        r="6.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="record-ripple"
      />
      <circle
        cx="8"
        cy="8"
        r="3.5"
        fill="currentColor"
        className="record-dot"
      />
    </svg>
  );
}
