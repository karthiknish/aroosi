"use client";
import React, {
  RefObject,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  ArrowDown,
  Shield,
  Smile,
  MoreVertical,
  Edit3,
  Trash,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/lib/utils/messageUtils";
import { DeliveryStatus } from "@/components/chat/DeliveryStatus";
import VoiceMessageBubble from "@/components/chat/VoiceMessageBubble";
import ImageMessageBubble from "@/components/chat/ImageMessageBubble";
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
  otherLastReadAt?: number;
  onUnblock?: () => void;
  onSelectReply?: (m: MatchMessage) => void;
  onEditMessage?: (id: string, currentText: string) => void;
  onDeleteMessage?: (id: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  getReactionsForMessage?: (
    messageId: string
  ) => Array<{ emoji: string; count: number; reactedByMe: boolean }>;
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
    playingVoice: _playingVoice, // unused – prefixed to satisfy lint rule
    setPlayingVoice: _setPlayingVoice, // unused – prefixed to satisfy lint rule
    getMessageDeliveryStatus,
    onScrollToBottom,
    showScrollToBottom,
    lastReadAt = 0,
    otherLastReadAt = 0,
    onUnblock,
    onSelectReply,
    onEditMessage,
    onDeleteMessage,
  } = props;
  // -------------------- Hooks (must run every render) --------------------
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [menuState, setMenuState] = useState<{
    x: number;
    y: number;
    message: MatchMessage;
    adjustedX: number;
    adjustedY: number;
  } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const pressedMessageRef = useRef<MatchMessage | null>(null);

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<MatchMessage[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pressedMessageRef.current = null;
  };

  // Search functionality
  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setCurrentSearchIndex(-1);
        return;
      }

      const results = messages.filter(
        (msg) =>
          msg.text && msg.text.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
      setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    },
    [messages]
  );

  const navigateSearch = useCallback(
    (direction: "next" | "prev") => {
      if (searchResults.length === 0) return;

      let newIndex: number;
      if (direction === "next") {
        newIndex =
          currentSearchIndex < searchResults.length - 1
            ? currentSearchIndex + 1
            : 0;
      } else {
        newIndex =
          currentSearchIndex > 0
            ? currentSearchIndex - 1
            : searchResults.length - 1;
      }

      setCurrentSearchIndex(newIndex);
      const targetMessage = searchResults[newIndex];
      if (targetMessage && scrollRef.current) {
        const messageElement = scrollRef.current.querySelector(
          `[data-message-id="${targetMessage._id}"]`
        );
        if (messageElement) {
          messageElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    },
    [searchResults, currentSearchIndex]
  );

  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  const openContextMenu = useCallback(
    (clientX: number, clientY: number, message: MatchMessage) => {
      // Get the container element for relative positioning
      const container = document.querySelector("[data-messages-list]");
      if (!container) return;

      const containerRect = container.getBoundingClientRect();

      // Adjust position to keep menu inside container
      const MENU_WIDTH = 160;
      const MENU_HEIGHT = 120; // increased for more menu items
      const containerRight = containerRect.right;
      const containerBottom = containerRect.bottom;

      // Calculate position relative to container
      let adjustedX = clientX - containerRect.left;
      let adjustedY = clientY - containerRect.top;

      // Keep menu within container bounds
      if (adjustedX + MENU_WIDTH > containerRect.width)
        adjustedX = containerRect.width - MENU_WIDTH - 8;
      if (adjustedY + MENU_HEIGHT > containerRect.height)
        adjustedY = containerRect.height - MENU_HEIGHT - 8;

      // Ensure minimum margins
      adjustedX = Math.max(8, adjustedX);
      adjustedY = Math.max(8, adjustedY);

      setMenuState({ x: clientX, y: clientY, adjustedX, adjustedY, message });
    },
    []
  );

  // Close menu on outside click or escape
  useEffect(() => {
    if (!menuState) return;
    const onDown = (e: MouseEvent) => {
      const menu = document.getElementById("chat-msg-context-menu");
      if (menu && !menu.contains(e.target as Node)) setMenuState(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuState(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuState]);

  const scrollToMessage = useCallback(
    (targetId: string) => {
      if (!scrollRef.current) return;
      const candidates = Array.from(
        scrollRef.current.querySelectorAll<HTMLElement>("[data-message-id]")
      );
      const el = candidates.find(
        (n) => n.getAttribute("data-message-id") === targetId
      );
      if (el) {
        try {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {
          // fallback
          el.scrollIntoView();
        }
        setHighlightedId(targetId);
      }
    },
    [scrollRef]
  );

  useEffect(() => {
    if (!highlightedId) return;
    const to = setTimeout(() => setHighlightedId(null), 3200);
    return () => clearTimeout(to);
  }, [highlightedId]);

  const makeReplySnippet = useCallback((msg: MatchMessage) => {
    const anyMsg: any = msg;
    if (anyMsg.replyToType === "voice") return "Replying to voice message";
    let base: string = anyMsg.replyToText || "Reply";
    base = base
      .replace(/\s+/g, " ")
      .replace(/[\u0000-\u001F\u007F]+/g, "")
      .trim();
    if (base.length > 120) base = base.slice(0, 117) + "…";
    return base || "Reply";
  }, []);

  const firstUnreadIndex = (() => {
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.createdAt > lastReadAt) return i;
    }
    return -1;
  })();

  const lastSeenSeparatorIndex = (() => {
    if (!otherLastReadAt) return -1;
    let idx = -1;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.createdAt <= otherLastReadAt) idx = i;
      else break;
    }
    return idx;
  })();

  // Compute unread count for scroll-to-bottom CTA (messages newer than lastReadAt not sent by current user)
  const unreadCount = useMemo(() => {
    if (!messages?.length) return 0;
    return messages.reduce((acc, m) => {
      if (m.createdAt > lastReadAt && m.fromUserId !== currentUserId)
        return acc + 1;
      return acc;
    }, 0);
  }, [messages, lastReadAt, currentUserId]);

  // -------------------- Conditional UI branches (after hooks) --------------------
  const empty = !messages || messages.length === 0;

  let earlyContent: React.ReactNode = null;
  if (loading) {
    earlyContent = (
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn("flex", i % 2 ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "h-6 w-40 rounded-xl",
                i % 2 ? "bg-primary/20" : "bg-gray-200"
              )}
            />
          </div>
        ))}
      </div>
    );
  } else if (isBlocked) {
    earlyContent = (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Chat Unavailable</h3>
            <p className="text-gray-500 text-sm">
              You cannot message this user
            </p>
          </div>
          {typeof onUnblock === "function" && (
            <Button
              size="sm"
              variant="outline"
              className="mt-1"
              onClick={onUnblock}
            >
              Unblock
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 relative min-h-[50vh]"
      aria-label="Conversation messages"
      role="log"
      aria-live="polite"
      data-messages-list
      ref={(el) => {
        if (el) {
          const handleToggleSearch = () => setShowSearch((prev) => !prev);
          el.addEventListener("toggleSearch", handleToggleSearch);
          return () =>
            el.removeEventListener("toggleSearch", handleToggleSearch);
        }
      }}
    >
      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder-gray-400"
                autoFocus
                aria-label="Search through conversation messages"
                aria-describedby="search-results"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    navigateSearch("next");
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setShowSearch(false);
                    setSearchQuery("");
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    navigateSearch("prev");
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    navigateSearch("next");
                  }
                }}
              />
              {searchQuery && (
                <div
                  className="flex items-center gap-1 text-xs text-gray-500"
                  id="search-results"
                >
                  {searchResults.length > 0 && (
                    <span aria-live="polite">
                      {currentSearchIndex + 1}/{searchResults.length}
                    </span>
                  )}
                  <button
                    onClick={() => navigateSearch("prev")}
                    className="p-1 hover:bg-gray-100 rounded"
                    disabled={searchResults.length <= 1}
                    aria-label="Previous search result"
                    title="Previous (↑)"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => navigateSearch("next")}
                    className="p-1 hover:bg-gray-100 rounded"
                    disabled={searchResults.length <= 1}
                    aria-label="Next search result"
                    title="Next (↓)"
                  >
                    ↓
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 bg-[radial-gradient(circle_at_20%_0%,rgba(0,0,0,0.02),transparent_60%)] focus:outline-none"
        role="region"
        aria-label="Messages scroll area"
      >
        {earlyContent ? (
          earlyContent
        ) : (
          <>
            {hasMore && !loading && !empty && (
              <div className="flex items-center justify-center py-2">
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
                    <h3 className="font-medium text-neutral mb-1">
                      Start the conversation!
                    </h3>
                    <p className="text-neutral-light text-sm">
                      Send a message to break the ice
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {messages.map((msg: MatchMessage, index: number) => {
                    const isCurrentUser = msg.fromUserId === currentUserId;
                    const prevMsg = index > 0 ? messages[index - 1] : undefined;
                    const nextMsg =
                      index < messages.length - 1
                        ? messages[index + 1]
                        : undefined;
                    const showTime =
                      !prevMsg ||
                      msg.createdAt - (prevMsg?.createdAt || 0) > 7 * 60 * 1000;
                    const isVoice =
                      msg.type === "voice" && !!(msg as any).audioStorageId;
                    const isImage =
                      msg.type === "image" && !!(msg as any).audioStorageId;
                    const isNewDay = (() => {
                      if (!prevMsg) return true;
                      const d1 = new Date(prevMsg.createdAt);
                      const d2 = new Date(msg.createdAt);
                      return (
                        d1.getFullYear() !== d2.getFullYear() ||
                        d1.getMonth() !== d2.getMonth() ||
                        d1.getDate() !== d2.getDate()
                      );
                    })();

                    // Grouping logic: collapse consecutive same-sender bubbles visually
                    const isFirstOfGroup =
                      !prevMsg ||
                      prevMsg.fromUserId !== msg.fromUserId ||
                      isNewDay;
                    const isLastOfGroup =
                      !nextMsg ||
                      nextMsg.fromUserId !== msg.fromUserId ||
                      (() => {
                        const d1 = new Date(nextMsg?.createdAt || 0);
                        const d2 = new Date(msg.createdAt);
                        return (
                          d1.getDate() !== d2.getDate() ||
                          d1.getMonth() !== d2.getMonth() ||
                          d1.getFullYear() !== d2.getFullYear()
                        );
                      })();

                    const hasReply = (msg as any).replyToMessageId;
                    return (
                      <motion.div
                        key={msg._id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                        className="space-y-1"
                      >
                        {isNewDay && (
                          <div className="flex items-center gap-3 my-2">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">
                              {new Date(msg.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}
                        {index === firstUnreadIndex && (
                          <div className="flex items-center gap-3 my-2">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[10px] uppercase tracking-wide text-gray-500">
                              Unread
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}
                        {index === lastSeenSeparatorIndex && (
                          <div className="flex items-center gap-3 my-1">
                            <div className="flex-1 h-px bg-blue-200" />
                            <span className="text-[10px] uppercase tracking-wide text-blue-500">
                              Seen
                            </span>
                            <div className="flex-1 h-px bg-blue-200" />
                          </div>
                        )}
                        {showTime && (
                          <div className="text-center py-1">
                            <span className="text-[10px] text-gray-600 bg-gray-200/60 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm border border-gray-300/40 font-medium">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                        >
                          <div className="relative group inline-block pt-8">
                            <div
                              className={cn(
                                "relative max-w-[85%] sm:max-w-[320px] px-3 sm:px-4 py-2 sm:py-3 shadow-sm text-sm break-words transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 hover:shadow-md touch-manipulation",
                                "border border-gray-200/80 bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-sm",
                                highlightedId === msg._id &&
                                  "border-primary/70 bg-gradient-to-br from-primary/5 to-primary/10 ring-2 ring-primary/40 shadow-lg",
                                isCurrentUser
                                  ? "text-neutral-900 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60"
                                  : "text-gray-900 bg-white border-gray-200/60",
                                // Enhanced rounded adjustments for grouping with better visual flow
                                isCurrentUser
                                  ? cn(
                                      "rounded-2xl rounded-br-sm",
                                      !isFirstOfGroup && "rounded-tr-sm",
                                      !isLastOfGroup && "rounded-br-2xl"
                                    )
                                  : cn(
                                      "rounded-2xl rounded-bl-sm",
                                      !isFirstOfGroup && "rounded-tl-sm",
                                      !isLastOfGroup && "rounded-bl-2xl"
                                    ),
                                // Enhanced background difference for grouped siblings
                                !isFirstOfGroup &&
                                  isCurrentUser &&
                                  "bg-gradient-to-br from-blue-50/80 to-indigo-50/80",
                                !isFirstOfGroup &&
                                  !isCurrentUser &&
                                  "bg-white/80"
                              )}
                              data-message-id={msg._id}
                              tabIndex={0}
                              role="button"
                              onContextMenu={(e) => {
                                e.preventDefault();
                                openContextMenu(e.clientX, e.clientY, msg);
                              }}
                              onPointerDown={(e) => {
                                if (e.pointerType === "touch") {
                                  pressedMessageRef.current = msg;
                                  clearLongPress();
                                  longPressTimer.current = window.setTimeout(
                                    () => {
                                      if (pressedMessageRef.current) {
                                        openContextMenu(
                                          e.clientX ||
                                            (e as any).touches?.[0]?.clientX ||
                                            0,
                                          e.clientY ||
                                            (e as any).touches?.[0]?.clientY ||
                                            0,
                                          pressedMessageRef.current
                                        );
                                      }
                                    },
                                    480
                                  );
                                }
                              }}
                              onPointerUp={() => clearLongPress()}
                              onPointerLeave={() => clearLongPress()}
                              onPointerCancel={() => clearLongPress()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  const rect = (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect();
                                  openContextMenu(
                                    rect.left + rect.width / 2,
                                    rect.top + 8,
                                    msg
                                  );
                                }
                              }}
                              aria-label={`Message ${isCurrentUser ? "sent" : "received"} at ${new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                            >
                              {hasReply && (
                                <button
                                  type="button"
                                  className="mb-2 pl-2 pr-1 py-1 border-l-2 border-primary/60 bg-gray-100/70 rounded-md text-xs text-gray-600 w-full text-left hover:bg-primary/10 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const targetId = (msg as any)
                                      .replyToMessageId;
                                    if (targetId) scrollToMessage(targetId);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const targetId = (msg as any)
                                        .replyToMessageId;
                                      if (targetId) scrollToMessage(targetId);
                                    }
                                  }}
                                  aria-label="View original replied message"
                                >
                                  <span className="block truncate max-w-[250px] pointer-events-none">
                                    {makeReplySnippet(msg)}
                                  </span>
                                </button>
                              )}
                              {/* top-right triple-dot for own text messages */}
                              {isCurrentUser && msg.type === "text" && (
                                <button
                                  type="button"
                                  className="absolute -top-2 -right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-white rounded-full border border-gray-200 shadow p-1 hover:bg-gray-50 active:bg-gray-100"
                                  aria-label="Message menu"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = (
                                      e.currentTarget as HTMLElement
                                    ).getBoundingClientRect();
                                    openContextMenu(rect.right, rect.top, msg);
                                  }}
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-600" />
                                </button>
                              )}

                              {(msg as any).deleted ? (
                                <p className="text-xs italic text-gray-500">
                                  This message was deleted
                                </p>
                              ) : isVoice ? (
                                <VoiceMessageBubble
                                  url={`/api/voice-messages/${encodeURIComponent(msg._id)}/url`}
                                  durationSeconds={Number(
                                    (msg as any).duration || 0
                                  )}
                                  peaks={
                                    (msg as any).peaks as number[] | undefined
                                  }
                                  isMine={isCurrentUser}
                                  messageId={msg._id}
                                />
                              ) : isImage ? (
                                <ImageMessageBubble
                                  messageId={msg._id}
                                  isMine={isCurrentUser}
                                  mimeType={(msg as any).mimeType}
                                />
                              ) : (
                                <p className="leading-relaxed whitespace-pre-wrap text-sm font-normal">
                                  {msg.text}
                                </p>
                              )}
                              {/* Quick reactions toolbar moved outside bubble wrapper below */}
                              {/* Reactions: circular badges anchored to bubble corner */}
                              {props.getReactionsForMessage &&
                                (() => {
                                  const rx = props.getReactionsForMessage(
                                    msg._id
                                  );
                                  if (!rx || rx.length === 0) return null;
                                  return (
                                    <div
                                      className={cn(
                                        "absolute z-10 flex gap-1",
                                        // anchor to outer bottom corner, slightly outside the bubble
                                        isCurrentUser
                                          ? "bottom-2 right-1 justify-end"
                                          : "bottom-2 left-1 justify-start"
                                      )}
                                      aria-label={`Message reactions: ${rx.length} reaction${rx.length !== 1 ? "s" : ""}`}
                                      role="button"
                                      tabIndex={0}
                                      // keep clicks from triggering bubble handlers unnecessarily
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" ||
                                          e.key === " "
                                        ) {
                                          e.stopPropagation();
                                        }
                                      }}
                                    >
                                      {rx.map((r) => (
                                        <button
                                          key={`${msg._id}-${r.emoji}`}
                                          type="button"
                                          className={cn(
                                            "relative h-8 w-8 rounded-full border bg-white shadow-md flex items-center justify-center text-sm transition-all duration-200 hover:scale-110 active:scale-95 focus:ring-2 focus:ring-primary/50 focus:outline-none",
                                            r.reactedByMe
                                              ? "border-primary/60 ring-2 ring-primary/40 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg"
                                              : "border-gray-200 hover:border-primary/40 hover:shadow-lg"
                                          )}
                                          onClick={() =>
                                            props.onToggleReaction?.(
                                              msg._id,
                                              r.emoji
                                            )
                                          }
                                          aria-pressed={r.reactedByMe}
                                          aria-label={`${r.emoji} reaction${r.reactedByMe ? " (reacted by you)" : ""}${r.count > 1 ? ` (${r.count} reactions)` : ""}`}
                                          title={`${r.emoji} ${r.count} reaction${r.count !== 1 ? "s" : ""}`}
                                        >
                                          <span className="leading-none select-none">
                                            {r.emoji}
                                          </span>
                                          {r.count > 1 && (
                                            <span
                                              className={cn(
                                                "absolute -bottom-1 -right-1 text-[10px] leading-none rounded-full px-1.5 py-0.5 bg-gray-900 text-white shadow-md border border-gray-700 min-w-[18px] h-[18px] flex items-center justify-center font-semibold",
                                                r.reactedByMe &&
                                                  "bg-primary border-primary/50"
                                              )}
                                              aria-hidden
                                            >
                                              {r.count}
                                            </span>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })()}
                              <div
                                className={cn(
                                  "text-xs mt-2 flex items-center gap-1",
                                  isCurrentUser
                                    ? "text-gray-500 justify-end"
                                    : "text-gray-500"
                                )}
                              >
                                <span className="tabular-nums">
                                  {new Date(msg.createdAt).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </span>
                                {(msg as any).edited && (
                                  <span
                                    className={cn(
                                      "ml-1 text-[10px]",
                                      isCurrentUser
                                        ? "text-gray-400"
                                        : "text-gray-400"
                                    )}
                                    title={
                                      (msg as any).editedAt
                                        ? `Edited at ${new Date((msg as any).editedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                        : "Edited"
                                    }
                                  >
                                    • edited
                                  </span>
                                )}
                                <DeliveryStatus
                                  status={(() => {
                                    const base = getMessageDeliveryStatus(
                                      msg._id,
                                      isCurrentUser
                                    );
                                    if (!isCurrentUser) return base;
                                    if (
                                      otherLastReadAt &&
                                      msg.createdAt <= otherLastReadAt
                                    )
                                      return "read" as const;
                                    // If client flagged as pending/failed, override icon to show visual state
                                    const cs = (msg as any).clientStatus as
                                      | "pending"
                                      | "failed"
                                      | "sent"
                                      | undefined;
                                    if (cs === "pending")
                                      return "sending" as const;
                                    if (cs === "failed")
                                      return "failed" as const;
                                    return base;
                                  })()}
                                  isCurrentUser={isCurrentUser}
                                />
                              </div>
                              {isCurrentUser &&
                                (msg as any).clientStatus === "failed" && (
                                  <div className="mt-1 text-right">
                                    <button
                                      className="text-[11px] text-red-500 underline"
                                      onClick={() => {
                                        const ev = new CustomEvent(
                                          "retryMessage",
                                          {
                                            detail: {
                                              tempId: msg._id,
                                              text: msg.text,
                                            },
                                          }
                                        );
                                        window.dispatchEvent(ev);
                                      }}
                                    >
                                      Tap to retry
                                    </button>
                                  </div>
                                )}
                            </div>
                            {props.onToggleReaction && (
                              <div
                                className={cn(
                                  "absolute top-0 z-20",
                                  isCurrentUser ? "right-2" : "left-2",
                                  "opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                )}
                                role="toolbar"
                                aria-label="Quick reactions"
                              >
                                <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md rounded-full px-2 py-1">
                                  {["👍", "❤️", "😂", "😮", "🙏"].map(
                                    (emoji) => (
                                      <button
                                        key={`${msg._id}-${emoji}`}
                                        type="button"
                                        className="h-6 w-6 text-[13px] leading-none rounded-full hover:bg-gray-100 active:scale-95 transition"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          props.onToggleReaction?.(
                                            msg._id,
                                            emoji
                                          );
                                        }}
                                        aria-label={`Add reaction ${emoji}`}
                                        title={`React ${emoji}`}
                                      >
                                        {emoji}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Typing indicator */}
                  {Array.isArray(typingUsers) && typingUsers.length > 0 && (
                    <TypingIndicator
                      userName={matchUserName}
                      avatarUrl={matchUserAvatarUrl}
                      key="typing-indicator"
                    />
                  )}
                </AnimatePresence>
              </>
            )}
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
              className="rounded-full shadow-xl bg-primary text-white hover:bg-primary/90 border border-white/20 h-10 px-4 py-2 flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 backdrop-blur-sm focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
              aria-label={
                unreadCount > 0
                  ? `${unreadCount} new message${unreadCount !== 1 ? "s" : ""}. Scroll to bottom`
                  : "Scroll to latest messages"
              }
              role="button"
              tabIndex={0}
            >
              <ArrowDown className="w-4 h-4 animate-bounce" />
              {unreadCount > 0 ? (
                <span className="font-semibold animate-pulse">
                  {unreadCount}
                </span>
              ) : (
                <span className="font-medium">New</span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>{" "}
      {menuState && (
        <div
          id="chat-msg-context-menu"
          role="menu"
          className="absolute z-50 min-w-[160px] rounded-md border border-gray-200 bg-white/95 backdrop-blur-sm shadow-lg p-1 animate-in fade-in-0 zoom-in-95"
          style={{ top: menuState.adjustedY, left: menuState.adjustedX }}
        >
          <button
            role="menuitem"
            className="w-full text-left text-sm px-3 py-2 rounded hover:bg-primary/10 focus:bg-primary/10 focus:outline-none"
            onClick={() => {
              if (onSelectReply) onSelectReply(menuState.message);
              setMenuState(null);
            }}
          >
            Reply
          </button>
          <div className="px-2 py-1">
            <div className="text-[11px] text-gray-500 mb-1">React</div>
            <div className="flex gap-1">
              {["👍", "❤️", "😂", "😮", "🙏"].map((emoji) => (
                <button
                  key={emoji}
                  className="px-2 py-1 rounded hover:bg-gray-100"
                  onClick={() => {
                    props.onToggleReaction?.(menuState.message._id, emoji);
                    setMenuState(null);
                  }}
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          {props.getReactionsForMessage &&
            (() => {
              const own = props.getReactionsForMessage!(
                menuState.message._id
              ).filter((r) => r.reactedByMe);
              if (!own || own.length === 0) return null;
              return (
                <div className="px-2 py-1 border-t border-gray-100 mt-1">
                  <div className="text-[11px] text-gray-500 mb-1">
                    Your reactions
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {own.map((r) => (
                      <button
                        key={`own-${menuState.message._id}-${r.emoji}`}
                        className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
                        onClick={() => {
                          props.onToggleReaction?.(
                            menuState.message._id,
                            r.emoji
                          );
                          setMenuState(null);
                        }}
                        aria-label={`Remove ${r.emoji} reaction`}
                        title={`Remove ${r.emoji}`}
                      >
                        {r.emoji} Remove
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          {menuState.message.fromUserId === currentUserId &&
            (menuState.message as any).type !== "voice" && (
              <>
                <button
                  role="menuitem"
                  className="w-full text-left text-sm px-3 py-2 rounded hover:bg-primary/10 focus:bg-primary/10 focus:outline-none flex items-center gap-2"
                  onClick={() => {
                    const m = menuState.message;
                    onEditMessage?.(m._id, (m as any).text || "");
                    setMenuState(null);
                  }}
                >
                  <Edit3 className="w-4 h-4 text-gray-600" /> Edit
                </button>
                <button
                  role="menuitem"
                  className="w-full text-left text-sm px-3 py-2 rounded hover:bg-red-50 focus:bg-red-50 focus:outline-none text-red-600 flex items-center gap-2"
                  onClick={() => {
                    const m = menuState.message;
                    onDeleteMessage?.(m._id);
                    setMenuState(null);
                  }}
                >
                  <Trash className="w-4 h-4" /> Delete
                </button>
              </>
            )}
        </div>
      )}
    </div>
  );
}