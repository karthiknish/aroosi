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
      <div className="p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn("flex", i % 2 ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "h-8 rounded-2xl animate-pulse",
                i % 2 ? "w-48 bg-gradient-to-r from-rose-100 to-rose-50" : "w-44 bg-gradient-to-r from-neutral-100 to-neutral-50"
              )}
            />
          </div>
        ))}
      </div>
    );
  } else if (isBlocked) {
    earlyContent = (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4 px-6">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-rose-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Shield className="w-9 h-9 text-rose-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-neutral-800 text-lg tracking-tight">Chat Unavailable</h3>
            <p className="text-neutral-500 text-sm max-w-xs mx-auto">
              You cannot message this user at this time
            </p>
          </div>
          {typeof onUnblock === "function" && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 rounded-xl border-neutral-200 hover:bg-neutral-50"
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
      {/* Search Bar - refined styling */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-b border-neutral-100/80 bg-gradient-to-r from-white/95 via-[#FEFCFA]/95 to-white/95 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 bg-neutral-50/80 rounded-xl px-3 py-2 border border-neutral-200/60">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search in conversation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder-neutral-400 text-neutral-700"
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
                  className="flex items-center gap-1.5 text-xs text-neutral-500"
                  id="search-results"
                >
                  {searchResults.length > 0 && (
                    <span aria-live="polite" className="font-medium">
                      {currentSearchIndex + 1}/{searchResults.length}
                    </span>
                  )}
                  <button
                    onClick={() => navigateSearch("prev")}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                    disabled={searchResults.length <= 1}
                    aria-label="Previous search result"
                    title="Previous (↑)"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => navigateSearch("next")}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
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
                className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto px-4 py-5 space-y-2 scrollbar-thin scrollbar-thumb-neutral-300/60 scrollbar-track-transparent hover:scrollbar-thumb-neutral-400/60 focus:outline-none"
        role="region"
        aria-label="Messages scroll area"
      >
        {earlyContent ? (
          earlyContent
        ) : (
          <>
            {hasMore && !loading && !empty && (
              <div className="flex items-center justify-center py-3">
                {loadingOlder ? (
                  <div className="flex items-center gap-2 text-neutral-500 text-sm">
                    <LoadingSpinner size={16} />
                    <span>Loading older messages...</span>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFetchOlder()}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-sm rounded-xl font-medium"
                  >
                    Load older messages
                  </Button>
                )}
              </div>
            )}
            {empty ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 px-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-50 to-rose-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-amber-100/50">
                    <Smile className="w-9 h-9 text-amber-500" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-neutral-800 text-lg tracking-tight">
                      Start the conversation!
                    </h3>
                    <p className="text-neutral-500 text-sm max-w-xs mx-auto">
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
                          <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
                            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider bg-white/80 px-3 py-1 rounded-full border border-neutral-100/80 shadow-sm">
                              {new Date(msg.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
                          </div>
                        )}
                        {index === firstUnreadIndex && (
                          <div className="flex items-center gap-4 my-5">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-rose-300/60 to-transparent" />
                            <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider bg-rose-50 px-3 py-1 rounded-full border border-rose-100/80">
                              New Messages
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-rose-300/60 to-transparent" />
                          </div>
                        )}
                        {index === lastSeenSeparatorIndex && (
                          <div className="flex items-center gap-4 my-3">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent" />
                            <span className="text-[10px] font-medium text-emerald-500 bg-emerald-50/80 px-2.5 py-0.5 rounded-full">
                              Seen
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent" />
                          </div>
                        )}
                        {showTime && (
                          <div className="text-center py-2">
                            <span className="text-[10px] text-neutral-400 font-medium tracking-wide">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                        >
                          <div className="relative group inline-block pt-1">
                            <div
                              className={cn(
                                "relative max-w-[85%] sm:max-w-[360px] px-4 py-3 text-[15px] leading-relaxed break-words transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rose-300/50 touch-manipulation",
                                highlightedId === msg._id &&
                                  "ring-2 ring-rose-400/50 shadow-xl scale-[1.02]",
                                // Refined bubble styling - distinctive gradient for sent messages
                                isCurrentUser
                                  ? "text-white bg-gradient-to-br from-rose-500 via-rose-500 to-rose-600 shadow-lg shadow-rose-500/20"
                                  : "text-neutral-800 bg-white shadow-md shadow-neutral-900/5 border border-neutral-100/80",
                                // Elegant rounded adjustments with better visual flow
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
                                // Refined spacing for grouped messages
                                !isFirstOfGroup && "mt-0.5"
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
                                  className={cn(
                                    "mb-2.5 pl-3 pr-2 py-1.5 border-l-2 rounded-lg text-xs w-full text-left transition-all duration-200 focus:outline-none focus:ring-1",
                                    isCurrentUser 
                                      ? "border-white/40 bg-white/15 text-white/90 hover:bg-white/20 focus:ring-white/30" 
                                      : "border-rose-300/60 bg-rose-50/50 text-neutral-600 hover:bg-rose-50 focus:ring-rose-300/50"
                                  )}
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
                                  <span className="block truncate max-w-[250px] pointer-events-none font-medium">
                                    {makeReplySnippet(msg)}
                                  </span>
                                </button>
                              )}
                              {/* Refined menu button for own text messages */}
                              {isCurrentUser && msg.type === "text" && (
                                <button
                                  type="button"
                                  className="absolute -top-2 -right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 bg-white rounded-xl border border-neutral-200/80 shadow-lg p-1.5 hover:bg-neutral-50 hover:scale-110 active:scale-95"
                                  aria-label="Message menu"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = (
                                      e.currentTarget as HTMLElement
                                    ).getBoundingClientRect();
                                    openContextMenu(rect.right, rect.top, msg);
                                  }}
                                >
                                  <MoreVertical className="w-3.5 h-3.5 text-neutral-500" />
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
                                            "relative h-7 w-7 rounded-xl border bg-white shadow-md flex items-center justify-center text-sm transition-all duration-200 hover:scale-110 active:scale-95 focus:ring-2 focus:ring-rose-300/50 focus:outline-none",
                                            r.reactedByMe
                                              ? "border-rose-300/60 ring-2 ring-rose-300/40 bg-gradient-to-br from-rose-50 to-rose-100/50 shadow-lg"
                                              : "border-neutral-200 hover:border-rose-300/60 hover:shadow-lg"
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
                                          <span className="leading-none select-none text-xs">
                                            {r.emoji}
                                          </span>
                                          {r.count > 1 && (
                                            <span
                                              className={cn(
                                                "absolute -bottom-1 -right-1 text-[9px] leading-none rounded-full px-1 py-0.5 bg-neutral-800 text-white shadow-md min-w-[16px] h-[16px] flex items-center justify-center font-bold",
                                                r.reactedByMe &&
                                                  "bg-rose-500"
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
                                  "text-[11px] mt-2.5 flex items-center gap-1.5 font-medium",
                                  isCurrentUser
                                    ? "text-white/70 justify-end"
                                    : "text-neutral-400"
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
                                      "text-[10px] italic",
                                      isCurrentUser
                                        ? "text-white/50"
                                        : "text-neutral-400"
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
                                  <div className="mt-1.5 text-right">
                                    <button
                                      className="text-[11px] text-red-400 font-medium hover:text-red-500 hover:underline transition-colors"
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
                                  "opacity-0 group-hover:opacity-100 transition-all duration-200"
                                )}
                                role="toolbar"
                                aria-label="Quick reactions"
                              >
                                <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-neutral-200/80 shadow-lg rounded-xl px-2 py-1.5">
                                  {["👍", "❤️", "😂", "😮", "🙏"].map(
                                    (emoji) => (
                                      <button
                                        key={`${msg._id}-${emoji}`}
                                        type="button"
                                        className="h-7 w-7 text-[14px] leading-none rounded-lg hover:bg-neutral-100 active:scale-90 transition-all duration-150"
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
      {/* Refined scroll to bottom button */}
      <AnimatePresence>
        {showScrollToBottom && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2"
          >
            <Button
              size="sm"
              onClick={() => onScrollToBottom(true)}
              className="rounded-2xl shadow-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-600 hover:to-rose-700 border border-white/20 h-11 px-5 py-2.5 flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:shadow-rose-500/30 active:scale-95 backdrop-blur-sm focus:ring-2 focus:ring-rose-400/50 focus:ring-offset-2"
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
                <span className="font-bold text-sm animate-pulse">
                  {unreadCount} new
                </span>
              ) : (
                <span className="font-semibold text-sm">Latest</span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>{" "}
      {menuState && (
        <div
          id="chat-msg-context-menu"
          role="menu"
          className="absolute z-50 min-w-[180px] rounded-2xl border border-neutral-200/80 bg-white/98 backdrop-blur-xl shadow-2xl p-2 animate-in fade-in-0 zoom-in-95"
          style={{ top: menuState.adjustedY, left: menuState.adjustedX }}
        >
          <button
            role="menuitem"
            className="w-full text-left text-sm px-3 py-2.5 rounded-xl hover:bg-rose-50 focus:bg-rose-50 focus:outline-none font-medium text-neutral-700 transition-colors"
            onClick={() => {
              if (onSelectReply) onSelectReply(menuState.message);
              setMenuState(null);
            }}
          >
            Reply
          </button>
          <div className="px-3 py-2 border-t border-neutral-100 mt-1">
            <div className="text-[10px] text-neutral-400 mb-2 uppercase tracking-wider font-semibold">React</div>
            <div className="flex gap-1">
              {["👍", "❤️", "😂", "😮", "🙏"].map((emoji) => (
                <button
                  key={emoji}
                  className="h-8 w-8 rounded-lg hover:bg-neutral-100 transition-colors flex items-center justify-center text-base"
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
                <div className="px-3 py-2 border-t border-neutral-100 mt-1">
                  <div className="text-[10px] text-neutral-400 mb-2 uppercase tracking-wider font-semibold">
                    Your reactions
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {own.map((r) => (
                      <button
                        key={`own-${menuState.message._id}-${r.emoji}`}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-red-50 hover:text-red-600 text-sm font-medium transition-colors"
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
              <div className="border-t border-neutral-100 mt-1 pt-1">
                <button
                  role="menuitem"
                  className="w-full text-left text-sm px-3 py-2.5 rounded-xl hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none flex items-center gap-2.5 text-neutral-700 font-medium transition-colors"
                  onClick={() => {
                    const m = menuState.message;
                    onEditMessage?.(m._id, (m as any).text || "");
                    setMenuState(null);
                  }}
                >
                  <Edit3 className="w-4 h-4 text-neutral-500" /> Edit
                </button>
                <button
                  role="menuitem"
                  className="w-full text-left text-sm px-3 py-2.5 rounded-xl hover:bg-red-50 focus:bg-red-50 focus:outline-none text-red-600 flex items-center gap-2.5 font-medium transition-colors"
                  onClick={() => {
                    const m = menuState.message;
                    onDeleteMessage?.(m._id);
                    setMenuState(null);
                  }}
                >
                  <Trash className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}