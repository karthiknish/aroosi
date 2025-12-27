"use client";

import React from "react";
import { Mic, Image as ImageIcon, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { MAX_FILE_SIZE_DISPLAY } from "@/lib/utils/imageProcessing";

interface ComposerActionsProps {
  isSending: boolean;
  isBlocked: boolean;
  isRecording: boolean;
  canUseVoice: boolean;
  startRecording: () => void;
  isImageUploading: boolean;
  isImageConverting: boolean;
  isCompressing: boolean;
  compressionProgress: number;
  triggerImageSelect: () => void;
  text: string;
  isEditing: boolean;
  canUpgrade: boolean;
}

export function ComposerActions({
  isSending,
  isBlocked,
  isRecording,
  canUseVoice,
  startRecording,
  isImageUploading,
  isImageConverting,
  isCompressing,
  compressionProgress,
  triggerImageSelect,
  text,
  isEditing,
  canUpgrade,
}: ComposerActionsProps) {
  return (
    <div className="flex gap-1.5 items-center pb-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-neutral-light hover:text-primary p-2 h-11 w-11 rounded-xl"
        disabled={!canUseVoice || isSending || isBlocked || isRecording}
        onClick={startRecording}
        title={canUseVoice ? "Record voice" : "Voice not available"}
      >
        <Mic className="w-5 h-5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "text-neutral-light hover:text-primary p-2 h-11 w-11 rounded-xl",
          (isImageUploading || isImageConverting) && "opacity-50 cursor-not-allowed"
        )}
        disabled={isSending || isBlocked || isRecording || isImageUploading || isImageConverting || isCompressing}
        onClick={triggerImageSelect}
        title={
          isCompressing
            ? `Compressing… ${compressionProgress}%`
            : isImageConverting
            ? "Converting…"
            : isImageUploading
            ? "Uploading…"
            : `Send image (max ${MAX_FILE_SIZE_DISPLAY})`
        }
      >
        {isCompressing ? (
          <div className="flex items-center gap-1">
            <LoadingSpinner size={12} />
            <span className="text-[10px]">{compressionProgress}%</span>
          </div>
        ) : isImageUploading || isImageConverting ? (
          <LoadingSpinner size={14} />
        ) : (
          <ImageIcon className="w-5 h-5" />
        )}
      </Button>

      <Button
        type="submit"
        disabled={!text.trim() || isSending || isBlocked}
        className={cn(
          "bg-gradient-to-br from-primary to-primary-dark text-white font-semibold h-11 w-11 rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center ml-1",
          (!text.trim() || isSending || isBlocked) && "opacity-50 cursor-not-allowed bg-neutral/20 shadow-none transform-none"
        )}
      >
        {isSending ? (
          <LoadingSpinner size={16} className="text-white" />
        ) : (
          <Send className="w-5 h-5 ml-0.5" />
        )}
      </Button>

      {!canUseVoice && canUpgrade && !isBlocked && (
        <Button
          type="button"
          onClick={() => (window.location.href = "/subscription")}
          className="h-9 text-xs bg-warning text-white rounded-xl font-semibold px-3"
        >
          Upgrade
        </Button>
      )}
    </div>
  );
}
