"use client";
import React, { RefObject, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Smile, Image as ImageIcon, Send, Mic, Square, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageFeedback } from "@/components/ui/MessageFeedback";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { buildVoiceUploadFormData, validateAudioCaps, MAX_DURATION_SECONDS, MAX_FILE_BYTES, formatTime } from "@/lib/audio";

type ComposerProps = {
  inputRef: RefObject<HTMLInputElement>;
  text: string;
  setText: (v: string) => void;
  isSending: boolean;
  isBlocked: boolean;
  showPicker: boolean;
  setShowPicker: (v: boolean) => void;
  toggleBtnRef: RefObject<HTMLButtonElement>;
  onSend: (messageText: string) => Promise<void> | void;
  onInputChange: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  // Legacy voice props kept for compatibility with parent; will be superseded by inline upload
  canSendVoice: boolean;
  onSendVoice: (blob: Blob, duration: number) => Promise<void> | void;
  onVoiceUpgradeRequired: () => void;
  onVoiceError: (error: any) => void;
  messageFeedback: {
    type: "success" | "error" | "warning" | "loading";
    message: string;
    isVisible: boolean;
  };
  setMessageFeedback: (v: {
    type: "success" | "error" | "warning" | "loading";
    message: string;
    isVisible: boolean;
  }) => void;
  error?: string | null;
  // New: conversation context for upload
  conversationId?: string;
  toUserId?: string;
  // New: show subtle typing hint under composer
  isOtherTyping?: boolean;
};

