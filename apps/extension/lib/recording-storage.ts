import {
  defaultRecordingSessionState,
  type RecordingSessionState,
} from "@/lib/messaging";

export const recordingSession = storage.defineItem<RecordingSessionState>(
  "session:recording",
  { fallback: defaultRecordingSessionState },
);

export async function patchRecordingSessionState(
  patch: Partial<RecordingSessionState>,
): Promise<void> {
  const current = await recordingSession.getValue();
  await recordingSession.setValue({ ...current, ...patch });
}
