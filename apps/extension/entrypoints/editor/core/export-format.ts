/**
 * The two downloads of the same bundle bytes: a single `.openshowcase` file the player loads
 * as is, or a `.zip` to unpack next to the site's other static files.
 */
export type ExportFormat = "openshowcase" | "zip";

export function exportFileName(title: string, format: ExportFormat): string {
  const slug = title.trim().replace(/\s+/g, "-").toLowerCase() || "demo";
  return `${slug}.${format}`;
}

/** How to embed the downloaded file, assuming it goes under the site's `/demos/`. */
export function embedSnippet(file: string, format: ExportFormat): string {
  const src =
    format === "zip"
      ? `/demos/${file.replace(/\.zip$/, "")}/steps.json`
      : `/demos/${file}`;
  return `import { InteractiveDemo } from "@rustrak/openshowcase-player-react";

<InteractiveDemo src="${src}" />`;
}
