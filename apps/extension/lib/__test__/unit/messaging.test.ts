import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { type MarkerPayload, onMessage, sendMessage } from "@/lib/messaging";

beforeEach(() => {
  fakeBrowser.reset();
});

describe("messaging", () => {
  it("delivers a fire-and-forget message with no payload", async () => {
    const received: unknown[] = [];
    const unlisten = onMessage("startRecording", () => {
      received.push(true);
    });

    await sendMessage("startRecording", undefined);
    unlisten();

    expect(received).toEqual([true]);
  });

  it("delivers a payload-bearing message with the exact data sent", async () => {
    const received: MarkerPayload[] = [];
    const unlisten = onMessage("marker", ({ data }) => {
      received.push(data);
    });

    const payload: MarkerPayload = {
      kind: "click",
      capturedAt: 123,
      pageUrl: "https://example.com",
    };
    await sendMessage("marker", payload);
    unlisten();

    expect(received).toEqual([payload]);
  });
});
