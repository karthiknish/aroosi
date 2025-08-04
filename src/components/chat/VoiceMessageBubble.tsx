"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Pause, Play } from "lucide-react";
import { formatTime } from "@/lib/audio";
import { cn } from "@/lib/utils";

type VoiceMessageBubbleProps = {
  // A resolved, authorized URL to the audio file (Convex storage proxy or signed URL)
  url: string;
  // Duration in seconds (from server metadata)
  durationSeconds: number;
  // Optional precomputed peaks [0..1] for lightweight bars
  peaks?: number[];
  // Render context
  isMine?: boolean;
  // Optional: for telemetry
  messageId?: string | number;
  className?: string;
};

export default function VoiceMessageBubble(props: VoiceMessageBubbleProps) {
  const { url, durationSeconds, peaks = [], isMine, messageId, className } = props;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [duration, setDuration] = useState(Math.max(0, durationSeconds || 0)); // seconds
  const [error, setError] = useState<string | null>(null);

  const correlationId = useMemo(() => Math.random().toString(36).slice(2, 10), []);

  useEffect(() => {
    const audio = new Audio();
    audio.src = url;
    audio.preload = "metadata";
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setPlaying(false);
    const onError = () => {
      setError("Unable to play audio");
      setPlaying(false);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      // Clear src to hint GC
      audio.src = "";
      audioRef.current = null;
    };
  }, [url]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setPlaying(false);
        console.info("[VOICE] pause", { correlationId, messageId });
      } else {
        const p = audio.play();
        if (p && typeof p.then === "function") {
          await p;
        }
        setPlaying(true);
        console.info("[VOICE] play", { correlationId, messageId });
      }
    } catch (e: any) {
      setError(e?.message || "Playback error");
      setPlaying(false);
      console.error("[VOICE] play_error", { correlationId, messageId, message: e?.message || String(e) });
    }
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(e.target.value);
    audio.currentTime = isFinite(next) ? next : 0;
    setCurrentTime(audio.currentTime);
    console.info("[VOICE] seek", { correlationId, messageId, to: next });
  };

  const onDownload = () => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = `voice-${messageId || Date.now()}.webm`;
      a.rel = "noopener noreferrer";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
      console.info("[VOICE] download", { correlationId, messageId });
    } catch (e) {
      console.warn("[VOICE] download_failed", { correlationId, messageId });
    }
  };

  const bars = peaks.length > 0 ? peaks : undefined;

  return (
    <div
      className={cn(
        "max-w-[80%] rounded-2xl px-3 py-2 shadow-sm border",
        isMine ? "bg-pink-50 border-pink-200" : "bg-white border-gray-200",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <Button
          type="button"
          size="icon"
          variant={isMine ? "default" : "secondary"}
          className={cn("h-8 w-8", isMine ? "bg-pink-600 hover:bg-pink-700 text-white" : "")}
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        {/* Waveform bars or placeholder */}
        <div className="flex-1 min-w-0">
          {bars ? (
            <div className="h-8 flex items-end gap-[2px]" aria-hidden>
              {bars.map((p, i) => (
                <div
                  key={i}
                  className={cn("w-[3px] rounded-sm", isMine ? "bg-pink-500" : "bg-gray-500/70")}
                  style={{ height: `${Math.max(6, p * 30)}px` }}
                />
              ))}
            </div>
          ) : (
            <div className="h-2 w-full bg-gray-200 rounded" aria-hidden />
          )}

          {/* Seek */}
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(duration))}
            value={Math.floor(currentTime)}
            onChange={onSeek}
            className="w-full mt-1 accent-pink-600"
            aria-label="Seek voice message"
          />

          {/* Time */}
          <div className="mt-0.5 text-[11px] text-gray-600 flex justify-between">
            <span>{formatTime(currentTime * 1000)}</span>
            <span>{formatTime(duration * 1000)}</span>
          </div>

          {error && <div className="mt-1 text-[11px] text-red-600">{error}</div>}
        </div>

        {/* Download (optional) */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onDownload}
          aria-label="Download voice message"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