export default function Composer(props: ComposerProps) {
  const {
    inputRef,
    text,
    setText,
    isSending,
    isBlocked,
    showPicker,
    setShowPicker,
    toggleBtnRef,
    onSend,
    onInputChange,
    onKeyPress,
    canSendVoice,
    onSendVoice,
    onVoiceUpgradeRequired,
    onVoiceError,
    messageFeedback,
    setMessageFeedback,
    error,
    conversationId,
    toUserId,
    isOtherTyping = false,
  } = props;

  // Recorder hook
  const {
    state,
    error: recError,
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
  } = useVoiceRecorder({ maxDurationSeconds: MAX_DURATION_SECONDS, maxBytes: MAX_FILE_BYTES, bars: 64 });

  const [isUploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0); // 0..100
  const lastUploadRef = React.useRef<{ fd: FormData; attempt: number } | null>(null);

  const canUseVoice = useMemo(() => mediaSupported && mediaRecorderSupported && canSendVoice && !isBlocked, [
    mediaSupported,
    mediaRecorderSupported,
    canSendVoice,
    isBlocked,
  ]);

  const startRecording = useCallback(async () => {
    setUploadError(null);
    if (!canUseVoice) {
      onVoiceUpgradeRequired?.();
      return;
    }
    try {
      await start();
    } catch (e: any) {
      onVoiceError?.(e);
    }
  }, [canUseVoice, onVoiceError, onVoiceUpgradeRequired, start]);

  const stopAndUpload = useCallback(async () => {
    try {
      setUploading(true);
      setUploadError(null);
      setUploadProgress(0);
      const result = await stop();
      if (!result) {
        setUploading(false);
        setUploadProgress(0);
        return;
      }
      const { blob, durationMs } = result;

      const caps = validateAudioCaps({ durationMs, sizeBytes: blob.size });
      if (!caps.ok) {
        setUploading(false);
        setUploadError(caps.error || "Audio does not meet constraints");
        onVoiceError?.(caps.error);
        return;
      }

      // Allow parent legacy pipeline as fallback if provided
      if (typeof onSendVoice === "function") {
        await onSendVoice(blob, Math.round(durationMs / 1000));
        setUploading(false);
        return;
      }

      // Inline upload (requires conversationId/toUserId)
      if (!conversationId || !toUserId) {
        setUploading(false);
        setUploadError("Missing conversation context for upload");
        onVoiceError?.("Missing conversation context");
        return;
      }

      // Generate normalized peaks to persist on server for fast playback UI
      // Use the lightweight peaks already computed by the hook if present
      const persistedPeaks: number[] | undefined =
        Array.isArray(peaks) && peaks.length ? peaks : undefined;

      const fd = await buildVoiceUploadFormData({
        blob,
        conversationId,
        durationSeconds: Math.round(durationMs / 1000),
        toUserId,
      });

      // Append peaks as JSON if available (server expects FormData field "peaks")
      try {
        if (persistedPeaks && typeof (fd as any).append === "function") {
          (fd as any).append("peaks", JSON.stringify(persistedPeaks));
        }
      } catch (err) {
        // non-fatal; continue without peaks
      }

      const res = await fetch("/api/voice-messages/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        const errText = msg?.error || msg?.message || "Upload failed";
        setUploading(false);
        setUploadError(errText);
        onVoiceError?.(errText);
        return;
      }

      // Success
      setUploading(false);
      setUploadError(null);
      // Surface a transient feedback
      setMessageFeedback({ type: "success", message: "Voice message sent", isVisible: true });
      setTimeout(() => setMessageFeedback({ ...messageFeedback, isVisible: false }), 1500);
    } catch (e: any) {
      const msg = e?.message || "Upload error";
      setUploading(false);
      setUploadError(msg);
      onVoiceError?.(msg);
    }
  }, [conversationId, onSendVoice, onVoiceError, setMessageFeedback, messageFeedback, peaks, stop, toUserId]);

  const recordingBanner = (isRecording || isPaused || isUploading) && (
    <div className="mb-3 p-3 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 flex items-end gap-1">
            {/* Lightweight bars from peaks */}
            {peaks.length > 0
              ? peaks.map((p, i) => (
                  <div
                    key={i}
                    className="w-1 bg-pink-500 rounded-sm"
                    style={{ height: `${Math.max(10, p * 28)}px` }}
                    title={`${i}`}
                  />
                ))
              : (
                <div className="text-xs text-gray-500">Recording…</div>
              )}
          </div>
          <div className={cn("text-sm font-medium", isPaused ? "text-orange-600" : "text-pink-600")}>
            {isUploading ? "Uploading…" : isPaused ? "Paused" : "Recording"}
          </div>
          <div className="text-xs text-gray-600">• {elapsedLabel} / {formatTime(MAX_DURATION_SECONDS * 1000)}</div>
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
                <Button type="button" variant="destructive" size="sm" onClick={stopAndUpload} className="h-8">
                  <Square className="w-4 h-4 mr-1" /> Stop & Send
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
      </div>
      {uploadError && <div className="mt-2 text-xs text-red-600">{uploadError}</div>}
    </div>
  );

  return (
    <div className="border-t border-secondary-light/30 p-4 bg-base-dark rounded-b-2xl">
      {/* Feedback banner */}
      <MessageFeedback
        type={messageFeedback.type}
        message={messageFeedback.message}
        isVisible={messageFeedback.isVisible}
        onClose={() =>
          setMessageFeedback({ ...messageFeedback, isVisible: false })
        }
      />

      {/* Recording / Upload banner */}
      {recordingBanner}

      <form
        className="flex items-end gap-3 relative"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSend(text);
        }}
      >
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder={
              isBlocked ? "Cannot send messages" : "Type your message…"
            }
            disabled={isSending || isBlocked}
            className={cn(
              "w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all",
              (isSending || isBlocked) && "opacity-50 cursor-not-allowed"
            )}
          />

          {/* Emoji picker toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPicker(!showPicker)}
            ref={toggleBtnRef}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary transition-colors p-2 h-8 w-8"
          >
            <Smile className="w-4 h-4" />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-secondary hover:text-primary transition-colors p-2 h-10 w-10"
            title={canUseVoice ? "Record voice" : "Voice not available"}
            disabled={!canUseVoice || isSending || isBlocked || isRecording}
            onClick={startRecording}
          >
            <Mic className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-secondary hover:text-primary transition-colors p-2 h-10 w-10"
            title="Send image (Premium feature)"
            disabled
          >
            <ImageIcon className="w-4 h-4" />
          </Button>

          {/* Inline upgrade hint when voice is unavailable */}
          {!canUseVoice && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => (window.location.href = "/subscription")}
              title="Upgrade to Premium to send voice messages"
            >
              Upgrade to Premium
            </Button>
          )}
        </div>

        {/* Send */}
        <Button
          type="submit"
          disabled={!text.trim() || isSending || isBlocked}
          className={cn(
            "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl",
            (!text.trim() || isSending || isBlocked) &&
              "opacity-50 cursor-not-allowed transform-none shadow-none"
          )}
        >
          {isSending ? (
            <LoadingSpinner size={16} className="text-white" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>

        {/* Emoji picker */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full right-0 mb-2 z-50 shadow-xl rounded-lg overflow-hidden"
            >
              <EmojiPicker
                theme="light"
                onEmojiClick={(emojiData: EmojiClickData) => {
                  setText(text + emojiData.emoji);
                  inputRef.current?.focus();
                }}
                width={350}
                height={400}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Tiny typing hint below composer */}
      <AnimatePresence>
        {isOtherTyping && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="mt-1 text-xs text-gray-400 pl-2"
          >
            typing…
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden listener to handle bubble-level retry */}
      <div className="hidden" aria-hidden>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <span
          tabIndex={-1}
          id="__retry_listener"
          onFocus={() => {}}
          onBlur={() => {}}
        />
      </div>

      {/* Inline error under composer */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 p-3 bg-danger/10 border border-danger/30 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <p className="text-danger text-xs flex-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-danger hover:bg-danger/20 text-xs px-2 py-1 h-auto"
              >
                Retry
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}