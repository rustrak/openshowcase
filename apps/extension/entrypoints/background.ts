import {
  addMarker,
  markRecordingInterrupted,
  markRecordingStarted,
  createRecording as saveRecording,
} from "@/lib/db";
import { type MarkerPayload, onMessage, sendMessage } from "@/lib/messaging";
import {
  patchRecordingSessionState,
  recordingSession,
} from "@/lib/recording-storage";

const OFFSCREEN_URL = "offscreen.html";

export default defineBackground(() => {
  reconcileOnStartup();

  onMessage("startRecording", () => startRecording());
  onMessage("stopRecording", () => stopRecording());
  onMessage("marker", ({ data, sender }) => handleMarker(data, sender.tab?.id));
  onMessage("recordingStarted", ({ data }) =>
    markRecordingStarted(data.recordingId, data.startedAt),
  );
  onMessage("recordingSaved", ({ data }) =>
    handleRecordingSaved(data.recordingId),
  );
});

async function ensureOffscreenDocument(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (contexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["USER_MEDIA"],
    justification: "Record the tab to create an interactive demo",
  });
}

async function closeOffscreenDocumentIfOpen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (contexts.length === 0) return;
  await chrome.offscreen.closeDocument();
}

function getTabCaptureStreamId(targetTabId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId }, (streamId) => {
      if (chrome.runtime.lastError || !streamId) {
        reject(
          new Error(
            chrome.runtime.lastError?.message ??
              "Failed to get tabCapture stream id",
          ),
        );
        return;
      }
      resolve(streamId);
    });
  });
}

interface ActiveTab {
  id?: number;
  width?: number;
  height?: number;
}

async function getActiveTab(): Promise<ActiveTab | undefined> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab;
}

export interface StartRecordingDeps {
  getActiveTab: () => Promise<ActiveTab | undefined>;
  ensureOffscreenDocument: () => Promise<void>;
  getTabCaptureStreamId: (tabId: number) => Promise<string>;
  saveRecording: (id: string, tabId: number) => Promise<void>;
  setCounterIcon: (count: number | null) => Promise<void>;
}

const defaultStartRecordingDeps: StartRecordingDeps = {
  getActiveTab,
  ensureOffscreenDocument,
  getTabCaptureStreamId,
  saveRecording,
  setCounterIcon,
};

export async function startRecording(
  deps: StartRecordingDeps = defaultStartRecordingDeps,
): Promise<void> {
  const tab = await deps.getActiveTab();
  if (!tab?.id) return;

  const recordingId = crypto.randomUUID();

  try {
    await deps.ensureOffscreenDocument();
    const streamId = await deps.getTabCaptureStreamId(tab.id);

    await deps.saveRecording(recordingId, tab.id);
    await recordingSession.setValue({
      active: true,
      recordingId,
      tabId: tab.id,
      clickCount: 0,
    });
    await deps.setCounterIcon(0);

    // The tab's real size keeps tabCapture from letterboxing the recording into its
    // default resolution (black bars baked into the video).
    await sendMessage("offscreenStart", {
      streamId,
      recordingId,
      tabWidth: tab.width ?? 1280,
      tabHeight: tab.height ?? 800,
    });
  } catch (error) {
    console.error("[openshowcase:background] failed to start recording", error);
    await patchRecordingSessionState({ active: false });
    await deps.setCounterIcon(null);
  }
}

export async function stopRecording(): Promise<void> {
  const state = await recordingSession.getValue();
  if (!state.active || !state.recordingId) return;

  await sendMessage("offscreenStop", { recordingId: state.recordingId });
}

/**
 * Step counter drawn INTO the extension icon itself while recording. A regular badge
 * gets covered by Chrome's capture indicator, so the whole icon is painted with
 * OffscreenCanvas.
 */
function drawCounter(size: number, count: number): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#DC2626";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - size / 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${Math.round(size * (count > 99 ? 0.42 : 0.56))}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(count), size / 2, size / 2 + size / 32);
  return ctx.getImageData(0, 0, size, size);
}

async function setCounterIcon(count: number | null): Promise<void> {
  const log = (error: unknown) =>
    console.warn("[openshowcase:background] counter icon failed", error);
  if (count == null) {
    await chrome.action.setBadgeText({ text: "" }).catch(log);
    await chrome.action
      .setIcon({
        path: { 16: "/icon/16.png", 32: "/icon/32.png", 48: "/icon/48.png" },
      })
      .catch(log);
    return;
  }

  // Both ways: icon redrawn with the number + badge — depending on the Chrome version,
  // the tabCapture indicator may cover one or the other.
  await chrome.action
    .setIcon({
      imageData: {
        16: drawCounter(16, count),
        32: drawCounter(32, count),
        48: drawCounter(48, count),
      },
    })
    .catch(log);
  await chrome.action.setBadgeBackgroundColor({ color: "#DC2626" }).catch(log);
  await chrome.action.setBadgeText({ text: String(count) }).catch(log);
}

async function handleMarker(
  payload: MarkerPayload,
  senderTabId: number | undefined,
): Promise<void> {
  const state = await recordingSession.getValue();
  if (!state.active || !state.recordingId || state.tabId !== senderTabId)
    return;

  if (payload.kind === "click") {
    const clickCount = (state.clickCount ?? 0) + 1;
    await patchRecordingSessionState({ clickCount });
    await setCounterIcon(clickCount);
  }

  await addMarker({
    id: crypto.randomUUID(),
    recordingId: state.recordingId,
    kind: payload.kind,
    capturedAt: payload.capturedAt,
    xFrac: payload.xFrac,
    yFrac: payload.yFrac,
    selector: payload.selector,
    elementText: payload.elementText,
    pageUrl: payload.pageUrl,
  });
}

async function handleRecordingSaved(recordingId: string): Promise<void> {
  const state = await recordingSession.getValue();
  if (state.recordingId === recordingId) {
    await patchRecordingSessionState({ active: false });
  }
  await setCounterIcon(null);
  await closeOffscreenDocumentIfOpen();
  // When the recording ends, open the editor directly.
  await browser.tabs.create({
    url: browser.runtime.getURL(`/editor.html?recordingId=${recordingId}`),
  });
}

async function reconcileOnStartup(): Promise<void> {
  const state = await recordingSession.getValue();
  if (!state.active || !state.recordingId) return;

  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (contexts.length > 0) return;

  await markRecordingInterrupted(state.recordingId);
  await patchRecordingSessionState({ active: false });
  await setCounterIcon(null);
}
