import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  patchRecordingSessionState,
  recordingSession,
} from "@/lib/recording-storage";

beforeEach(() => {
  fakeBrowser.reset();
});

describe("recordingSession", () => {
  it("defaults to an inactive session when nothing has been stored", async () => {
    expect(await recordingSession.getValue()).toEqual({ active: false });
  });

  it("persists a value that can be read back", async () => {
    await recordingSession.setValue({
      active: true,
      recordingId: "rec-1",
      tabId: 1,
      clickCount: 0,
    });

    expect(await recordingSession.getValue()).toEqual({
      active: true,
      recordingId: "rec-1",
      tabId: 1,
      clickCount: 0,
    });
  });
});

describe("patchRecordingSessionState", () => {
  it("merges a partial update onto the default when nothing was stored", async () => {
    await patchRecordingSessionState({ active: true });
    expect(await recordingSession.getValue()).toEqual({ active: true });
  });

  it("merges a partial update onto the current state without clobbering other fields", async () => {
    await recordingSession.setValue({
      active: true,
      recordingId: "rec-1",
      tabId: 1,
      clickCount: 2,
    });

    await patchRecordingSessionState({ clickCount: 3 });

    expect(await recordingSession.getValue()).toEqual({
      active: true,
      recordingId: "rec-1",
      tabId: 1,
      clickCount: 3,
    });
  });
});
