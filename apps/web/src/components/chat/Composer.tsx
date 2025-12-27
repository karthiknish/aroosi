"use client";

import React, { RefObject, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Smile, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { MessageFeedback } from "@/components/ui/MessageFeedback";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { isPremium } from "@/lib/utils/subscriptionPlan";
import MicPermissionDialog from "@/components/chat/MicPermissionDialog";
import type { MessageType } from "@aroosi/shared/types";

// Sub-components
import { VoiceBanner } from "./composer/VoiceBanner";
import { ImagePreviewBanner } from "./composer/ImagePreviewBanner";
import { ReplyBanner } from "./composer/ReplyBanner";
import { ComposerActions } from "./composer/ComposerActions";

// Hooks
import { useComposerState } from "@/hooks/useComposerState";
import { useVoiceComposer } from "@/hooks/useVoiceComposer";
import { useImageComposer } from "@/hooks/useImageComposer";

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
  conversationId?: string;
  toUserId?: string;
  fromUserId?: string;
  isOtherTyping?: boolean;
  replyTo?: {
    messageId: string;
    text?: string;
    type?: MessageType;
    fromUserId?: string;
  };
  onCancelReply?: () => void;
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
    onVoiceUpgradeRequired,
    onVoiceError,
    conversationId,
    toUserId,
    fromUserId,
    isOtherTyping = false,
    replyTo,
    onCancelReply,
  } = props;

  const { profile: authProfile } = useAuthContext();
  const needsVoiceUpgrade = useMemo(() => {
    const plan = (authProfile as any)?.subscriptionPlan as string | undefined;
    return !!authProfile && !isPremium(plan);
  }, [authProfile]);

  const [micHelpOpen, setMicHelpOpen] = useState(false);

  const {
    showFeedback,
    hideFeedback,
    resize,
  } = useComposerState(text, setText, inputRef as any);

  const voice = useVoiceComposer({
    conversationId,
    toUserId,
    onSendVoice: props.onSendVoice,
    onVoiceError,
    showFeedback,
    hideFeedback,
  });

  const image = useImageComposer({
    conversationId,
    fromUserId,
    toUserId,
  });

  const canUseVoice = useMemo(
    () => voice.mediaSupported && voice.mediaRecorderSupported && props.canSendVoice && !isBlocked,
    [voice.mediaSupported, voice.mediaRecorderSupported, props.canSendVoice, isBlocked]
  );

  const handleStartRecording = async () => {
    if (!canUseVoice) {
      onVoiceUpgradeRequired?.();
      return;
    }
    // Simple permission check (dialog managed locally)
    voice.start().catch((err) => {
      if (err?.name === "NotAllowedError") setMicHelpOpen(true);
    });
  };

  const maxChars = 2000;
  const remaining = maxChars - text.length;

  return (
    <div className="p-4 sm:p-5" aria-label="Message composer" role="group">
      {props.editing && (
        <div className="mb-3 p-3 rounded-xl border border-warning/20 bg-warning/5 text-xs text-warning flex items-center justify-between shadow-sm">
          <div className="truncate mr-2 font-medium">Editing message</div>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs px-3" onClick={props.onCancelEdit}>
            Cancel
          </Button>
        </div>
      )}

      <MessageFeedback
        type={props.messageFeedback.type}
        message={props.messageFeedback.message}
        isVisible={props.messageFeedback.isVisible}
        onClose={() => props.setMessageFeedback({ ...props.messageFeedback, isVisible: false })}
      />

      <VoiceBanner {...voice} />

      <MicPermissionDialog
        open={micHelpOpen}
        onClose={() => setMicHelpOpen(false)}
        onRetry={async () => {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicHelpOpen(false);
            await voice.start();
          } catch (e) {}
        }}
      />

      <form
        className="flex items-end gap-2.5 relative"
        onSubmit={(e) => {
          e.preventDefault();
          onSend(text);
        }}
      >
        <ReplyBanner replyTo={replyTo} onCancelReply={onCancelReply} />

        <div className="flex-1 relative bg-neutral/5 rounded-2xl border border-neutral/20 focus-within:border-primary/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300">
          <Textarea
            ref={inputRef as any}
            value={text}
            onChange={(e) => {
              onInputChange(e.target.value);
              resize(e.target);
            }}
            onKeyPress={onKeyPress}
            placeholder={isBlocked ? "Cannot send messages" : "Write a message..."}
            disabled={isSending || isBlocked}
            rows={1}
            maxLength={maxChars}
            className={cn(
              "w-full bg-transparent border-none px-4 py-3.5 pr-12 focus:ring-0 text-neutral placeholder-neutral-light resize-none leading-relaxed text-[15px] font-medium min-h-0",
              (isSending || isBlocked) && "opacity-50 cursor-not-allowed"
            )}
          />
          <motion.div
            animate={remaining <= 0 ? { x: [0, -5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={cn(
              "absolute right-11 top-1/2 -translate-y-1/2 text-[10px] font-bold transition-all duration-300",
              remaining > 200 ? "text-neutral-light/40" : 
              remaining > 100 ? "text-neutral-light" :
              remaining > 50 ? "text-warning" :
              remaining > 0 ? "text-warning-dark font-extrabold scale-110" : 
              "text-danger font-black scale-125"
            )}
          >
            {remaining <= 0 ? "LIMIT" : remaining}
          </motion.div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPicker(!showPicker)}
            ref={toggleBtnRef}
            className="absolute right-2 bottom-2 text-neutral-light hover:text-primary p-2 h-9 w-9 rounded-xl"
          >
            <Smile className="w-5 h-5" />
          </Button>
        </div>

        <ComposerActions
          isSending={isSending}
          isBlocked={isBlocked}
          isRecording={voice.isRecording}
          canUseVoice={canUseVoice}
          startRecording={handleStartRecording}
          isImageUploading={image.isUploading}
          isImageConverting={image.isConverting}
          isCompressing={image.isCompressing}
          compressionProgress={image.compressionProgress}
          triggerImageSelect={() => image.inputRef.current?.click()}
          text={text}
          isEditing={!!props.editing}
          canUpgrade={needsVoiceUpgrade}
        />

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-full right-0 mb-3 z-50 shadow-2xl rounded-2xl overflow-hidden border border-neutral/20"
            >
              <EmojiPicker
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

      <input
        ref={image.inputRef}
        type="file"
        accept=".heic,.heif,image/*"
        className="hidden"
        onChange={image.handleFileSelect}
      />

      <ImagePreviewBanner
        previewUrl={image.previewUrl}
        fileName={image.fileName}
        error={image.error}
        isUploading={image.isUploading}
        cancelUpload={image.cancelUpload}
        removePreview={image.removePreview}
      />

      <div className="mt-3 text-[11px] text-neutral-light flex items-center gap-4 pl-1">
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-neutral/10 rounded">Enter</kbd> to send
        </span>
        <span className="hidden sm:flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-neutral/10 rounded">Shift+Enter</kbd> for newline
        </span>
      </div>

      <AnimatePresence>
        {isOtherTyping && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
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

      <AnimatePresence>
        {props.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-3.5 bg-danger/5 border border-danger/20 rounded-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-danger text-xs font-medium">{props.error}</p>
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-danger h-auto rounded-lg text-xs font-medium px-3 py-1.5">
                Retry
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}