import type { MarkerRecord, RecordingRecord } from "@/lib/db";
import { cueClicks, type Direction } from "@/lib/direction";
import { fileFromRecords, packRecording } from "@/lib/recording-file";
import { recordingSession } from "@/lib/recording-storage";

export interface AutomationDeps {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  getRecording: (id: string) => Promise<RecordingRecord | undefined>;
  getMarkers: (id: string) => Promise<MarkerRecord[]>;
  sleep?: (ms: number) => Promise<void>;
}

const POLL_MS = 100;
/** Stopping remuxes the whole video (offscreen/lib/remux.ts): minutes of 60fps take a while. */
const SAVE_TIMEOUT_MS = 120_000;

/**
 * What the recorder CLI calls in the service worker (over CDP) to record a tab it drives:
 * start, stop once saved, then pull the recording out as an `.osrec` file in base64 chunks
 * (a single CDP message can't carry a long recording).
 */
export function createAutomation(deps: AutomationDeps) {
  const sleep =
    deps.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let exported: Blob | undefined;

  return {
    /** Records the active tab; resolves with the recording's id once capture runs. */
    async start(): Promise<string> {
      await deps.startRecording();
      const state = await recordingSession.getValue();
      if (!state.active || !state.recordingId)
        throw new Error(
          "The recording didn't start (see the extension's service worker console)",
        );
      return state.recordingId;
    },

    async stop(recordingId: string): Promise<void> {
      await deps.stopRecording();
      for (let waited = 0; waited <= SAVE_TIMEOUT_MS; waited += POLL_MS) {
        const status = (await deps.getRecording(recordingId))?.status;
        if (status === "complete") return;
        if (status === "interrupted")
          throw new Error("The recording was interrupted");
        await sleep(POLL_MS);
      }
      throw new Error("The recording was never saved");
    },

    /** Packs the recording with the flow's direction; resolves with its size. */
    async exportFile(recordingId: string, direction?: Direction) {
      const [record, markers] = await Promise.all([
        deps.getRecording(recordingId),
        deps.getMarkers(recordingId),
      ]);
      if (!record) throw new Error(`No recording ${recordingId}`);
      const { clicks = [], ...recorded } = direction ?? {};
      exported = packRecording(
        fileFromRecords(
          {
            ...record,
            ...(direction && {
              direction: { cuts: [], zooms: [], ...recorded },
            }),
          },
          cueClicks(markers, clicks),
        ),
      );
      return exported.size;
    },

    async readChunk(offset: number, length: number): Promise<string> {
      if (!exported) throw new Error("Call exportFile before readChunk");
      const bytes = new Uint8Array(
        await exported.slice(offset, offset + length).arrayBuffer(),
      );
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    },
  };
}

export type Automation = ReturnType<typeof createAutomation>;
