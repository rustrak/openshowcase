import { useEffect, useRef, useState } from "react";
import {
  getMarkersByRecording,
  getRecording,
  type RecordingRecord,
} from "@/lib/db";
import { buildStepPlan } from "@/lib/segments";
import { type EditableStep, stepsFromPlan } from "../lib/editable-step";
import { FrameExtractor } from "../lib/frame-extractor";

export type RecordingState =
  | { status: "missing-id" }
  | { status: "loading" }
  | { status: "empty" }
  | {
      status: "ready";
      recording: RecordingRecord;
      videoUrl: string;
      duration: number;
      aspectRatio: number;
      initialSteps: EditableStep[];
    };

/** Loads the recording + its markers from IndexedDB and derives the step plan. */
export function useRecording(recordingId: string | null): RecordingState {
  const [state, setState] = useState<RecordingState>(
    recordingId ? { status: "loading" } : { status: "missing-id" },
  );

  useEffect(() => {
    if (!recordingId) return;
    let cancelled = false;
    let videoUrl: string | undefined;
    (async () => {
      const [recording, markers] = await Promise.all([
        getRecording(recordingId),
        getMarkersByRecording(recordingId),
      ]);
      if (cancelled) return;
      if (
        !recording?.videoBlob ||
        recording.durationSec == null ||
        recording.startedAt == null
      ) {
        setState({ status: "empty" });
        return;
      }
      const initialSteps = stepsFromPlan(
        buildStepPlan(markers, recording.durationSec, recording.startedAt),
      );
      if (initialSteps.length === 0) {
        setState({ status: "empty" });
        return;
      }
      videoUrl = URL.createObjectURL(recording.videoBlob);
      setState({
        status: "ready",
        recording,
        videoUrl,
        duration: recording.durationSec,
        aspectRatio:
          recording.width && recording.height
            ? recording.width / recording.height
            : 16 / 10,
        initialSteps,
      });
    })().catch(() => {
      if (!cancelled) setState({ status: "empty" });
    });
    return () => {
      cancelled = true;
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [recordingId]);

  return state;
}

export interface FilmstripFrame {
  time: number;
  url: string;
}

/** Frames per second of recording sampled for the sequence filmstrip, within bounds. */
function filmstripFrameCount(duration: number): number {
  return Math.min(60, Math.max(12, Math.round(duration * 2)));
}

/**
 * Serial frame extraction over a detached `<video>`: first the still frame of every
 * photo step (the stage needs those), then an evenly spaced filmstrip for the sequence.
 * Also hands out the extractor for on-demand frames (freeze-frame, convert to photo).
 */
export function useFrameExtraction(
  videoUrl: string | undefined,
  duration: number,
  initialSteps: EditableStep[] | undefined,
  onPhotoFrame: (stepId: string, blob: Blob, url: string) => void,
) {
  const extractorRef = useRef<FrameExtractor | null>(null);
  const [filmstrip, setFilmstrip] = useState<FilmstripFrame[]>([]);
  const onPhotoFrameRef = useRef(onPhotoFrame);
  onPhotoFrameRef.current = onPhotoFrame;

  useEffect(() => {
    if (!videoUrl || !initialSteps) return;
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = videoUrl;
    const extractor = new FrameExtractor(video);
    extractorRef.current = extractor;
    let cancelled = false;
    const urls: string[] = [];

    (async () => {
      for (const step of initialSteps) {
        if (cancelled) return;
        if (step.data.kind !== "photo" || step.data.imageUrl) continue;
        try {
          const blob = await extractor.extract(step.data.sourceTime);
          if (cancelled) return;
          onPhotoFrameRef.current(step.id, blob, URL.createObjectURL(blob));
        } catch {
          /* the step keeps its loading state; other frames still extract */
        }
      }
      const count = filmstripFrameCount(duration);
      for (let i = 0; i < count; i++) {
        if (cancelled) return;
        const time = ((i + 0.5) / count) * duration;
        try {
          const blob = await extractor.extract(time);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          setFilmstrip((prev) => [...prev, { time, url }]);
        } catch {
          /* a missing tile falls back to its nearest neighbour */
        }
      }
    })();

    return () => {
      cancelled = true;
      extractorRef.current = null;
      video.removeAttribute("src");
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [videoUrl, duration, initialSteps]);

  return { filmstrip, extractorRef };
}
