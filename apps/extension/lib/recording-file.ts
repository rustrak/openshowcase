import type {
  MarkerRecord,
  RecordingDirection,
  RecordingRecord,
} from "@/lib/db";

/**
 * A raw recording as a single file (`.osrec`): what a recording made somewhere else (the
 * recorder CLI's automated Chromium) hands to this extension's editor. Layout:
 * `OSREC` + version byte, header length (uint32 LE), header JSON (UTF-8), video bytes.
 */
export const RECORDING_FILE_EXTENSION = ".osrec";

const MAGIC = "OSREC";
const VERSION = 1;
const PREFIX_BYTES = MAGIC.length + 1 + 4;

export interface RecordingFile {
  recording: {
    createdAt: number;
    startedAt: number;
    mimeType: string;
    durationSec: number;
    width: number;
    height: number;
  };
  markers: Omit<MarkerRecord, "id" | "recordingId">[];
  /** Editing the recorder CLI's flow asked for. */
  direction?: RecordingDirection;
  video: Blob;
}

export function packRecording(file: RecordingFile): Blob {
  const header = new TextEncoder().encode(
    JSON.stringify({
      recording: file.recording,
      markers: file.markers,
      direction: file.direction,
    }),
  );
  const prefix = new Uint8Array(PREFIX_BYTES);
  prefix.set(new TextEncoder().encode(MAGIC));
  prefix[MAGIC.length] = VERSION;
  new DataView(prefix.buffer).setUint32(MAGIC.length + 1, header.length, true);
  return new Blob([prefix, header, file.video]);
}

export async function unpackRecording(blob: Blob): Promise<RecordingFile> {
  const prefix = new Uint8Array(
    await blob.slice(0, PREFIX_BYTES).arrayBuffer(),
  );
  if (
    prefix.length < PREFIX_BYTES ||
    new TextDecoder().decode(prefix.slice(0, MAGIC.length)) !== MAGIC
  )
    throw new Error("This file is not an OpenShowcase recording");
  if (prefix[MAGIC.length] !== VERSION)
    throw new Error(
      "This recording was made by a newer version of OpenShowcase. Update the extension.",
    );

  const headerLength = new DataView(prefix.buffer).getUint32(
    MAGIC.length + 1,
    true,
  );
  const headerEnd = PREFIX_BYTES + headerLength;
  const damaged = () => new Error("This recording file is damaged");
  if (blob.size < headerEnd) throw damaged();

  let header: Pick<RecordingFile, "recording" | "markers" | "direction">;
  try {
    header = JSON.parse(await blob.slice(PREFIX_BYTES, headerEnd).text());
  } catch {
    throw damaged();
  }
  const { recording, markers, direction } = header ?? {};
  const numbers = [
    recording?.createdAt,
    recording?.startedAt,
    recording?.durationSec,
    recording?.width,
    recording?.height,
  ];
  if (
    !numbers.every((n) => typeof n === "number" && Number.isFinite(n)) ||
    typeof recording.mimeType !== "string" ||
    !Array.isArray(markers) ||
    !markers.every(
      (m) => typeof m?.capturedAt === "number" && typeof m.pageUrl === "string",
    ) ||
    (direction != null &&
      !(
        Array.isArray(direction.cuts) &&
        Array.isArray(direction.zooms) &&
        (direction.title == null || typeof direction.title === "string")
      ))
  )
    throw damaged();

  const video = blob.slice(headerEnd, blob.size, recording.mimeType);
  if (video.size === 0) throw new Error("This recording has no video");
  return { recording, markers, ...(direction && { direction }), video };
}

/** A finished recording from the database, as a file. */
export function fileFromRecords(
  record: RecordingRecord,
  markers: MarkerRecord[],
): RecordingFile {
  const { videoBlob, startedAt, mimeType, durationSec, width, height } = record;
  if (
    record.status !== "complete" ||
    !videoBlob ||
    startedAt == null ||
    mimeType == null ||
    durationSec == null ||
    width == null ||
    height == null
  )
    throw new Error("The recording is not finished");
  return {
    recording: {
      createdAt: record.createdAt,
      startedAt,
      mimeType,
      durationSec,
      width,
      height,
    },
    markers: markers.map(({ id: _id, recordingId: _rid, ...marker }) => marker),
    ...(record.direction && { direction: record.direction }),
    video: videoBlob,
  };
}

/** The database records of an imported file. It wasn't recorded from any tab here. */
export function recordsFromFile(
  file: RecordingFile,
  recordingId: string,
  newId: () => string = () => crypto.randomUUID(),
): { recording: RecordingRecord; markers: MarkerRecord[] } {
  return {
    recording: {
      id: recordingId,
      ...file.recording,
      status: "complete",
      videoBlob: file.video,
      tabId: -1,
      ...(file.direction && { direction: file.direction }),
    },
    markers: file.markers.map((marker) => ({
      ...marker,
      id: newId(),
      recordingId,
    })),
  };
}
