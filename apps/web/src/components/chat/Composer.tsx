"use client";
import React, {
  RefObject,
  useCallback,
  useMemo,
  useState,
  useLayoutEffect,
  useRef,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  Smile,
  Image as ImageIcon,
  Send,
  Mic,
  Square,
  Pause,
  Play,
  X,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageFeedback } from "@/components/ui/MessageFeedback";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import {
  buildVoiceUploadFormData,
  validateAudioCaps,
  MAX_DURATION_SECONDS,
  MAX_FILE_BYTES,
  formatTime,
} from "@/lib/audio";
import { uploadVoiceMessage } from "@/lib/api/voiceMessages";
import { uploadMessageImage } from "@/lib/api/messages";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { isPremium } from "@/lib/utils/subscriptionPlan";
import MicPermissionDialog from "@/components/chat/MicPermissionDialog";
import {
  validateFileSize,
  compressImage,
  MAX_FILE_SIZE_DISPLAY,
} from "@/lib/utils/imageProcessing";

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
  onSendVoice?: (blob: Blob, duration: number) => Promise<void> | void;
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
  fromUserId?: string;
  // New: show subtle typing hint under composer
  isOtherTyping?: boolean;
  replyTo?: {
    messageId: string;
    text?: string;
    type?: "text" | "voice" | "image";
    fromUserId?: string;
  };
  onCancelReply?: () => void;
  // Editing existing message
  editing?: { messageId: string; originalText: string } | null;
  onCancelEdit?: () => void;
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
    replyTo,
    onCancelReply,
  } = props;

  // Subscription plan to conditionally render upgrade CTA
  const { profile: authProfile } = useAuthContext();
  const needsVoiceUpgrade = React.useMemo(() => {
    const plan = (authProfile as any)?.subscriptionPlan as string | undefined;
    return !!authProfile && !isPremium(plan);
  }, [authProfile]);

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
  } = useVoiceRecorder({
    maxDurationSeconds: MAX_DURATION_SECONDS,
    maxBytes: MAX_FILE_BYTES,
    bars: 64,
  });

  const [isUploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0); // 0..100
  const lastUploadRef = React.useRef<{ fd: FormData; attempt: number } | null>(
    null
  );
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isImageConverting, setIsImageConverting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const imageAbortRef = React.useRef<AbortController | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<number>(0);
  const [micHelpOpen, setMicHelpOpen] = useState(false);

  // Review state
  const [reviewData, setReviewData] = useState<{
    blob: Blob;
    durationMs: number;
    peaks: number[];
    url: string;
  } | null>(null);
  const [isPlayingReview, setIsPlayingReview] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);
  const reviewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup review URL
  useEffect(() => {
    return () => {
      if (reviewData?.url) URL.revokeObjectURL(reviewData.url);
    };
  }, [reviewData]);

  const canUseVoice = useMemo(
    () =>
      mediaSupported && mediaRecorderSupported && canSendVoice && !isBlocked,
    [mediaSupported, mediaRecorderSupported, canSendVoice, isBlocked]
  );

  const startRecording = useCallback(async () => {
    setUploadError(null);
    if (!canUseVoice) {
      onVoiceUpgradeRequired?.();
      return;
    }
    try {
      // Try to preflight microphone permission to provide better UX
      if (typeof navigator !== "undefined") {
        try {
          // If Permissions API is available, check state first
          const hasPermsApi = (navigator as any).permissions?.query;
          if (hasPermsApi) {
            const status = await (navigator as any).permissions.query({
              name: "microphone",
            } as any);
            if (status.state === "denied") {
              // Show help modal; cannot programmatically open browser settings
              setMicHelpOpen(true);
              showErrorToast(
                null,
                "Microphone access is blocked. Use the instructions to enable it, then try again."
              );
              return;
            }
            // If prompt or granted, a getUserMedia call will trigger the prompt if needed
          }
          // Use a quick, throwaway getUserMedia to explicitly trigger the prompt when needed
          // Some browsers require this to be called from a user gesture (our click handler qualifies)
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (permErr: any) {
          // Surfacing clearer reasons
          const name = permErr?.name || "Error";
          if (name === "NotAllowedError") {
            setMicHelpOpen(true);
            showErrorToast(null, "Microphone permission denied.");
            return;
          }
          if (name === "NotFoundError") {
            showErrorToast(null, "No microphone found on this device.");
            return;
          }
          if (name === "SecurityError") {
            showErrorToast(
              null,
              "Microphone blocked by site policy. Ensure HTTPS and Permissions-Policy allow microphone."
            );
            return;
          }
          // Other errors are non-fatal; proceed to start() which may succeed
        }
      }
      await start();
    } catch (e: any) {
      onVoiceError?.(e);
    }
  }, [canUseVoice, onVoiceError, onVoiceUpgradeRequired, start]);

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

      // Create URL for preview
      const url = URL.createObjectURL(blob);
      
      setReviewData({
        blob,
        durationMs,
        peaks: finalPeaks || [],
        url
      });
    } catch (e: any) {
      const msg = e?.message || "Recording error";
      setUploadError(msg);
      onVoiceError?.(msg);
    }
  }, [stop, onVoiceError]);

  const handleSendVoice = useCallback(async () => {
    if (!reviewData) return;
    
    try {
      setUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      const { blob, durationMs, peaks: persistedPeaks } = reviewData;

      // Allow parent legacy pipeline as fallback if provided
      if (typeof onSendVoice === "function") {
        await onSendVoice(blob, Math.round(durationMs / 1000));
        setUploading(false);
        setReviewData(null);
        return;
      }

      // Inline upload (requires conversationId/toUserId)
      if (!conversationId || !toUserId) {
        setUploading(false);
        setUploadError("Missing conversation context for upload");
        onVoiceError?.("Missing conversation context");
        return;
      }

      const fd = await buildVoiceUploadFormData({
        blob,
        conversationId,
        durationSeconds: Math.round(durationMs / 1000),
        toUserId,
      });

      // Append peaks as JSON if available (server expects FormData field "peaks")
      try {
        if (persistedPeaks && persistedPeaks.length > 0 && typeof (fd as any).append === "function") {
          (fd as any).append("peaks", JSON.stringify(persistedPeaks));
        }
      } catch (err) {
        // non-fatal; continue without peaks
      }

      const { success, error: errText } = await uploadVoiceMessage(fd);
      if (!success) {
        setUploading(false);
        setUploadError(errText || "Upload failed");
        onVoiceError?.(errText || "Upload failed");
        return;
      }

      // Success
      setUploading(false);
      setUploadError(null);
      setReviewData(null);
      
      // Surface a transient feedback
      setMessageFeedback({
        type: "success",
        message: "Voice message sent",
        isVisible: true,
      });
      setTimeout(
        () => setMessageFeedback({ ...messageFeedback, isVisible: false }),
        1500
      );
    } catch (e: any) {
      const msg = e?.message || "Upload error";
      setUploading(false);
      setUploadError(msg);
      onVoiceError?.(msg);
    }
  }, [
    reviewData,
    conversationId,
    toUserId,
    onSendVoice,
    onVoiceError,
    setMessageFeedback,
    messageFeedback,
  ]);

  const handleDeleteVoice = useCallback(() => {
    setReviewData(null);
    setUploadError(null);
  }, []);

  const recordingBanner = (isRecording || isPaused || isUploading || reviewData) && (
    <div className="mb-3 p-3 rounded-lg border border-neutral/10 bg-white shadow-sm">
      <div className="flex items-center justify-between w-full">
        {reviewData ? (
          // Review UI
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                if (reviewAudioRef.current) {
                  if (isPlayingReview) {
                    reviewAudioRef.current.pause();
                  } else {
                    reviewAudioRef.current.play();
                  }
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
               {/* Waveform visualization */}
               <div className="flex items-end gap-[1px] h-full w-full justify-center py-1">
                {reviewData.peaks.length > 0 ? (
                  reviewData.peaks.map((p, i) => (
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
                onEnded={() => {
                  setIsPlayingReview(false);
                  setReviewProgress(0);
                }}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  if (el.duration) {
                    setReviewProgress((el.currentTime / el.duration) * 100);
                  }
                }}
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
                title="Delete recording"
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
          // Recording UI
          <>
            <div className="flex items-center gap-3">
              <div className="h-2 flex items-end gap-1">
                {/* Lightweight bars from peaks */}
                {peaks.length > 0 ? (
                  peaks.map((p, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary rounded-sm"
                      style={{ height: `${Math.max(10, p * 28)}px` }}
                      title={`${i}`}
                    />
                  ))
                ) : (
                  <div className="text-xs text-neutral-light">Recording…</div>
                )}
              </div>
              <div
                className={cn(
                  "text-sm font-medium",
                  isPaused ? "text-warning" : "text-primary"
                )}
              >
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={pause}
                      className="h-8"
                    >
                      <Pause className="w-4 h-4 mr-1" /> Pause
                    </Button>
                  )}
                  {isRecording && isPaused && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resume}
                      className="h-8"
                    >
                      <Play className="w-4 h-4 mr-1" /> Resume
                    </Button>
                  )}
                  {isRecording && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleStopRecording}
                      className="h-8"
                    >
                      <Square className="w-4 h-4 mr-1" /> Stop
                    </Button>
                  )}
                  {!isRecording && !isPaused && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={cancel}
                      className="h-8"
                    >
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
      {uploadError && (
        <div className="mt-2 text-xs text-danger">{uploadError}</div>
      )}
    </div>
  );

  // Autosize helper for textarea
  const resize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    // Increase desktop cap; keep mobile reasonable via CSS overflow
    const isDesktop =
      typeof window !== "undefined" && window.innerWidth >= 1024;
    const cap = isDesktop ? 360 : 200; // ~ up to ~12 lines on desktop
    el.style.height = Math.min(el.scrollHeight, cap) + "px";
  }, []);

  useLayoutEffect(() => {
    if (inputRef?.current) {
      // @ts-expect-error converting type since ref originally HTMLInputElement
      resize(inputRef.current as HTMLTextAreaElement);
    }
  }, [text, resize, inputRef]);

  const maxChars = 2000;
  const remaining = maxChars - text.length;
  const nearingLimit = remaining < 100;

  return (
    <div
      className="p-4 sm:p-5"
      aria-label="Message composer"
      role="group"
    >
      {/* Editing banner - refined */}
      {props.editing && (
        <div className="mb-3 p-3 rounded-xl border border-warning/20 bg-gradient-to-r from-warning/5 to-warning/10 text-xs text-warning flex items-center justify-between shadow-sm">
          <div className="truncate mr-2 font-medium">Editing message</div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-3 rounded-lg hover:bg-warning/20"
            onClick={props.onCancelEdit}
          >
            Cancel
          </Button>
        </div>
      )}
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

      {/* Mic permission help dialog */}
      <MicPermissionDialog
        open={micHelpOpen}
        onClose={() => setMicHelpOpen(false)}
        onRetry={async () => {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicHelpOpen(false);
            await start();
          } catch (e) {
            // keep dialog open; user may need to change settings then reload
          }
        }}
      />

      <form
        className="flex items-end gap-2.5 relative"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSend(text);
        }}
      >
        {replyTo && (
          <div className="absolute -top-16 left-0 right-0 mb-2 flex items-start gap-2.5 bg-white border border-neutral/20 rounded-xl p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="w-1 h-full bg-gradient-to-b from-primary to-primary/60 rounded-full absolute left-3 top-3 bottom-3" />
            <div className="flex-1 overflow-hidden pl-3">
              <p className="text-[10px] uppercase tracking-wider text-neutral-light mb-0.5 font-semibold">
                Replying to
              </p>
              <p className="text-xs text-neutral line-clamp-2 break-words font-medium">
                {replyTo.type === "voice"
                  ? "Voice message"
                  : replyTo.text || "(no text)"}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-lg hover:bg-neutral/10 text-neutral-light hover:text-neutral"
              onClick={onCancelReply}
              aria-label="Cancel reply"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="flex-1 relative bg-neutral/5 rounded-2xl border border-neutral/20 focus-within:border-primary/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 focus-within:shadow-lg transition-all duration-300" aria-live="polite">
          <textarea
            ref={inputRef as any}
            value={text}
            onChange={(e) => {
              onInputChange(e.target.value);
              resize(e.target);
            }}
            onKeyPress={onKeyPress}
            placeholder={
              isBlocked ? "Cannot send messages" : "Write a message..."
            }
            disabled={isSending || isBlocked}
            rows={1}
            aria-label="Message input"
            aria-disabled={isSending || isBlocked}
            aria-multiline="true"
            maxLength={maxChars}
            className={cn(
              "w-full bg-transparent border-none px-4 py-3.5 pr-12 focus:ring-0 text-neutral placeholder-neutral-light resize-none leading-relaxed scrollbar-thin scrollbar-thumb-neutral/30 text-[15px] font-medium",
              (isSending || isBlocked) &&
                "opacity-50 cursor-not-allowed"
            )}
          />
          {/* Character counter - refined */}
          <div
            className={cn(
              "absolute right-11 top-1/2 -translate-y-1/2 text-[10px] font-semibold select-none transition-colors",
              remaining > 100 && "text-neutral-light",
              nearingLimit && remaining >= 0 && "text-warning",
              remaining < 0 && "text-danger"
            )}
            aria-live="polite"
          >
            {remaining <= 100 && (remaining <= 0 ? "Limit" : remaining)}
          </div>

          {/* Emoji picker toggle - refined */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPicker(!showPicker)}
            ref={toggleBtnRef}
            className="absolute right-2 bottom-2 text-neutral-light hover:text-primary hover:bg-primary/10 transition-all duration-200 p-2 h-9 w-9 rounded-xl"
            aria-label={showPicker ? "Close emoji picker" : "Open emoji picker"}
          >
            <Smile className="w-5 h-5" />
          </Button>
        </div>

        {/* Action buttons - refined */}
        <div className="flex gap-1.5 items-center pb-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-neutral-light hover:text-primary hover:bg-primary/10 transition-all duration-200 p-2 h-11 w-11 rounded-xl flex-shrink-0 border border-transparent hover:border-primary/20"
            title={canUseVoice ? "Record voice" : "Voice not available"}
            disabled={!canUseVoice || isSending || isBlocked || isRecording}
            onClick={startRecording}
          >
            <Mic className="w-5 h-5" />
          </Button>

          {/* Hidden file input for image uploads */}
          <input
            ref={imageInputRef}
            type="file"
            accept=".heic,.heif,image/*"
            className="hidden"
            onChange={async (e) => {
              const inputEl = e.currentTarget as HTMLInputElement | null;
              let file = inputEl?.files?.[0];
              if (!file) return;

              // Validate file size first
              const sizeValidation = validateFileSize(file);
              if (!sizeValidation.valid) {
                setImageError(sizeValidation.message!);
                showErrorToast(null, sizeValidation.message!);
                return;
              }

              // Always show a preview immediately for better UX
              setImageError(null);
              // If HEIC/HEIF, convert to JPEG in browser for preview/upload
              const isHeicLike =
                file.type === "image/heic" ||
                file.type === "image/heif" ||
                /\.(heic|heif)$/i.test(file.name || "");
              if (isHeicLike) {
                try {
                  setIsImageConverting(true);
                  showSuccessToast("Converting image…");
                  // Dynamic import to avoid bundling when not needed
                  const mod: any = await import("heic2any");
                  const convertedBlob: Blob = await mod.default({
                    blob: file,
                    toType: "image/jpeg",
                    quality: 0.85,
                  });
                  const newName = (file.name || "image").replace(
                    /\.(heic|heif)$/i,
                    ".jpg"
                  );
                  file = new File([convertedBlob], newName, {
                    type: "image/jpeg",
                  });
                } catch (convErr: any) {
                  setImageError("Couldn't convert HEIC image");
                  showErrorToast(null, "Couldn't convert HEIC image");
                  setIsImageConverting(false);
                  return;
                } finally {
                  setIsImageConverting(false);
                }
              }

              // Compress image if it's large or not a HEIC file
              if (
                !isHeicLike &&
                (file.size > 2 * 1024 * 1024 || file.type !== "image/jpeg")
              ) {
                try {
                  setIsCompressing(true);
                  setCompressionProgress(0);
                  showSuccessToast("Compressing image…");

                  const originalSize = file.size;
                  file = await compressImage(file, setCompressionProgress);

                  const compressionRatio = (
                    ((originalSize - file.size) / originalSize) *
                    100
                  ).toFixed(1);
                  showSuccessToast(
                    `Image compressed! Saved ${compressionRatio}% space`
                  );
                } catch (compErr: any) {
                  setImageError(
                    "Failed to compress image, continuing with original"
                  );
                  showErrorToast(
                    null,
                    "Failed to compress image, continuing with original"
                  );
                  // Continue with original file if compression fails
                } finally {
                  setIsCompressing(false);
                  setCompressionProgress(0);
                }
              }

              try {
                // Revoke previous preview if any
                if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
              } catch {}
              const preview = URL.createObjectURL(file);
              setImagePreviewUrl(preview);
              setImageFileName(file.name || "image");
              // If we don't have the required context, keep the preview visible and surface an error,
              // but do not attempt an upload.
              if (!conversationId || !toUserId || !props.fromUserId) {
                showErrorToast(null, "Missing conversation context");
                setImageError("Missing conversation context");
                return;
              }
              setIsImageUploading(true);
              try {
                const fd = new FormData();
                fd.append("image", file);
                fd.append("conversationId", conversationId);
                fd.append("fromUserId", props.fromUserId);
                fd.append("toUserId", toUserId);
                fd.append("fileName", file.name);
                fd.append(
                  "contentType",
                  file.type || "application/octet-stream"
                );

                // Support aborting in-flight upload
                const controller = new AbortController();
                imageAbortRef.current = controller;

                const resp = await uploadMessageImage(
                  file,
                  conversationId,
                  props.fromUserId,
                  toUserId,
                  controller.signal
                );
                if (!resp.success) {
                  let errMsg = resp.error || "Upload failed";
                  if (resp.resetTime) {
                    errMsg = `Rate limit exceeded. Try again in ${resp.resetTime}s`;
                  }
                  throw new Error(errMsg);
                }
                // Success toast
                showSuccessToast("Image sent");
                // Clear preview on success; message bubble will show the image
                try {
                  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                } catch {}
                setImagePreviewUrl(null);
                setImageFileName(null);
              } catch (err: any) {
                if (err?.name === "AbortError") {
                  showErrorToast(null, "Image upload canceled");
                } else {
                  const msg = err?.message || "Failed to send image";
                  setImageError(msg);
                  // Error toast (handles 429 and other server messages)
                  showErrorToast(null, msg);
                }
              } finally {
                setIsImageUploading(false);
                imageAbortRef.current = null;
                // reset input value to allow re-selecting the same file
                if (inputEl) inputEl.value = "";
              }
            }}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "text-neutral-light hover:text-primary hover:bg-primary/10 transition-all duration-200 p-2 h-11 w-11 rounded-xl flex-shrink-0 border border-transparent hover:border-primary/20",
              (isImageUploading || isImageConverting) &&
                "opacity-50 cursor-not-allowed"
            )}
            title={
              isCompressing
                ? `Compressing image… ${compressionProgress}%`
                : isImageConverting
                  ? "Converting image…"
                  : isImageUploading
                    ? "Uploading image…"
                    : `Send image (max ${MAX_FILE_SIZE_DISPLAY})`
            }
            disabled={
              isSending ||
              isBlocked ||
              isRecording ||
              isImageUploading ||
              isImageConverting ||
              isCompressing
            }
            onClick={() => imageInputRef.current?.click()}
          >
            {isCompressing ? (
              <div className="flex items-center gap-1">
                <LoadingSpinner size={12} />
                <span className="text-xs font-medium">{compressionProgress}%</span>
              </div>
            ) : isImageUploading || isImageConverting ? (
              <LoadingSpinner size={14} />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </Button>

          {/* Send - refined with gradient */}
          <Button
            type="submit"
            disabled={!text.trim() || isSending || isBlocked}
            className={cn(
              "bg-gradient-to-br from-primary to-primary-dark hover:from-primary-dark hover:to-primary-dark text-white font-semibold h-11 w-11 rounded-xl transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transform hover:scale-105 active:scale-95 flex items-center justify-center flex-shrink-0 ml-1",
              (!text.trim() || isSending || isBlocked) &&
                "opacity-50 cursor-not-allowed transform-none shadow-none hover:scale-100 bg-neutral/20 from-neutral/20 to-neutral/20 text-neutral-light hover:from-neutral/20 hover:to-neutral/20"
            )}
            aria-label={
              isBlocked
                ? "Messaging disabled"
                : !text.trim()
                  ? "Enter a message to send"
                  : props.editing
                    ? "Save edits"
                    : "Send message"
            }
          >
            {isSending ? (
              <LoadingSpinner size={16} className="text-white" />
            ) : (
              <Send className="w-5 h-5 ml-0.5" />
            )}
          </Button>

          {/* Inline upgrade hint when voice is unavailable - refined */}
          {!canUseVoice && needsVoiceUpgrade && !isBlocked && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs bg-gradient-to-r from-warning to-warning-dark hover:from-warning-dark hover:to-warning-dark text-white border-0 shadow-lg shadow-warning/20 rounded-xl font-semibold px-3"
              onClick={() => (window.location.href = "/subscription")}
              title="Upgrade to Premium to send voice messages"
            >
              Upgrade
            </Button>
          )}
        </div>

        {/* Emoji picker - refined container */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 400, damping: 25 }}
              className="absolute bottom-full right-0 mb-3 z-50 shadow-2xl rounded-2xl overflow-hidden border border-neutral/20"
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

      {/* Selected image preview with overlay - refined */}
      <AnimatePresence>
        {imagePreviewUrl && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, type: "spring", stiffness: 400, damping: 25 }}
            className="mt-3 relative inline-flex flex-col gap-1.5 rounded-2xl border border-neutral/20 bg-white p-2.5 shadow-lg max-w-full"
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt={imageFileName || "Selected image"}
                className="max-h-56 md:max-h-64 max-w-full h-auto rounded-xl object-contain"
              />
              {/* Close button - refined */}
              <button
                type="button"
                aria-label="Remove selected image"
                onClick={() => {
                  if (isImageUploading) return; // prevent removal mid-upload; use cancel below
                  try {
                    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                  } catch {}
                  setImagePreviewUrl(null);
                  setImageFileName(null);
                  setImageError(null);
                  if (imageInputRef.current) imageInputRef.current.value = "";
                }}
                className={cn(
                  "absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-neutral shadow ring-1 ring-neutral/10",
                  isImageUploading && "opacity-50 cursor-not-allowed"
                )}
                disabled={isImageUploading}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {/* Uploading overlay */}
              {isImageUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
                  <div className="flex items-center gap-2 text-white text-xs font-medium">
                    <LoadingSpinner size={14} /> Uploading…
                  </div>
                </div>
              )}
            </div>
            {/* Error text and cancel button when uploading */}
            <div className="flex items-center justify-between gap-2">
              {imageFileName && (
                <span
                  className="truncate text-xs text-neutral-light"
                  title={imageFileName}
                >
                  {imageFileName}
                </span>
              )}
              {isImageUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-3 rounded-lg hover:bg-neutral/10"
                  onClick={() => {
                    try {
                      imageAbortRef.current?.abort();
                    } catch {}
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
            {imageError && (
              <div className="text-xs text-danger font-medium">{imageError}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts hint - refined */}
      <div className="mt-3 text-[11px] text-neutral-light flex items-center gap-4 pl-1 select-none">
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-neutral/10 rounded text-[10px] font-medium text-neutral">Enter</kbd>
          <span>to send</span>
        </span>
        <span className="hidden sm:flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-neutral/10 rounded text-[10px] font-medium text-neutral">Shift+Enter</kbd>
          <span>for newline</span>
        </span>
      </div>

      {/* Tiny typing hint below composer - refined */}
      <AnimatePresence>
        {isOtherTyping && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-xs text-primary pl-2 font-medium flex items-center gap-1.5"
          >
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            </span>
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

      {/* Inline error under composer - refined */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-3.5 bg-danger/5 border border-danger/20 rounded-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-danger text-xs flex-1 font-medium">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-danger hover:bg-danger/10 text-xs px-3 py-1.5 h-auto rounded-lg font-medium"
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