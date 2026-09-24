import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  type StartRecordingDeps,
  startRecording,
  stopRecording,
} from "@/entrypoints/background";
import { onMessage, removeAllListeners } from "@/lib/messaging";
import { recordingSession } from "@/lib/recording-storage";

beforeEach(() => {
  fakeBrowser.reset();
});

afterEach(() => {
  removeAllListeners();
});

function fakeDeps(
  overrides: Partial<StartRecordingDeps> = {},
): StartRecordingDeps {
  return {
    getActiveTab: async () => ({ id: 1, width: 1280, height: 800 }),
    ensureOffscreenDocument: async () => {},
    getTabCaptureStreamId: async () => "stream-1",
    saveRecording: async () => {},
    setCounterIcon: async () => {},
    ...overrides,
  };
}

describe("startRecording", () => {
  it("does nothing when there is no active tab", async () => {
    await startRecording(fakeDeps({ getActiveTab: async () => undefined }));
    expect(await recordingSession.getValue()).toEqual({ active: false });
  });

  it("does nothing when the active tab has no id", async () => {
    await startRecording(
      fakeDeps({ getActiveTab: async () => ({ id: undefined }) }),
    );
    expect(await recordingSession.getValue()).toEqual({ active: false });
  });

  it("starts a session and sends offscreenStart with the tab's real size", async () => {
    const received: unknown[] = [];
    const unlisten = onMessage("offscreenStart", ({ data }) => {
      received.push(data);
    });

    await startRecording(
      fakeDeps({ getTabCaptureStreamId: async () => "stream-xyz" }),
    );
    unlisten();

    const state = await recordingSession.getValue();
    expect(state.active).toBe(true);
    expect(state.clickCount).toBe(0);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      streamId: "stream-xyz",
      tabWidth: 1280,
      tabHeight: 800,
    });
  });

  it("defaults tabWidth/tabHeight to 1280/800 when the tab reports none", async () => {
    const received: unknown[] = [];
    const unlisten = onMessage("offscreenStart", ({ data }) => {
      received.push(data);
    });

    await startRecording(fakeDeps({ getActiveTab: async () => ({ id: 1 }) }));
    unlisten();

    expect(received[0]).toMatchObject({ tabWidth: 1280, tabHeight: 800 });
  });

  it("resets the session and clears the counter when a step fails", async () => {
    const counterCalls: (number | null)[] = [];
    await startRecording(
      fakeDeps({
        getTabCaptureStreamId: async () => {
          throw new Error("boom");
        },
        setCounterIcon: async (count) => {
          counterCalls.push(count);
        },
      }),
    );

    expect(await recordingSession.getValue()).toMatchObject({ active: false });
    expect(counterCalls).toContain(null);
  });
});

describe("stopRecording", () => {
  it("does nothing when no recording is active", async () => {
    const received: unknown[] = [];
    const unlisten = onMessage("offscreenStop", ({ data }) => {
      received.push(data);
    });

    await stopRecording();
    unlisten();

    expect(received).toEqual([]);
  });

  it("sends offscreenStop with the active recording id", async () => {
    await recordingSession.setValue({
      active: true,
      recordingId: "rec-1",
      tabId: 1,
      clickCount: 0,
    });
    const received: unknown[] = [];
    const unlisten = onMessage("offscreenStop", ({ data }) => {
      received.push(data);
    });

    await stopRecording();
    unlisten();

    expect(received).toEqual([{ recordingId: "rec-1" }]);
  });
});
