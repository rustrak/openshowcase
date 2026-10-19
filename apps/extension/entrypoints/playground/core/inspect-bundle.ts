import { readStoredZip } from "@rustrak/openshowcase-player-core";
import { parseDemo } from "@rustrak/openshowcase-schema";
import { type BundleFile, summarizeBundle } from "./bundle-summary";

export type InspectedBundle =
  | {
      ok: true;
      title: string;
      photoSteps: number;
      videoSteps: number;
      /** Length of the bundled video, 0 without one. */
      videoSec: number;
      width: number;
      height: number;
      /** The demo draws a browser frame around itself. */
      browserChrome: boolean;
      summary: ReturnType<typeof summarizeBundle>;
    }
  | { ok: false; error: string };

/**
 * Reads a bundle with the player's own streaming reader, so a file that passes here is one
 * the player can load, and a file that doesn't gets the player's reason.
 */
export async function inspectBundle(file: Blob): Promise<InspectedBundle> {
  try {
    const files: BundleFile[] = [];
    let manifest: string | undefined;
    for await (const entry of readStoredZip(file.stream())) {
      const size = entry.parts.reduce((sum, part) => sum + part.byteLength, 0);
      files.push({ name: entry.name, size });
      if (entry.name === "steps.json")
        manifest = await new Blob(entry.parts).text();
    }
    if (manifest === undefined)
      throw new Error("Not an OpenShowcase bundle: it has no steps.json");

    const demo = parseDemo(JSON.parse(manifest));
    const firstPhoto = demo.steps.find((step) => step.type === "photo");
    return {
      ok: true,
      title: demo.title,
      photoSteps: demo.steps.filter((step) => step.type === "photo").length,
      videoSteps: demo.steps.filter((step) => step.type === "video").length,
      videoSec: demo.video?.durationSec ?? 0,
      width: demo.video?.width ?? firstPhoto?.image.width ?? 0,
      height: demo.video?.height ?? firstPhoto?.image.height ?? 0,
      browserChrome: demo.theme.wrapper === "browser",
      summary: summarizeBundle(files),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
