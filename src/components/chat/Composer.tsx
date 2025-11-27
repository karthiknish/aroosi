"use client";
import React, {
  RefObject,
  useCallback,
  useMemo,
  useState,
  useLayoutEffect,
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
    conversationId,
    onSendVoice,
    onVoiceError,
    setMessageFeedback,
    messageFeedback,
    peaks,
    stop,
    toUserId,
  ]);

  const recordingBanner = (isRecording || isPaused || isUploading) && (
    <div className="mb-3 p-3 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 flex items-end gap-1">
            {/* Lightweight bars from peaks */}
            {peaks.length > 0 ? (
              peaks.map((p, i) => (
                <div
                  key={i}
                  className="w-1 bg-pink-500 rounded-sm"
                  style={{ height: `${Math.max(10, p * 28)}px` }}
                  title={`${i}`}
                />
              ))
            ) : (
              <div className="text-xs text-gray-500">Recording…</div>
            )}
          </div>
          <div
            className={cn(
              "text-sm font-medium",
              isPaused ? "text-orange-600" : "text-pink-600"
            )}
          >
            {isUploading ? "Uploading…" : isPaused ? "Paused" : "Recording"}
          </div>
          <div className="text-xs text-gray-600">
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
                  onClick={stopAndUpload}
                  className="h-8"
                >
                  <Square className="w-4 h-4 mr-1" /> Stop & Send
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
      </div>
      {uploadError && (
        <div className="mt-2 text-xs text-red-600">{uploadError}</div>
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
      className="p-4 bg-white"
      aria-label="Message composer"
      role="group"
    >
      {/* Editing banner */}
      {props.editing && (
        <div className="mb-2 p-2 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-800 flex items-center justify-between">
          <div className="truncate mr-2">Editing message</div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2"
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
        className="flex items-end gap-2 relative"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSend(text);
        }}
      >
        {replyTo && (
          <div className="absolute -top-14 left-0 right-0 mb-2 flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-2 shadow-sm animate-in fade-in slide-in-from-bottom-1">
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                Replying to
              </p>
              <p className="text-xs text-gray-700 line-clamp-2 break-words">
                {replyTo.type === "voice"
                  ? "Voice message"
                  : replyTo.text || "(no text)"}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2 -mt-1"
              onClick={onCancelReply}
              aria-label="Cancel reply"
            >
              ✕
            </Button>
          </div>
        )}
        <div className="flex-1 relative bg-slate-100 rounded-[24px] border border-transparent focus-within:border-primary/30 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-200" aria-live="polite">
          <textarea
            ref={inputRef as any}
            value={text}
            onChange={(e) => {
              onInputChange(e.target.value);
              resize(e.target);
            }}
            onKeyPress={onKeyPress}
            placeholder={
              isBlocked ? "Cannot send messages" : "Type a message..."
            }
            disabled={isSending || isBlocked}
            rows={1}
            aria-label="Message input"
            aria-disabled={isSending || isBlocked}
            aria-multiline="true"
            maxLength={maxChars}
            className={cn(
              "w-full bg-transparent border-none px-4 py-3 pr-10 focus:ring-0 text-slate-900 placeholder-slate-500 resize-none leading-relaxed scrollbar-thin scrollbar-thumb-gray-300 text-[15px]",
              (isSending || isBlocked) &&
                "opacity-50 cursor-not-allowed"
            )}
          />
          {/* Character counter */}
          <div
            className={cn(
              "absolute right-10 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 select-none",
              nearingLimit && remaining >= 0 && "text-orange-500",
              remaining < 0 && "text-red-600"
            )}
            aria-live="polite"
          >
            {remaining <= 0 ? "Limit" : `${remaining}`}
          </div>

          {/* Emoji picker toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPicker(!showPicker)}
            ref={toggleBtnRef}
            className="absolute right-2 bottom-1.5 text-slate-400 hover:text-primary hover:bg-transparent transition-colors p-2 h-8 w-8 rounded-full"
            aria-label={showPicker ? "Close emoji picker" : "Open emoji picker"}
          >
            <Smile className="w-5 h-5" />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 items-center pb-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors p-2 h-10 w-10 rounded-full flex-shrink-0"
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
              "text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors p-2 h-10 w-10 rounded-full flex-shrink-0",
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
                <span className="text-xs">{compressionProgress}%</span>
              </div>
            ) : isImageUploading || isImageConverting ? (
              <LoadingSpinner size={14} />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </Button>

          {/* Send */}
          <Button
            type="submit"
            disabled={!text.trim() || isSending || isBlocked}
            className={cn(
              "bg-primary hover:bg-primary/90 text-white font-medium h-10 w-10 rounded-full transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 flex items-center justify-center flex-shrink-0 ml-1",
              (!text.trim() || isSending || isBlocked) &&
                "opacity-50 cursor-not-allowed transform-none shadow-none hover:scale-100 bg-slate-200 text-slate-400 hover:bg-slate-200"
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

          {/* Inline upgrade hint when voice is unavailable */}
          {!canUseVoice && needsVoiceUpgrade && !isBlocked && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-[#BFA67A] hover:bg-[#a89263] text-white border-0 shadow-sm"
              onClick={() => (window.location.href = "/subscription")}
              title="Upgrade to Premium to send voice messages"
            >
              Upgrade to Premium
            </Button>
          )}
        </div>

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

      {/* Selected image preview with overlay */}
      <AnimatePresence>
        {imagePreviewUrl && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="mt-2 relative inline-flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-sm max-w-full"
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt={imageFileName || "Selected image"}
                className="max-h-56 md:max-h-64 max-w-full h-auto rounded-lg object-contain"
              />
              {/* Close button */}
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
                  "absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow ring-1 ring-gray-200",
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
                  className="truncate text-xs text-gray-500"
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
                  className="h-7 text-xs px-2"
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
              <div className="text-xs text-red-600">{imageError}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts hint */}
      <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-3 pl-1 select-none">
        <span>Press Enter to send</span>
        <span className="hidden sm:inline">Shift+Enter for newline</span>
      </div>

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