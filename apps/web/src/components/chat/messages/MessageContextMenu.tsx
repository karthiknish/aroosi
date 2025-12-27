"use client";

import React from "react";
import { Edit3, Trash, Reply, Smile } from "lucide-react";
import type { MatchMessage } from "@/lib/api/matchMessages";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "@/components/ui/context-menu";

interface MessageContextMenuProps {
  menuState: {
    adjustedX: number;
    adjustedY: number;
    message: MatchMessage;
  };
  currentUserId: string;
  onSelectReply?: (m: MatchMessage) => void;
  onEditMessage?: (id: string, currentText: string) => void;
  onDeleteMessage?: (id: string) => void;
  onToggleReaction?: (id: string, emoji: string) => void;
  getReactionsForMessage?: (id: string) => any[];
  setMenuState: (state: any) => void;
}

export function MessageContextMenu({
  menuState,
  currentUserId,
  onSelectReply,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  getReactionsForMessage,
  setMenuState,
}: MessageContextMenuProps) {
  const { message } = menuState;
  const messageId = (message.id || message._id) as string;

  return (
    <div
      id="chat-msg-context-menu"
      className="absolute z-50"
      style={{ top: menuState.adjustedY, left: menuState.adjustedX }}
    >
      <ContextMenuContent className="w-56 shadow-2xl border-neutral/20 bg-white/98 backdrop-blur-xl rounded-2xl p-1.5">
        <ContextMenuItem
          className="rounded-xl px-3 py-2.5 focus:bg-primary/5 focus:text-primary cursor-pointer gap-2.5 font-medium"
          onClick={() => {
            if (onSelectReply) onSelectReply(message);
            setMenuState(null);
          }}
        >
          <Reply className="w-4 h-4" />
          Reply
        </ContextMenuItem>
        
        <ContextMenuSeparator className="bg-neutral/10 my-1" />
        
        <div className="px-2 py-2">
          <ContextMenuLabel className="text-[10px] text-neutral-light uppercase tracking-wider font-bold px-1 mb-2 flex items-center gap-1.5">
            <Smile className="w-3 h-3" />
            Quick React
          </ContextMenuLabel>
          <div className="flex justify-between px-1">
            {["👍", "❤️", "😂", "😮", "🙏"].map((emoji) => (
              <button
                key={emoji}
                className="h-9 w-9 rounded-xl hover:bg-neutral/10 active:scale-90 transition-all flex items-center justify-center text-lg"
                onClick={() => {
                  onToggleReaction?.(messageId, emoji);
                  setMenuState(null);
                }}
                aria-label={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {getReactionsForMessage && (() => {
          const own = getReactionsForMessage(messageId).filter((r) => r.reactedByMe);
          if (!own || own.length === 0) return null;
          return (
            <>
              <ContextMenuSeparator className="bg-neutral/10 my-1" />
              <div className="px-2 py-2">
                <ContextMenuLabel className="text-[10px] text-neutral-light uppercase tracking-wider font-bold px-1 mb-2">
                  Your reactions
                </ContextMenuLabel>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {own.map((r) => (
                    <button
                      key={`${messageId}-${r.emoji}`}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral/10 hover:bg-danger/5 hover:text-danger text-xs font-semibold transition-colors flex items-center gap-1.5"
                      onClick={() => {
                        onToggleReaction?.(messageId, r.emoji);
                        setMenuState(null);
                      }}
                    >
                      {r.emoji} <span className="opacity-60">Remove</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

        {message.fromUserId === currentUserId && (message as any).type !== "voice" && (
          <>
            <ContextMenuSeparator className="bg-neutral/10 my-1" />
            <ContextMenuItem
              className="rounded-xl px-3 py-2.5 focus:bg-neutral/5 cursor-pointer gap-2.5 font-medium"
              onClick={() => {
                onEditMessage?.(messageId, message.text || "");
                setMenuState(null);
              }}
            >
              <Edit3 className="w-4 h-4 text-neutral-light" />
              Edit Message
            </ContextMenuItem>
            <ContextMenuItem
              className="rounded-xl px-3 py-2.5 focus:bg-danger/5 focus:text-danger text-danger cursor-pointer gap-2.5 font-medium"
              onClick={() => {
                onDeleteMessage?.(messageId);
                setMenuState(null);
              }}
            >
              <Trash className="w-4 h-4" />
              Delete Message
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </div>
  );
}
