"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowDown, Shield, Smile, Sparkles, Lightbulb, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import type { MatchMessage } from "@/lib/api/matchMessages";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";

const STARTERS = [
  "What's something that made you smile today?",
  "If you could travel anywhere right now, where would it be?",
  "What's your favorite way to spend a weekend?",
  "What's a hobby you've always wanted to try?",
  "What's the best meal you've had recently?",
];

const TIPS = [
  "Ask open-ended questions to keep the conversation flowing.",
  "Share a small detail about your day to build connection.",
  "Mention something specific from their profile that caught your eye.",
  "Be yourself—authenticity is the best foundation.",
];

import { useHighlightTimeout } from "@/hooks/useHighlightTimeout";
import { useMessagesSearch } from "@/hooks/useMessagesSearch";
import { useMessagesContextMenu } from "@/hooks/useMessagesContextMenu";
import { useMessagesInfiniteScroll } from "@/hooks/useMessagesInfiniteScroll";
import { useMessagesGrouping } from "@/hooks/useMessagesGrouping";

import { MessageSearchOverlay } from "./messages/MessageSearchOverlay";
import { MessageItem } from "./messages/MessageItem";
import { MessageContextMenu } from "./messages/MessageContextMenu";
import { ScrollArea } from "@/components/ui/scroll-area";

