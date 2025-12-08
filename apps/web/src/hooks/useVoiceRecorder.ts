import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_DURATION_SECONDS,
  MAX_FILE_BYTES,
  pickPreferredMime,
  formatTime,
  decodeToAudioBuffer,
  generateWaveformPeaks,
} from "@/lib/audio";

type RecorderState =
  | "idle"
  | "recording"
  | "paused"
  | "stopping"
  | "error";

export type WaveformSample = number[]; // normalized [0..1] peaks for lightweight bars

export interface UseVoiceRecorderOptions {
  preferMimeTypes?: string[]; // e.g., ["audio/webm", "audio/m4a", "audio/mp4"]
  maxDurationSeconds?: number; // default 300
  maxBytes?: number; // default 10MB
  bars?: number; // default 64 bars for waveform
}

export interface UseVoiceRecorderResult {
  // State
  state: RecorderState;
  error: string | null;

  // Recording
  isRecording: boolean;
  isPaused: boolean;
  elapsedMs: number; // elapsed time in ms
  elapsedLabel: string; // "mm:ss"
  peaks: WaveformSample; // updated periodically (best-effort)
  mimeType: string;

  // Controls
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<{ blob: Blob; durationMs: number; mimeType: string; peaks?: number[] } | null>;
  cancel: () => void;

  // Capability flags
  mediaSupported: boolean;
  mediaRecorderSupported: boolean;
}

/**
 * useVoiceRecorder
 * - Uses MediaRecorder (if available) to capture audio and produce a single Blob
 * - Tracks elapsed time, supports pause/resume, and enforces max duration
 * - After stop, decodes audio via WebAudio API to produce lightweight waveform peaks
 * - Best-effort peaks during recording are limited; final peaks populated post-stop
 */
