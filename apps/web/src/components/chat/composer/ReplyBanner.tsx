"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MessageType } from "@aroosi/shared/types";

interface ReplyBannerProps {
  replyTo?: {
    messageId: string;
    text?: string;
    type?: MessageType;
    fromUserId?: string;
  };
  onCancelReply?: () => void;
}

export function ReplyBanner({ replyTo, onCancelReply }: ReplyBannerProps) {
  if (!replyTo) return null;

  return (
    <div className="absolute -top-16 left-0 right-0 mb-2 flex items-start gap-2.5 bg-white border border-neutral/20 rounded-xl p-3 shadow-lg animate-in fade-in slide-in-from-bottom-2">
      <div className="w-1 h-full bg-gradient-to-b from-primary to-primary/60 rounded-full absolute left-3 top-3 bottom-3" />
      <div className="flex-1 overflow-hidden pl-3">
        <p className="text-[10px] uppercase tracking-wider text-neutral-light mb-0.5 font-semibold">
          Replying to
        </p>
        <p className="text-xs text-neutral line-clamp-2 break-words font-medium">
          {replyTo.type === "voice" ? "Voice message" : replyTo.text || "(no text)"}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 rounded-lg"
        onClick={onCancelReply}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
