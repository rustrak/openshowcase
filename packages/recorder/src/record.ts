import { open } from "node:fs/promises";
import { automation, launch } from "./browser";
import { installCursor } from "./cursor";
import { describeStep, type Flow } from "./flow";
import { RECORDING_PACE, runFlow } from "./run-flow";

/** Base64 chunks pulled from the service worker: well under CDP's message size limit. */
const CHUNK_BYTES = 8 * 1024 * 1024;

export interface RecordOptions {
  profileDir: string;
  extensionDir: string;
  headed: boolean;
  out: string;
  log?: (line: string) => void;
}

/**
 * Records the flow through the extension's own capture pipeline (tab video + click markers,
 * exactly as a human recording) and writes it as an `.osrec` file.
 */
export async function record(
  flow: Flow,
  options: RecordOptions,
): Promise<{
  out: string;
  bytes: number;
  /** Clicks that stop the demo on a hotspot. */
  hotspots: number;
  /** Recording length once the waits are cut (the video steps can only play less). */
  videoSec: number;
  cutSec: number;
}> {
  const log = options.log ?? (() => {});
  const { context, worker, close } = await launch({
    ...options,
    headless: !options.headed,
    viewport: flow.viewport,
  });
  try {
    await installCursor(context);
    const page = context.pages()[0] ?? (await context.newPage());
    page.setDefaultTimeout(10_000);
    await page.goto(flow.url);
    // The extension records the active tab.
    await page.bringToFront();

    const recordingId = await automation(worker, "start");
    const startedAt = Date.now();
    log(`Recording ${flow.url}`);
    const direction = await runFlow(
      page,
      flow.steps,
      RECORDING_PACE,
      (i, step) => log(`  ${i + 1}/${flow.steps.length} ${describeStep(step)}`),
    );
    await automation(worker, "stop", recordingId);
    const recordedSec = (Date.now() - startedAt) / 1000;
    const cutSec =
      direction.cuts.reduce((sum, c) => sum + c.end - c.start, 0) / 1000;

    const bytes = await automation(
      worker,
      "exportFile",
      recordingId,
      direction,
    );
    const file = await open(options.out, "w");
    try {
      for (let offset = 0; offset < bytes; offset += CHUNK_BYTES) {
        const chunk = await automation(
          worker,
          "readChunk",
          offset,
          CHUNK_BYTES,
        );
        await file.write(Buffer.from(chunk, "base64"));
      }
    } finally {
      await file.close();
    }
    return {
      out: options.out,
      bytes,
      hotspots: flow.steps.filter(
        (s) => s.action === "click" && s.hotspot !== false,
      ).length,
      videoSec: recordedSec - cutSec,
      cutSec,
    };
  } finally {
    await close();
  }
}