type MessagesListProps = {
  scrollRef: React.RefObject<HTMLDivElement>;
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
  otherLastReadAt?: number;
  onUnblock?: () => void;
  onSelectReply?: (m: MatchMessage) => void;
  onEditMessage?: (id: string, currentText: string) => void;
  onDeleteMessage?: (id: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  getReactionsForMessage?: (
    messageId: string
  ) => Array<{ emoji: string; count: number; reactedByMe: boolean }>;
  onSelectStarter?: (text: string) => void;
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
    matchUserAvatarUrl,
    typingUsers,
    getMessageDeliveryStatus,
    onScrollToBottom,
    showScrollToBottom,
    lastReadAt = 0,
    otherLastReadAt = 0,
    onUnblock,
    onSelectReply,
    onEditMessage,
    onDeleteMessage,
    onToggleReaction,
    getReactionsForMessage,
    onSelectStarter,
  } = props;

  const [highlightedId, setHighlightedId] = useHighlightTimeout();
  
  const {
    searchQuery,
    setSearchQuery,
    showSearch,
    setShowSearch,
    searchResults,
    currentSearchIndex,
    navigateSearch,
  } = useMessagesSearch(messages, scrollRef);

  const {
    menuState,
    setMenuState,
    openContextMenu,
    handlePointerDown,
    clearLongPress,
  } = useMessagesContextMenu();

  const { loadMoreRef } = useMessagesInfiniteScroll({
    scrollRef,
    hasMore,
    loading,
    loadingOlder,
    onFetchOlder,
  });

  const {
    firstUnreadIndex,
    lastSeenSeparatorIndex,
    unreadCount,
    makeReplySnippet,
    getMessageGroupInfo,
  } = useMessagesGrouping({
    messages,
    currentUserId,
    lastReadAt,
    otherLastReadAt,
  });

  const virtuosoRef = React.useRef<VirtuosoHandle>(null);

  const scrollToMessage = (targetId: string) => {
    if (!scrollRef.current) return;
    const index = messages.findIndex(m => (m.id || m._id) === targetId);
    if (index !== -1 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index,
        align: "center",
        behavior: "smooth",
      });
      setHighlightedId(targetId);
    }
  };

  const empty = !messages || messages.length === 0;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
            <div className={cn(
              "h-8 rounded-2xl animate-pulse",
              i % 2 ? "w-48 bg-gradient-to-r from-primary/10 to-primary/5" : "w-44 bg-gradient-to-r from-neutral/10 to-neutral/5"
            )} />
          </div>
        ))}
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 px-6">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Shield className="w-9 h-9 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-neutral text-lg tracking-tight">Chat Unavailable</h3>
            <p className="text-neutral-light text-sm max-w-xs mx-auto">
              You cannot message this user at this time
            </p>
          </div>
          {onUnblock && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 rounded-xl border-neutral/20 hover:bg-neutral/5"
              onClick={onUnblock}
            >
              Unblock User
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col h-full min-h-0"
      data-messages-list
      ref={(el) => {
        if (el) {
          const handleToggleSearch = () => setShowSearch((prev) => !prev);
          el.addEventListener("toggleSearch", handleToggleSearch);
          return () => el.removeEventListener("toggleSearch", handleToggleSearch);
        }
      }}
    >
      <MessageSearchOverlay
        showSearch={showSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setShowSearch={setShowSearch}
        searchResults={searchResults}
        currentSearchIndex={currentSearchIndex}
        navigateSearch={navigateSearch}
      />

      <div className="flex-1 min-h-0 relative">
        {empty ? (
          <div className="flex flex-col items-center justify-center min-h-full py-12 px-6 space-y-10">
            {/* Header Section */}
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-warning/10 to-primary/10 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-warning/20 relative">
                <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-3xl -z-10" />
                <Smile className="w-10 h-10 text-warning animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-neutral text-2xl tracking-tight">
                  Start the conversation!
                </h3>
                <p className="text-neutral-light text-sm max-w-[260px] mx-auto leading-relaxed">
                  Break the ice with {matchUserName || "your match"} and see where it leads.
                </p>
              </div>
            </div>

            {/* Conversation Starters */}
            <div className="w-full max-w-sm space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral/60">
                  Conversation Starters
                </span>
              </div>
              <div className="grid gap-2.5">
                {STARTERS.map((starter, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Button
                      variant="ghost"
                      onClick={() => onSelectStarter?.(starter)}
                      className="w-full h-auto text-left p-4 rounded-2xl bg-white border border-neutral/10 hover:border-primary/30 hover:bg-primary/5 transition-all group relative overflow-hidden shadow-sm active:scale-[0.98] flex items-start gap-3"
                    >
                      <MessageSquare className="w-4 h-4 text-primary/40 mt-0.5 group-hover:text-primary transition-colors shrink-0" />
                      <span className="text-sm text-neutral/80 group-hover:text-neutral transition-colors leading-snug whitespace-normal">
                        {starter}
                      </span>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Pro Tips */}
            <div className="w-full max-w-sm p-5 rounded-3xl bg-gradient-to-br from-neutral/5 to-transparent border border-neutral/10 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-warning" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral/60">
                  Pro Tips
                </span>
              </div>
              <ul className="space-y-2.5">
                {TIPS.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-neutral-light leading-relaxed">
                    <div className="w-1 h-1 rounded-full bg-warning/40 mt-1.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            initialTopMostItemIndex={messages.length - 1}
            followOutput="smooth"
            className="flex-1 min-h-0 chat-scrollbar focus:outline-none"
            startReached={onFetchOlder}
            increaseViewportBy={200}
            itemContent={(index, msg) => (
              <div className="px-4 py-1">
                <MessageItem
                  key={msg.id || msg._id}
                  msg={msg}
                  index={index}
                  currentUserId={currentUserId}
                  highlightedId={highlightedId}
                  otherLastReadAt={otherLastReadAt}
                  getMessageDeliveryStatus={getMessageDeliveryStatus}
                  onOpenContextMenu={openContextMenu}
                  onPointerDown={handlePointerDown}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onScrollToMessage={scrollToMessage}
                  onToggleReaction={onToggleReaction}
                  getReactionsForMessage={getReactionsForMessage}
                  groupInfo={getMessageGroupInfo(msg, index)}
                  makeReplySnippet={makeReplySnippet}
                  isFirstUnread={index === firstUnreadIndex}
                  isLastSeen={index === lastSeenSeparatorIndex}
                />
              </div>
            )}
            components={{
              Header: () => (
                <div className="pt-5">
                  {hasMore && (
                    <div className="flex items-center justify-center py-4">
                      {loadingOlder ? (
                        <div className="flex items-center gap-2 text-neutral-light text-sm bg-white/80 px-4 py-2 rounded-full shadow-sm border border-neutral/10">
                          <LoadingSpinner size={16} />
                          <span>Loading older messages...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-neutral-light text-xs">
                          <div className="w-6 h-[1px] bg-neutral/20" />
                          <span>Scroll up for more</span>
                          <div className="w-6 h-[1px] bg-neutral/20" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
              Footer: () => (
                <div className="pb-5 px-4">
                  <AnimatePresence>
                    {Array.isArray(typingUsers) && typingUsers.length > 0 && (
                      <TypingIndicator
                        userName={matchUserName}
                        avatarUrl={matchUserAvatarUrl}
                        key="typing-indicator"
                      />
                    )}
                  </AnimatePresence>
                </div>
              ),
            }}
          />
        )}
      </div>

      <AnimatePresence>
        {showScrollToBottom && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2"
          >
            <Button
              size="sm"
              onClick={() => onScrollToBottom(true)}
              className="rounded-2xl shadow-2xl bg-gradient-to-r from-primary to-primary-dark text-white h-11 px-5 py-2.5 flex items-center gap-2.5 transition-all duration-300 hover:scale-105 backdrop-blur-sm"
            >
              <ArrowDown className="w-4 h-4 animate-bounce" />
              {unreadCount > 0 ? (
                <span className="font-bold text-sm animate-pulse">{unreadCount} new</span>
              ) : (
                <span className="font-semibold text-sm">Latest</span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {menuState && (
        <MessageContextMenu
          menuState={menuState}
          currentUserId={currentUserId}
          onSelectReply={onSelectReply}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onToggleReaction={onToggleReaction}
          getReactionsForMessage={getReactionsForMessage}
          setMenuState={setMenuState}
        />
      )}
    </div>
  );
}