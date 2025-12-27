"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import {
  validateAudioCaps,
  MAX_DURATION_SECONDS,
  MAX_FILE_BYTES,
  buildVoiceUploadFormData,
} from "@/lib/audio";
import { uploadVoiceMessage } from "@/lib/api/voiceMessages";

interface UseVoiceComposerProps {
  conversationId?: string;
  toUserId?: string;
  onSendVoice?: (blob: Blob, duration: number) => Promise<void> | void;
  onVoiceError?: (error: any) => void;
  showFeedback: (type: "success" | "error" | "warning" | "loading", message: string) => void;
  hideFeedback: () => void;
}

export function useVoiceComposer({
  conversationId,
  toUserId,
  onSendVoice,
  onVoiceError,
  showFeedback,
  hideFeedback,
}: UseVoiceComposerProps) {
  const {
    isRecording,
    isPaused,
    elapsedLabel,
    peaks,
    start,
    pause,
    resume,
    stop,
    cancel,
    mediaSupported,
    mediaRecorderSupported,
  } = useVoiceRecorder({
    maxDurationSeconds: MAX_DURATION_SECONDS,
    maxBytes: MAX_FILE_BYTES,
    bars: 64,
  });

  const [isUploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<{
    blob: Blob;
    durationMs: number;
    peaks: number[];
    url: string;
  } | null>(null);
  const [isPlayingReview, setIsPlayingReview] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);
  const reviewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (reviewData?.url) URL.revokeObjectURL(reviewData.url);
    };
  }, [reviewData]);

  const startRecording = useCallback(async () => {
    setUploadError(null);
    try {
      await start();
    } catch (e: any) {
      onVoiceError?.(e);
    }
  }, [start, onVoiceError]);

  const handleStopRecording = useCallback(async () => {
    try {
      setUploadError(null);
      const result = await stop();
      if (!result) return;
      
      const { blob, durationMs, peaks: finalPeaks } = result;
      const caps = validateAudioCaps({ durationMs, sizeBytes: blob.size });
      
      if (!caps.ok) {
        setUploadError(caps.error || "Audio does not meet constraints");
        onVoiceError?.(caps.error);
        return;
      }

      setReviewData({
        blob,
        durationMs,
        peaks: finalPeaks || [],
        url: URL.createObjectURL(blob)
      });
    } catch (e: any) {
      setUploadError(e?.message || "Recording error");
      onVoiceError?.(e?.message || "Recording error");
    }
  }, [stop, onVoiceError]);

  const handleSendVoice = useCallback(async () => {
    if (!reviewData) return;
    
    try {
      setUploading(true);
      setUploadError(null);

      const { blob, durationMs, peaks: persistedPeaks } = reviewData;

      if (typeof onSendVoice === "function") {
        await onSendVoice(blob, Math.round(durationMs / 1000));
        setUploading(false);
        setReviewData(null);
        return;
      }

      if (!conversationId || !toUserId) {
        setUploading(false);
        setUploadError("Missing conversation context");
        return;
      }

      const fd = await buildVoiceUploadFormData({
        blob,
        conversationId,
        durationSeconds: Math.round(durationMs / 1000),
        toUserId,
      });

      if (persistedPeaks && persistedPeaks.length > 0) {
        fd.append("peaks", JSON.stringify(persistedPeaks));
      }

      const { success, error: errText } = await uploadVoiceMessage(fd);
      if (!success) {
        setUploadError(errText || "Upload failed");
        return;
      }

      setUploading(false);
      setReviewData(null);
      showFeedback("success", "Voice message sent");
      setTimeout(hideFeedback, 1500);
    } catch (e: any) {
      setUploadError(e?.message || "Upload error");
    } finally {
      setUploading(false);
    }
  }, [reviewData, conversationId, toUserId, onSendVoice, showFeedback, hideFeedback]);

  const handleDeleteVoice = useCallback(() => {
    setReviewData(null);
    setUploadError(null);
  }, []);

  return {
    isRecording,
    isPaused,
    elapsedLabel,
    peaks,
    start: startRecording,
    pause,
    resume,
    stop: handleStopRecording,
    cancel,
    isUploading,
    uploadError,
    reviewData,
    isPlayingReview,
    setIsPlayingReview,
    reviewProgress,
    setReviewProgress,
    reviewAudioRef,
    handleSendVoice,
    handleDeleteVoice,
    mediaSupported,
    mediaRecorderSupported,
  };
}
