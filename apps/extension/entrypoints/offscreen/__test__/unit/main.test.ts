import { afterAll, describe, expect, it, vi } from "vitest";
import { removeAllListeners, sendMessage } from "@/lib/messaging";

class FakeMediaRecorder {
  static isTypeSupported = () => true;
  mimeType = "video/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  start() {}
}

describe("offscreen document", () => {
  afterAll(() => {
    removeAllListeners();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("records without writing debug output to the console", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: async () => ({
          getVideoTracks: () => [],
          getTracks: () => [],
        }),
      },
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);

    await import("../../main");
    await sendMessage("offscreenStart", {
      streamId: "stream",
      recordingId: "rec-1",
      tabWidth: 1280,
      tabHeight: 800,
    });
    // a stop for another recording returns early, before touching the recorder
    await sendMessage("offscreenStop", { recordingId: "other" });

    expect(log).not.toHaveBeenCalled();
  });
});
