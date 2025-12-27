"use client";

import React from "react";
import { motion } from "framer-motion";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/lib/utils/messageUtils";
import { DeliveryStatus } from "@/components/chat/DeliveryStatus";
import VoiceMessageBubble from "@/components/chat/VoiceMessageBubble";
import ImageMessageBubble from "@/components/chat/ImageMessageBubble";
import type { MatchMessage } from "@/lib/api/matchMessages";

interface MessageItemProps {
  msg: MatchMessage;
  index: number;
  currentUserId: string;
  highlightedId: string | null;
  otherLastReadAt: number;
  getMessageDeliveryStatus: (id: string, isCurrentUser: boolean) => any;
  onOpenContextMenu: (x: number, y: number, msg: MatchMessage) => void;
  onPointerDown: (e: React.PointerEvent, msg: MatchMessage) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onScrollToMessage: (id: string) => void;
  onToggleReaction?: (id: string, emoji: string) => void;
  getReactionsForMessage?: (id: string) => Array<{ emoji: string; count: number; reactedByMe: boolean }>;
  groupInfo: {
    showTime: boolean;
    isNewDay: boolean;
    isFirstOfGroup: boolean;
    isLastOfGroup: boolean;
  };
  makeReplySnippet: (msg: MatchMessage) => string;
  isFirstUnread: boolean;
  isLastSeen: boolean;
}

