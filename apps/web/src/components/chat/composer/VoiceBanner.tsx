"use client";

import React from "react";
import { Pause, Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/audio";
import { MAX_DURATION_SECONDS } from "@/lib/audio";

interface VoiceBannerProps {
  isRecording: boolean;
  isPaused: boolean;
  elapsedLabel: string;
  peaks: number[];
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  cancel: () => void;
  isUploading: boolean;
  uploadError: string | null;
  reviewData: any;
  isPlayingReview: boolean;
  setIsPlayingReview: (v: boolean) => void;
  reviewProgress: number;
  reviewAudioRef: React.RefObject<HTMLAudioElement | null>;
  handleSendVoice: () => Promise<void>;
  handleDeleteVoice: () => void;
}

export function VoiceBanner({
  isRecording,
  isPaused,
  elapsedLabel,
  peaks,
  pause,
  resume,
  stop,
  cancel,
  isUploading,
  uploadError,
  reviewData,
  isPlayingReview,
  setIsPlayingReview,
  reviewProgress,
  reviewAudioRef,
  handleSendVoice,
  handleDeleteVoice,
}: VoiceBannerProps) {
  if (!(isRecording || isPaused || isUploading || reviewData)) return null;

  return (
    <div className="mb-3 p-3 rounded-lg border border-neutral/10 bg-white shadow-sm">
      <div className="flex items-center justify-between w-full">
        {reviewData ? (
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                if (reviewAudioRef.current) {
                  if (isPlayingReview) reviewAudioRef.current.pause();
                  else reviewAudioRef.current.play();
                }
              }}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-neutral/10 hover:bg-neutral/20 text-neutral transition-colors"
            >
              {isPlayingReview ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
            
            <div className="flex-1 h-8 flex items-center gap-1 px-2 bg-neutral/5 rounded-md overflow-hidden relative">
               <div className="flex items-end gap-[1px] h-full w-full justify-center py-1">
                {reviewData.peaks.length > 0 ? (
                  reviewData.peaks.map((p: number, i: number) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 rounded-full transition-colors",
                        (i / reviewData.peaks.length) * 100 <= reviewProgress 
                          ? "bg-primary" 
                          : "bg-neutral/30"
                      )}
                      style={{ height: `${Math.max(20, p * 100)}%` }}
                    />
                  ))
                ) : (
                  <div className="text-xs text-neutral-light w-full text-center">Audio recorded</div>
                )}
               </div>
               <audio
                ref={reviewAudioRef}
                src={reviewData.url}
                onPlay={() => setIsPlayingReview(true)}
                onPause={() => setIsPlayingReview(false)}
                onEnded={() => setIsPlayingReview(false)}
                className="hidden"
              />
            </div>

            <div className="text-xs font-medium text-neutral-light min-w-[40px] text-right">
              {formatTime(reviewData.durationMs)}
            </div>

            <div className="flex items-center gap-1 ml-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeleteVoice}
                className="h-8 w-8 p-0 text-neutral-light hover:text-danger hover:bg-danger/10 rounded-full"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSendVoice}
                disabled={isUploading}
                className="h-8 px-3 bg-primary hover:bg-primary/90 text-white rounded-full text-xs font-medium"
              >
                {isUploading ? <LoadingSpinner size={12} /> : "Send"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="h-2 flex items-end gap-1">
                {peaks.length > 0 ? (
                  peaks.map((p, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary rounded-sm"
                      style={{ height: `${Math.max(10, p * 28)}px` }}
                    />
                  ))
                ) : (
                  <div className="text-xs text-neutral-light">Recording…</div>
                )}
              </div>
              <div className={cn("text-sm font-medium", isPaused ? "text-warning" : "text-primary")}>
                {isUploading ? "Uploading…" : isPaused ? "Paused" : "Recording"}
              </div>
              <div className="text-xs text-neutral-light">
                • {elapsedLabel} / {formatTime(MAX_DURATION_SECONDS * 1000)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isUploading && (
                <>
                  {isRecording && !isPaused && (
                    <Button type="button" variant="outline" size="sm" onClick={pause} className="h-8">
                      <Pause className="w-4 h-4 mr-1" /> Pause
                    </Button>
                  )}
                  {isRecording && isPaused && (
                    <Button type="button" variant="outline" size="sm" onClick={resume} className="h-8">
                      <Play className="w-4 h-4 mr-1" /> Resume
                    </Button>
                  )}
                  {isRecording && (
                    <Button type="button" variant="destructive" size="sm" onClick={stop} className="h-8">
                      <Square className="w-4 h-4 mr-1" /> Stop
                    </Button>
                  )}
                  {!isRecording && !isPaused && (
                    <Button type="button" variant="ghost" size="sm" onClick={cancel} className="h-8">
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
      {uploadError && <div className="mt-2 text-xs text-danger">{uploadError}</div>}
    </div>
  );
}