export function useVoiceRecorder(options?: UseVoiceRecorderOptions): UseVoiceRecorderResult {
  const maxDurationSeconds = options?.maxDurationSeconds ?? MAX_DURATION_SECONDS;
  const maxBytes = options?.maxBytes ?? MAX_FILE_BYTES;
  const bars = options?.bars ?? 64;

  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [peaks, setPeaks] = useState<WaveformSample>([]);
  const [mimeType, setMimeType] = useState<string>("audio/webm");

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTsRef = useRef<number>(0);
  const pauseAccumulatedRef = useRef<number>(0);
  const pauseStartRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);

  const mediaSupported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const mediaRecorderSupported = typeof window !== "undefined" && "MediaRecorder" in window;

  const clearTimers = () => {
    if (tickTimerRef.current != null) {
      window.clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  };

  const cleanup = useCallback(() => {
    clearTimers();
    try {
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    } catch {}
    try {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    recorderRef.current = null;
    mediaStreamRef.current = null;
    chunksRef.current = [];
    startTsRef.current = 0;
    pauseAccumulatedRef.current = 0;
    pauseStartRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // Elapsed label
  const elapsedLabel = formatTime(elapsedMs);

  // Tick timer updates elapsed and enforces max duration
  const startTicking = useCallback(() => {
    clearTimers();
    tickTimerRef.current = window.setInterval(() => {
      if (startTsRef.current === 0) return;
      const now = Date.now();
      const pausedDelta =
        pauseAccumulatedRef.current + (pauseStartRef.current ? now - pauseStartRef.current : 0);
      const effective = now - startTsRef.current - pausedDelta;
      setElapsedMs(Math.max(0, effective));

      if (effective / 1000 >= maxDurationSeconds) {
        // Hit max duration - auto-stop
        // Defer to next task to avoid referencing stop before its declaration
        setTimeout(() => {
          try {
            if (recorderRef.current && recorderRef.current.state !== "inactive") {
              recorderRef.current.stop();
            }
          } catch {}
        }, 0);
      }
    }, 200);
  }, [maxDurationSeconds]);

  const start = useCallback(async () => {
    setError(null);
    setPeaks([]);
    setElapsedMs(0);

    if (!mediaSupported || !mediaRecorderSupported) {
      setError("Audio recording is not supported in this browser");
      setState("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Decide preferred MIME
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4;codecs=mp4a.40.2",
        "audio/m4a",
      ];
      const supported: string[] = [];
      for (const cand of candidates) {
        const isSupported = (window as any).MediaRecorder?.isTypeSupported?.(
          cand
        );
        if (isSupported) supported.push(cand.split(";")[0]);
      }
      const preferred = pickPreferredMime(supported);
      setMimeType(preferred);

      // Use the most specific supported type if available
      const recorderType =
        candidates.find((c) => {
          const sup = (window as any).MediaRecorder?.isTypeSupported?.(c);
          return sup && c.startsWith(preferred);
        }) || preferred;

      const recorder = new MediaRecorder(stream, { mimeType: recorderType });
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onerror = (e: any) => {
        setError(e?.error?.message || "Recording error");
        setState("error");
        cleanup();
      };

      recorder.onstart = () => {
        setState("recording");
        setIsRecording(true);
        setIsPaused(false);
        startTsRef.current = Date.now();
        pauseAccumulatedRef.current = 0;
        pauseStartRef.current = null;
        startTicking();
      };

      recorder.onpause = () => {
        setIsPaused(true);
        pauseStartRef.current = Date.now();
      };

      recorder.onresume = () => {
        setIsPaused(false);
        if (pauseStartRef.current) {
          pauseAccumulatedRef.current += Date.now() - pauseStartRef.current;
          pauseStartRef.current = null;
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        setIsPaused(false);
        setState("stopping");
        clearTimers();
      };

      recorder.start(250); // gather small chunks for responsiveness
    } catch (e: any) {
      setError(e?.message || "Unable to start recording");
      setState("error");
      cleanup();
    }
  }, [cleanup, mediaRecorderSupported, mediaSupported, startTicking]);

  const pause = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.pause();
      }
    } catch {}
  }, []);

  const resume = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state === "paused") {
        recorderRef.current.resume();
      }
    } catch {}
  }, []);

  const stop = useCallback(async (): Promise<{ blob: Blob; durationMs: number; mimeType: string; peaks?: number[] } | null> => {
    return new Promise((resolve) => {
      try {
        if (!recorderRef.current) return resolve(null);

        const finalize = async () => {
          try {
            const recordedMime = recorderRef.current?.mimeType || mimeType;
            const blob = new Blob(chunksRef.current, { type: recordedMime });
            const durationMs = elapsedMs;

            // size cap check (best-effort before upload)
            if (blob.size > maxBytes) {
              setError(`Recording too large (max ${Math.floor(maxBytes / 1024 / 1024)}MB)`);
              setState("error");
              cleanup();
              return resolve(null);
            }

            let finalPeaks: number[] | undefined;
            // Decode and compute peaks (post-stop)
            try {
              const ctx = new AudioContext();
              const audioBuf = await decodeToAudioBuffer(ctx, blob);
              finalPeaks = generateWaveformPeaks(audioBuf, bars);
              setPeaks(finalPeaks);
              ctx.close().catch(() => {});
            } catch {
              // Non-fatal if decode fails; playback still possible via <audio>
            }

            setState("idle");
            resolve({ blob, durationMs, mimeType: recordedMime, peaks: finalPeaks });
            cleanup();
          } catch (e: any) {
            setError(e?.message || "Failed to finalize recording");
            setState("error");
            cleanup();
            resolve(null);
          }
        };

        // Attach one-time onstop handler then stop
        const rec = recorderRef.current;
        const originalOnStop = rec.onstop;
        rec.onstop = function (this: MediaRecorder, ev: Event) {
          try {
            // Call the original handler with correct 'this' binding
            if (typeof originalOnStop === "function") {
              originalOnStop.call(this, ev);
            }
          } catch {}
          void finalize();
        };
        rec.stop();
      } catch {
        cleanup();
        resolve(null);
      }
    });
  }, [bars, cleanup, elapsedMs, maxBytes, mimeType]);

  const cancel = useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch {}
    cleanup();
    setState("idle");
    setError(null);
    setElapsedMs(0);
    setPeaks([]);
  }, [cleanup]);

  return {
    state,
    error,
    isRecording,
    isPaused,
    elapsedMs,
    elapsedLabel,
    peaks,
    mimeType,
    start,
    pause,
    resume,
    stop,
    cancel,
    mediaSupported,
    mediaRecorderSupported,
  };
}