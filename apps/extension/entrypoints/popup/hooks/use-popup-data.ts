import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import {
  getMarkersByRecording,
  getRecording,
  listRecentRecordings,
} from "@/lib/db";
import {
  defaultRecordingSessionState,
  type RecordingSessionState,
} from "@/lib/messaging";
import { recordingSession } from "@/lib/recording-storage";

export interface TabInfo {
  id?: number;
  windowId?: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
}

export interface RecentRecording {
  id: string;
  createdAt: number;
  durationSec: number | null;
  pageUrl?: string;
}

export function useRecordingSession(): RecordingSessionState {
  const [state, setState] = useState<RecordingSessionState>(
    defaultRecordingSessionState,
  );
  useEffect(() => {
    recordingSession.getValue().then(setState);
    return recordingSession.watch((next) => setState(next));
  }, []);
  return state;
}

/** The tab the popup would record: the active tab of the window it was opened from. */
export function useActiveTab(): TabInfo | null | undefined {
  const [tab, setTab] = useState<TabInfo | null>();
  useEffect(() => {
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([active]) => setTab(active ?? null))
      .catch(() => setTab(null));
  }, []);
  return tab;
}

export function useTab(tabId: number | undefined): TabInfo | null {
  const [tab, setTab] = useState<TabInfo | null>(null);
  useEffect(() => {
    if (tabId == null) return setTab(null);
    browser.tabs
      .get(tabId)
      .then(setTab)
      .catch(() => setTab(null));
  }, [tabId]);
  return tab;
}

/** Wall-clock time the recording started, for the live timer. */
export function useRecordingStart(recordingId: string | undefined) {
  const [start, setStart] = useState<number | null>(null);
  useEffect(() => {
    if (!recordingId) return setStart(null);
    getRecording(recordingId)
      .then((record) =>
        setStart(record?.startedAt ?? record?.createdAt ?? null),
      )
      .catch(() => setStart(null));
  }, [recordingId]);
  return start;
}

export function useNow(enabled: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
  return now;
}

export function useRecentRecordings(limit: number): RecentRecording[] {
  const [recent, setRecent] = useState<RecentRecording[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const records = await listRecentRecordings(limit);
      // Recordings don't store where they were made; the first marker's page does.
      const withPages = await Promise.all(
        records.map(async (record) => {
          const [first] = await getMarkersByRecording(record.id);
          return {
            id: record.id,
            createdAt: record.createdAt,
            durationSec: record.durationSec,
            pageUrl: first?.pageUrl,
          };
        }),
      );
      if (!cancelled) setRecent(withPages);
    })().catch((error) =>
      console.error("[openshowcase:popup] failed to list recordings", error),
    );
    return () => {
      cancelled = true;
    };
  }, [limit]);
  return recent;
}
