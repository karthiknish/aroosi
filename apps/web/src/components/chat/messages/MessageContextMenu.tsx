"use client";

import React from "react";
import { Edit3, Trash, MoreVertical } from "lucide-react";
import type { MatchMessage } from "@/lib/api/matchMessages";

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
      role="menu"
      className="absolute z-50 min-w-[180px] rounded-2xl border border-neutral/20 bg-white/98 backdrop-blur-xl shadow-2xl p-2 animate-in fade-in-0 zoom-in-95"
      style={{ top: menuState.adjustedY, left: menuState.adjustedX }}
    >
      <button
        role="menuitem"
        className="w-full text-left text-sm px-3 py-2.5 rounded-xl hover:bg-primary/5 focus:bg-primary/5 focus:outline-none font-medium text-neutral transition-colors"
        onClick={() => {
          if (onSelectReply) onSelectReply(message);
          setMenuState(null);
        }}
      >
        Reply
      </button>
      
      <div className="px-3 py-2 border-t border-neutral/10 mt-1">
        <div className="text-[10px] text-neutral-light mb-2 uppercase tracking-wider font-semibold">React</div>
        <div className="flex gap-1">
          {["👍", "❤️", "😂", "😮", "🙏"].map((emoji) => (
            <button
              key={emoji}
              className="h-8 w-8 rounded-lg hover:bg-neutral/10 transition-colors flex items-center justify-center text-base"
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
          <div className="px-3 py-2 border-t border-neutral/10 mt-1">
            <div className="text-[10px] text-neutral-light mb-2 uppercase tracking-wider font-semibold">
              Your reactions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {own.map((r) => (
                <button
                  key={`${messageId}-${r.emoji}`}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral/10 hover:bg-danger/5 hover:text-danger text-sm font-medium transition-colors"
                  onClick={() => {
                    onToggleReaction?.(messageId, r.emoji);
                    setMenuState(null);
                  }}
                  aria-label={`Remove ${r.emoji} reaction`}
                >
                  {r.emoji} Remove
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {message.fromUserId === currentUserId && (message as any).type !== "voice" && (
        <div className="border-t border-neutral/10 mt-1 pt-1">
          <button
            role="menuitem"
            className="w-full text-left text-sm px-3 py-2.5 rounded-xl hover:bg-neutral/10 focus:bg-neutral/10 focus:outline-none flex items-center gap-2.5 text-neutral font-medium transition-colors"
            onClick={() => {
              onEditMessage?.(messageId, message.text || "");
              setMenuState(null);
            }}
          >
            <Edit3 className="w-4 h-4 text-neutral-light" /> Edit
          </button>
          <button
            role="menuitem"
            className="w-full text-left text-sm px-3 py-2.5 rounded-xl hover:bg-danger/5 focus:bg-danger/5 focus:outline-none text-danger flex items-center gap-2.5 font-medium transition-colors"
            onClick={() => {
              onDeleteMessage?.(messageId);
              setMenuState(null);
            }}
          >
            <Trash className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
