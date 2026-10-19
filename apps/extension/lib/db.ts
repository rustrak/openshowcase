import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import { type RecordingFile, recordsFromFile } from "@/lib/recording-file";

export type RecordingStatus = "recording" | "complete" | "interrupted";

export interface RecordingRecord {
  id: string;
  createdAt: number;
  startedAt: number | null;
  status: RecordingStatus;
  videoBlob: Blob | null;
  mimeType: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  tabId: number;
  /** Editing the recorder CLI's flow asked for (absent on recordings made by hand). */
  direction?: RecordingDirection;
}

export interface TimeRange {
  start: number;
  end: number;
}

/** Wall-clock times, like the markers' `capturedAt`. */
export interface RecordingDirection {
  /** Waits for the app: cut out of the clips. */
  cuts: TimeRange[];
  /** Clips that play an action the flow zoomed into frame on it. */
  zooms: (TimeRange & { x: number; y: number; scale: number })[];
  /** The flow's name for the demo: the editor's starting title. */
  title?: string;
}

export type MarkerKind = "click" | "scroll" | "type" | "drag";

export interface MarkerRecord {
  id: string;
  recordingId: string;
  /** Older records (DB schema v1) have no kind — treat them as 'click'. */
  kind?: MarkerKind;
  capturedAt: number;
  xFrac?: number;
  yFrac?: number;
  selector?: string;
  elementText?: string;
  /** Tooltip text chosen by whoever recorded (the recorder CLI's flow), over the element text. */
  label?: string;
  /** The flow's camera zoom on this click's photo step. */
  zoom?: number;
  /** false: the click plays inside a clip instead of becoming a photo step. */
  hotspot?: boolean;
  pageUrl: string;
}

interface OpenShowcaseDB extends DBSchema {
  recordings: {
    key: string;
    value: RecordingRecord;
  };
  markers: {
    key: string;
    value: MarkerRecord;
    indexes: { "by-recordingId": string };
  };
}

let dbPromise: Promise<IDBPDatabase<OpenShowcaseDB>> | undefined;

function getDb(): Promise<IDBPDatabase<OpenShowcaseDB>> {
  dbPromise ??= openDB<OpenShowcaseDB>("openshowcase", 1, {
    upgrade(db) {
      db.createObjectStore("recordings", { keyPath: "id" });
      const markers = db.createObjectStore("markers", { keyPath: "id" });
      markers.createIndex("by-recordingId", "recordingId");
    },
  });
  return dbPromise;
}

export async function createRecording(
  id: string,
  tabId: number,
): Promise<void> {
  const db = await getDb();
  const record: RecordingRecord = {
    id,
    createdAt: Date.now(),
    startedAt: null,
    status: "recording",
    videoBlob: null,
    mimeType: null,
    durationSec: null,
    width: null,
    height: null,
    tabId,
  };
  await db.put("recordings", record);
}

export async function markRecordingStarted(
  id: string,
  startedAt: number,
): Promise<void> {
  const db = await getDb();
  const record = await db.get("recordings", id);
  if (!record) return;
  record.startedAt = startedAt;
  await db.put("recordings", record);
}

export interface RecordingMeta {
  durationSec: number;
  width: number;
  height: number;
}

export async function saveRecordingBlob(
  id: string,
  videoBlob: Blob,
  mimeType: string,
  meta: RecordingMeta,
): Promise<void> {
  const db = await getDb();
  const record = await db.get("recordings", id);
  if (!record) return;
  record.videoBlob = videoBlob;
  record.mimeType = mimeType;
  record.status = "complete";
  record.durationSec = meta.durationSec;
  record.width = meta.width;
  record.height = meta.height;
  await db.put("recordings", record);
}

export async function markRecordingInterrupted(id: string): Promise<void> {
  const db = await getDb();
  const record = await db.get("recordings", id);
  if (!record) return;
  record.status = "interrupted";
  await db.put("recordings", record);
}

export async function getRecording(
  id: string,
): Promise<RecordingRecord | undefined> {
  const db = await getDb();
  return db.get("recordings", id);
}

export async function addMarker(marker: MarkerRecord): Promise<void> {
  const db = await getDb();
  await db.put("markers", marker);
}

export async function getMarkersByRecording(
  recordingId: string,
): Promise<MarkerRecord[]> {
  const db = await getDb();
  const markers = await db.getAllFromIndex(
    "markers",
    "by-recordingId",
    recordingId,
  );
  return markers.sort((a, b) => a.capturedAt - b.capturedAt);
}

/** Finished recordings, newest first. */
export async function listRecentRecordings(
  limit: number,
): Promise<RecordingRecord[]> {
  const db = await getDb();
  const all = await db.getAll("recordings");
  return all
    .filter((record) => record.status === "complete")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/** Stores a recording file (made elsewhere, e.g. by the recorder CLI); resolves with its new id. */
export async function importRecording(file: RecordingFile): Promise<string> {
  const id = crypto.randomUUID();
  const { recording, markers } = recordsFromFile(file, id);
  const db = await getDb();
  const tx = db.transaction(["recordings", "markers"], "readwrite");
  await Promise.all([
    tx.objectStore("recordings").put(recording),
    ...markers.map((marker) => tx.objectStore("markers").put(marker)),
    tx.done,
  ]);
  return id;
}