export function MessageItem({
  msg,
  index,
  currentUserId,
  highlightedId,
  otherLastReadAt,
  getMessageDeliveryStatus,
  onOpenContextMenu,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onScrollToMessage,
  onToggleReaction,
  getReactionsForMessage,
  groupInfo,
  makeReplySnippet,
  isFirstUnread,
  isLastSeen,
}: MessageItemProps) {
  const isCurrentUser = msg.fromUserId === currentUserId;
  const { showTime, isNewDay, isFirstOfGroup, isLastOfGroup } = groupInfo;
  const messageId = (msg.id || msg._id) as string;

  const isVoice = msg.type === "voice" && (msg.audioStorageId || (msg as any).audioStorageId);
  const isImage = msg.type === "image" && (msg.audioStorageId || (msg as any).audioStorageId);
  const hasReply = !!msg.replyToMessageId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="space-y-1"
    >
      {isNewDay && (
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral/20 to-transparent" />
          <span className="text-[11px] font-semibold text-neutral-light uppercase tracking-wider bg-white/80 px-3 py-1 rounded-full border border-neutral/10 shadow-sm">
            {new Date(Number(msg.createdAt)).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral/20 to-transparent" />
        </div>
      )}
      
      {isFirstUnread && (
        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
            New Messages
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        </div>
      )}

      {isLastSeen && (
        <div className="flex items-center gap-4 my-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-success/60 to-transparent" />
          <span className="text-[10px] font-medium text-success bg-success/5 px-2.5 py-0.5 rounded-full">
            Seen
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-success/60 to-transparent" />
        </div>
      )}

      {showTime && (
        <div className="text-center py-2">
          <span className="text-[10px] text-neutral-light font-medium tracking-wide">
            {formatMessageTime(msg.createdAt)}
          </span>
        </div>
      )}

      <div className={cn("flex", isCurrentUser ? "justify-end" : "justify-start")}>
        <div className="relative group inline-block pt-1">
          <div
            className={cn(
              "relative max-w-[85%] sm:max-w-[360px] px-4 py-3 text-[15px] leading-relaxed break-words transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation",
              highlightedId === messageId && "ring-2 ring-primary/50 shadow-xl scale-[1.02]",
              isCurrentUser
                ? "text-white bg-gradient-to-br from-primary via-primary to-primary-dark shadow-lg shadow-primary/20"
                : "text-neutral bg-white shadow-md shadow-neutral/5 border border-neutral/10",
              isCurrentUser
                ? cn(
                    "rounded-[22px] rounded-br-[6px]",
                    !isFirstOfGroup && "rounded-tr-[6px]",
                    !isLastOfGroup && "rounded-br-[22px]"
                  )
                : cn(
                    "rounded-[22px] rounded-bl-[6px]",
                    !isFirstOfGroup && "rounded-tl-[6px]",
                    !isLastOfGroup && "rounded-bl-[22px]"
                  ),
              !isFirstOfGroup && "mt-0.5"
            )}
            data-message-id={messageId}
            tabIndex={0}
            role="button"
            onContextMenu={(e) => {
              e.preventDefault();
              onOpenContextMenu(e.clientX, e.clientY, msg);
            }}
            onPointerDown={(e) => onPointerDown(e, msg)}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            onPointerCancel={onPointerCancel}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onOpenContextMenu(rect.left + rect.width / 2, rect.top + 8, msg);
              }
            }}
            aria-label={`Message ${isCurrentUser ? "sent" : "received"} at ${new Date(Number(msg.createdAt)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          >
            {hasReply && (
              <button
                type="button"
                className={cn(
                  "mb-2.5 pl-3 pr-2 py-1.5 border-l-2 rounded-lg text-xs w-full text-left transition-all duration-200 focus:outline-none focus:ring-1",
                  isCurrentUser
                    ? "border-white/40 bg-white/15 text-white/90 hover:bg-white/20 focus:ring-white/30"
                    : "border-primary/60 bg-primary/5 text-neutral hover:bg-primary/10 focus:ring-primary/50"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (msg.replyToMessageId) onScrollToMessage(msg.replyToMessageId);
                }}
              >
                <span className="block truncate max-w-[250px] pointer-events-none font-medium">
                  {makeReplySnippet(msg)}
                </span>
              </button>
            )}

            {isCurrentUser && msg.type === "text" && (
              <button
                type="button"
                className="absolute -top-2 -right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 bg-white rounded-xl border border-neutral/20 shadow-lg p-1.5 hover:bg-neutral/5 hover:scale-110 active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  onOpenContextMenu(rect.right, rect.top, msg);
                }}
              >
                <MoreVertical className="w-3.5 h-3.5 text-neutral-light" />
              </button>
            )}

            {msg.deleted || (msg as any).deleted ? (
              <p className="text-xs italic text-neutral-light">This message was deleted</p>
            ) : isVoice ? (
              <VoiceMessageBubble
                url={`/api/voice-messages/${encodeURIComponent(messageId)}/url`}
                durationSeconds={Number(msg.duration || (msg as any).duration || 0)}
                peaks={(msg as any).peaks as number[] | undefined}
                isMine={isCurrentUser}
                messageId={messageId}
              />
            ) : isImage ? (
              <ImageMessageBubble
                messageId={messageId}
                isMine={isCurrentUser}
                mimeType={msg.mimeType || (msg as any).mimeType}
              />
            ) : (
              <p className="leading-relaxed whitespace-pre-wrap text-sm font-normal">{msg.text}</p>
            )}

            {getReactionsForMessage && (() => {
              const reactions = getReactionsForMessage(messageId);
              if (!reactions || reactions.length === 0) return null;
              return (
                <div
                  className={cn(
                    "absolute z-10 flex gap-1",
                    isCurrentUser ? "bottom-2 right-1 justify-end" : "bottom-2 left-1 justify-start"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {reactions.map((r) => (
                    <button
                      key={`${messageId}-${r.emoji}`}
                      type="button"
                      className={cn(
                        "relative h-7 w-7 rounded-xl border bg-white shadow-md flex items-center justify-center text-sm transition-all duration-200 hover:scale-110 active:scale-95 focus:ring-2 focus:ring-primary/50 focus:outline-none",
                        r.reactedByMe
                          ? "border-primary/60 ring-2 ring-primary/40 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg"
                          : "border-neutral/20 hover:border-primary/60 hover:shadow-lg"
                      )}
                      onClick={() => onToggleReaction?.(messageId, r.emoji)}
                    >
                      <span className="leading-none select-none text-xs">{r.emoji}</span>
                      {r.count > 1 && (
                        <span className={cn(
                          "absolute -bottom-1 -right-1 text-[9px] leading-none rounded-full px-1 py-0.5 bg-neutral-dark text-white shadow-md min-w-[16px] h-[16px] flex items-center justify-center font-bold",
                          r.reactedByMe && "bg-primary"
                        )}>
                          {r.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })()}

            <div className={cn(
              "text-[11px] mt-2.5 flex items-center gap-1.5 font-medium",
              isCurrentUser ? "text-white/70 justify-end" : "text-neutral-light"
            )}>
              <span className="tabular-nums">
                {new Date(Number(msg.createdAt)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              {(msg as any).edited && (
                <span className={cn("text-[10px] italic", isCurrentUser ? "text-white/50" : "text-neutral-light")}>
                  • edited
                </span>
              )}
              <DeliveryStatus
                status={(() => {
                  const base = getMessageDeliveryStatus(messageId, isCurrentUser);
                  if (!isCurrentUser) return base;
                  if (otherLastReadAt && Number(msg.createdAt) <= otherLastReadAt) return "read" as const;
                  const cs = (msg as any).clientStatus;
                  if (cs === "pending") return "sending" as const;
                  if (cs === "failed") return "failed" as const;
                  return base;
                })()}
                isCurrentUser={isCurrentUser}
              />
            </div>

            {isCurrentUser && (msg as any).clientStatus === "failed" && (
              <div className="mt-1.5 text-right">
                <button
                  className="text-[11px] text-danger font-medium hover:underline"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("retryMessage", {
                      detail: { tempId: messageId, text: msg.text },
                    }));
                  }}
                >
                  Tap to retry
                </button>
              </div>
            )}
          </div>

          {onToggleReaction && (
            <div
              className={cn(
                "absolute top-0 z-20",
                isCurrentUser ? "right-2" : "left-2",
                "opacity-0 group-hover:opacity-100 transition-all duration-200"
              )}
              role="toolbar"
            >
              <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-neutral/20 shadow-lg rounded-xl px-2 py-1.5">
                {["👍", "❤️", "😂", "😮", "🙏"].map((emoji) => (
                  <button
                    key={`${messageId}-${emoji}`}
                    type="button"
                    className="h-7 w-7 text-[14px] leading-none rounded-lg hover:bg-neutral/10 active:scale-90 transition-all duration-150"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleReaction(messageId, emoji);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
