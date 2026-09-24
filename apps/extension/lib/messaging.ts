import { defineExtensionMessaging } from "@webext-core/messaging";

export type MarkerKind = "click" | "scroll" | "type" | "drag";

export interface MarkerPayload {
  kind: MarkerKind;
  capturedAt: number;
  pageUrl: string;
  /** Only for kind 'click'. */
  selector?: string;
  xFrac?: number;
  yFrac?: number;
  /** Visible text of the clicked element, used to auto-generate the tooltip. */
  elementText?: string;
}

export interface OffscreenStartPayload {
  streamId: string;
  recordingId: string;
  tabWidth: number;
  tabHeight: number;
}

export interface RecordingSavedPayload {
  recordingId: string;
  durationSec: number;
  width: number;
  height: number;
}

export interface ProtocolMap {
  marker(data: MarkerPayload): void;
  startRecording(): void;
  stopRecording(): void;
  offscreenStart(data: OffscreenStartPayload): void;
  offscreenStop(data: { recordingId: string }): void;
  recordingStarted(data: { recordingId: string; startedAt: number }): void;
  recordingSaved(data: RecordingSavedPayload): void;
}

export const { sendMessage, onMessage, removeAllListeners } =
  defineExtensionMessaging<ProtocolMap>();

export interface RecordingSessionState {
  active: boolean;
  recordingId?: string;
  tabId?: number;
  clickCount?: number;
}

export const defaultRecordingSessionState: RecordingSessionState = {
  active: false,
};
