import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { playVideo } from "@/lib/play-video";

export interface ClipRange {
  id: string;
  start: number;
  end: number;
  rate: number;
}

export interface ClipPlayback {
  playing: boolean;
  toggle: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getTime: () => number;
  /**
   * Called with the current time on every animation frame while playing and on every
   * seek. Subscribers write straight to the DOM (playhead transform, timecode text) so a
   * playing clip doesn't re-render React 60 times a second.
   */
  subscribe: (listener: (time: number) => void) => () => void;
}

/** Plays the selected video clip on the stage's `<video>`, stopping at its out point. */
export function useClipPlayback(
  videoRef: RefObject<HTMLVideoElement | null>,
  clip: ClipRange | undefined,
): ClipPlayback {
  const [playing, setPlaying] = useState(false);
  const listeners = useRef(new Set<(time: number) => void>());
  const clipRef = useRef(clip);
  clipRef.current = clip;

  const emit = useCallback((time: number) => {
    for (const listener of listeners.current) listener(time);
  }, []);

  const getTime = useCallback(
    () => videoRef.current?.currentTime ?? clipRef.current?.start ?? 0,
    [videoRef],
  );

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = time;
      emit(time);
    },
    [videoRef, emit],
  );

  const pause = useCallback(() => videoRef.current?.pause(), [videoRef]);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    const range = clipRef.current;
    if (!video || !range) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    if (
      video.currentTime < range.start ||
      video.currentTime >= range.end - 0.02
    ) {
      video.currentTime = range.start;
    }
    void playVideo(video);
  }, [videoRef]);

  // Frame loop while playing: emit the time, stop at the clip's out point.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let raf = 0;
    const tick = () => {
      const range = clipRef.current;
      if (range && video.currentTime >= range.end) {
        video.pause();
        video.currentTime = range.end;
        emit(range.end);
        return;
      }
      emit(video.currentTime);
      raf = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      raf = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(raf);
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [videoRef, emit]);

  // Selecting another clip parks the playhead at its in point.
  const clipId = clip?.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-park when the selected clip changes, not while its trim is being edited
  useEffect(() => {
    const video = videoRef.current;
    const range = clipRef.current;
    if (!video || !range) return;
    video.pause();
    video.currentTime = range.start;
    emit(range.start);
  }, [clipId]);

  const rate = clip?.rate ?? 1;
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }, [videoRef, rate]);

  const subscribe = useCallback((listener: (time: number) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  return useMemo(
    () => ({ playing, toggle, pause, seek, getTime, subscribe }),
    [playing, toggle, pause, seek, getTime, subscribe],
  );
}
