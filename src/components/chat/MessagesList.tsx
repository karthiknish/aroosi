"use client";
import React, { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowDown, Shield, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/lib/utils/messageUtils";
import { DeliveryStatus } from "@/components/chat/DeliveryStatus";
import VoiceMessageBubble from "@/components/chat/VoiceMessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";

import type { MatchMessage } from "@/lib/api/matchMessages";



type MessagesListProps = {
  scrollRef: RefObject<HTMLDivElement>;
  loading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  onFetchOlder: () => void | Promise<void>;
  messages: MatchMessage[];
  currentUserId: string;
  isBlocked: boolean;
  matchUserName?: string;
  matchUserAvatarUrl?: string;
  typingUsers: any[] | Record<string, unknown> | number;
  playingVoice: string | null;
  setPlayingVoice: (id: string | null) => void;
  getMessageDeliveryStatus: (id: string, isCurrentUser: boolean) => any;
  onScrollToBottom: (smooth?: boolean) => void;
  showScrollToBottom: boolean;
  lastReadAt?: number;
};

export default function MessagesList(props: MessagesListProps) {
  const {
    scrollRef,
    loading,
    loadingOlder,
    hasMore,
    onFetchOlder,
    messages,
    currentUserId,
    isBlocked,
    matchUserName,
    matchUserAvatarUrl,     typingUsers,
    playingVoice,
    setPlayingVoice,
    getMessageDeliveryStatus,
    onScrollToBottom,
    showScrollToBottom,
    lastReadAt = 0,
  } = props;

  if (loading) {
    return (
      <div className="flex-1 relative">
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>              <div className={cn("h-6 w-40 rounded-xl", i % 2 ? "bg-primary/20" : "bg-gray-200")} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex-1 relative">
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Chat Unavailable</h3>
              <p className="text-gray-500 text-sm">You cannot message this user</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const empty = !messages || messages.length === 0;

  const firstUnreadIndex = (() => {
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.createdAt > lastReadAt) return i;
    }
    return -1;
  })();

  return (
    <div className="flex-1 relative">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 bg-[radial-gradient(circle_at_20%_0%,rgba(0,0,0,0.02),transparent_60%)]"
      >
        {hasMore && !loading && !empty && (          <div className="flex items-center justify-center py-2">
            {loadingOlder ? (
              <div className="flex items-center gap-2 text-neutral-light text-sm">
                <LoadingSpinner size={16} />
                <span>Loading older messages...</span>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFetchOlder()}
                className="text-primary hover:bg-primary/10 text-sm"
              >
                Load older messages
              </Button>
            )}
          </div>
        )}

        {empty ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-light/30 to-secondary-light/30 rounded-full flex items-center justify-center mx-auto">
                <Smile className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-neutral mb-1">Start the conversation!</h3>
                <p className="text-neutral-light text-sm">Send a message to break the ice</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((msg: MatchMessage, index: number) => {
                const isCurrentUser = msg.fromUserId === currentUserId;
                const prevMsg = index > 0 ? messages[index - 1] : undefined;
                const showTime = !prevMsg || msg.createdAt - (prevMsg?.createdAt || 0) > 7 * 60 * 1000;
                const isVoice = msg.type === "voice" && !!msg.audioStorageId;

                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="space-y-1"
                  >
                    {index === firstUnreadIndex && (
                      <div className="flex items-center gap-3 my-2">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">Unread</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    )}
                        {showTime && (
                          <div className="text-center py-1">
                            <span className="text-[10px] text-gray-500 bg-gray-100/80 px-2.5 py-0.5 rounded-full shadow-sm">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          </div>
                        )}                                        <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={cn(
                          "max-w-[280px] px-4 py-3 rounded-2xl shadow-sm text-sm break-words",
                          isCurrentUser
                            ? "bg-gradient-to-br from-primary to-secondary text-white rounded-br-md"
                            : "bg-white text-gray-900 rounded-bl-md border border-gray-200"
                        )}                      >
                        {isVoice ? (
                          <VoiceMessageBubble
                            url={`/api/voice-messages/${encodeURIComponent(msg._id)}/url`}
                            durationSeconds={Number((msg as any).duration || 0)}
                            peaks={(msg as any).peaks as number[] | undefined}
                            isMine={isCurrentUser}
                            messageId={msg._id}
                          />
                        ) : (
                          <p className="leading-relaxed">{msg.text}</p>
                        )}
                        <div
                          className={cn(
                            "text-xs mt-2 flex items-center gap-1",
                            isCurrentUser ? "text-purple-100 justify-end" : "text-gray-500"
                          )}
                        >
                          <span className="tabular-nums">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>                          <DeliveryStatus
                            status={getMessageDeliveryStatus(msg._id, isCurrentUser)}
                            isCurrentUser={isCurrentUser}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Typing indicator */}
              {(Array.isArray(typingUsers) ? typingUsers.length > 0 : !!typingUsers) && (
                <TypingIndicator userName={matchUserName} avatarUrl={matchUserAvatarUrl} key="typing-indicator" />
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollToBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2"
          >
            <Button
              size="sm"
              onClick={() => onScrollToBottom(true)}
              className="rounded-full shadow-lg bg-black text-white hover:bg-black/90 h-9 px-3 py-0"
            >
              <ArrowDown className="w-4 h-4 mr-1" />
              New messages
            </Button>
          </motion.div>
        )}
      </AnimatePresence>    </div>
  );
}