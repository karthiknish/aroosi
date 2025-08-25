import { useState, useEffect, useRef, useCallback } from "react";
// Firestore real-time messaging hook
import { useRealTimeMessages } from "@/hooks/useRealTimeMessages";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useTypingIndicators } from "@/hooks/useTypingIndicators";
import { getPresence, heartbeat } from "@/lib/api/conversation";
import { useDeliveryReceipts } from "@/hooks/useDeliveryReceipts";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import {
  showErrorToast,
  showSuccessToast,
  showUndoToast,
  showWarningToast,
  showInfoToast,
} from "@/lib/ui/toast";
import { getErrorMessage } from "@/lib/utils/apiResponse";
import {
  handleScrollUtil,
  scrollToBottomUtil,
  handleErrorUtil,
  withRetry,
} from "@/lib/chat/utils";
import {
  blockUserUtil,
  reportUserUtil,
  unblockUserUtil,
  ReportReason,
} from "@/lib/chat/utils";

type UseModernChatArgs = {
  conversationId: string;
  currentUserId: string;
  matchUserId: string;
};

export function useModernChat({
  conversationId,
  currentUserId,
  matchUserId,
}: UseModernChatArgs) {
  const subscriptionStatus = useSubscriptionStatus();
  const { trackUsage } = useUsageTracking(undefined);

  const {
    messages,
    isConnected: connectionStatusBool,
    sendMessage: sendMessageFs,
    sendTypingStart,
    sendTypingStop,
    markAsRead,
    error,
  } = useRealTimeMessages({ conversationId });

  // Shim previous shape
  const connectionStatus: "connected" | "connecting" | "disconnected" =
    connectionStatusBool ? "connected" : "connecting"; // simple mapping
  const loading = false; // onSnapshot handles streaming; could add local flag
  const loadingOlder = false; // pagination not yet implemented in Firestore hook
  const hasMore = false; // TODO: implement pagination via startAfter
  const fetchOlder = async () => undefined; // placeholder
  const getLastReadAtForOther = (otherId: string) => 0; // TODO: integrate read receipts collection if added

  // Typing indicators
  // Replace typing indicators with Firestore hook wrappers
  const { typingUsers, startTyping, stopTyping } = useTypingIndicators({
    conversationId,
    currentUserId,
    // Pass through to Firestore typing updates
    customStart: sendTypingStart,
    customStop: sendTypingStop,
  } as any);

  // Delivery receipts
  const {
    getMessageDeliveryStatus,
    markMessageAsPending,
    markMessageAsSent,
    markMessageAsRead,
    markMessageAsDelivered,
  } = useDeliveryReceipts({
    conversationId,
  });

  // UI state
  const [text, setText] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  // Reply-to state
  const [replyTo, setReplyTo] = useState<{
    messageId: string;
    text?: string;
    type?: "text" | "voice" | "image";
    fromUserId?: string;
  } | null>(null);
  // Edit state: when set, composer edits an existing message instead of sending new
  const [editing, setEditing] = useState<{
    messageId: string;
    originalText: string;
  } | null>(null);

  // Feedback state
  const [messageFeedback, setMessageFeedback] = useState<{
    type: "success" | "error" | "warning" | "loading";
    message: string;
    isVisible: boolean;
  }>({ type: "success", message: "", isVisible: false });
  const [otherPresence, setOtherPresence] = useState<{
    isOnline: boolean;
    lastSeen: number;
  }>({ isOnline: false, lastSeen: 0 });

  // Refs for UI elements
  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // reset blocked flag when match changes
  useEffect(() => setIsBlocked(false), [matchUserId]);

  // Presence: poll other user's presence + heartbeat self
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      try {
        await heartbeat();
        const p = await getPresence(matchUserId);
        if (mounted) setOtherPresence(p);
      } catch {}
    }, 15000);
    (async () => {
      try {
        await heartbeat();
        const p = await getPresence(matchUserId);
        if (mounted) setOtherPresence(p);
      } catch {}
    })();
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [matchUserId]);

  // Mark incoming messages as read
  useEffect(() => {
    (async () => {
      if (messages.length > 0 && !isBlocked) {
        const incoming = messages.filter((m) => m.fromUserId === matchUserId);
        if (incoming.length > 0) {
          const latest = incoming[incoming.length - 1];
          await markMessageAsRead(latest._id);
        }
      }
    })();
  }, [messages, isBlocked, matchUserId, markMessageAsRead]);

  // Optimistic delivered on SSE connect: mark last incoming as delivered
  useEffect(() => {
    if (connectionStatus !== "connected") return;
    const incoming = messages.filter((m) => m.fromUserId === matchUserId);
    const latest = incoming[incoming.length - 1];
    if (latest) {
      markMessageAsDelivered(latest._id);
    }
  }, [connectionStatus, messages, matchUserId, markMessageAsDelivered]);

  // Auto-scroll to bottom when near bottom and messages change
  const scrollToBottom = useCallback(
    (smooth = false) =>
      scrollToBottomUtil(scrollRef as React.RefObject<HTMLDivElement>, !smooth),
    []
  );

  useEffect(() => {
    if (isNearBottom) scrollToBottom();
  }, [messages, isNearBottom, scrollToBottom]);

  // Local scroll handler delegating to util
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    handleScrollUtil({
      el: scrollRef.current,
      loadingOlder,
      hasMore,
      messagesCount: messages.length,
      fetchOlder: async () => void fetchOlder(),
      setIsNearBottom,
      setShowScrollToBottom,
    });
  }, [loadingOlder, hasMore, messages.length, fetchOlder]);

  // Debounced scroll effect
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timeoutId: any;
    const debounced = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleScroll();
      }, 50);
    };
    el.addEventListener("scroll", debounced, { passive: true });
    debounced();
    return () => {
      el.removeEventListener("scroll", debounced as any);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);

  // Close emoji picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  // Derived flags
  const hasSentMessage = messages.some((m) => m.fromUserId === currentUserId);
  const hasReceivedMessage = messages.some((m) => m.fromUserId === matchUserId);
  const _isInitiating = !hasSentMessage && !hasReceivedMessage;

  // Messaging permissions are expected to be done higher-level; keep minimal gating here
  const canSendText = () => ({ allowed: true, reason: "" });

  // Handlers
  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isSending || isBlocked) return;

      const textPermission = canSendText();
      if (!textPermission.allowed) {
        showErrorToast(null, textPermission.reason || "Cannot send message");
        return;
      }

      setIsSending(true);
      stopTyping();

      try {
        // If editing an existing message, update it and exit
        if (editing && editing.messageId) {
          try {
            const { editMessage } = await import("@/lib/api/messages");
            await editMessage(editing.messageId, messageText.trim());
            setEditing(null);
            setText("");
            setIsNearBottom(true);
            setTimeout(() => inputRef.current?.focus(), 100);
            return;
          } catch (err) {
            showErrorToast(err, "Failed to edit message");
            return;
          }
        }

        const payload = {
          fromUserId: currentUserId,
          toUserId: matchUserId,
          text: messageText.trim(),
        };

        const tempId = `tmp-${Date.now()}`;
        markMessageAsPending(tempId);

        let lastError: unknown;
        try {
          await withRetry(
            () =>
              sendMessageFs(
                payload.text,
                payload.toUserId,
                replyTo || undefined
              ).catch((err) => {
                throw err;
              }),
            3,
            (err, attempt) => {
              lastError = err;
              const msg =
                err instanceof Error ? err.message : String(err ?? "Unknown");
              console.warn(`Message send attempt ${attempt} failed:`, msg);
              if (attempt < 3)
                showErrorToast(null, `Retrying... (${attempt}/3)`);
            }
          );
        } catch (err) {
          // Detect quota exceeded server message and surface friendlier CTA
          const rawMsg =
            err instanceof Error ? err.message : String(err ?? "Unknown");
          if (/quota exceeded/i.test(rawMsg) || /429/.test(rawMsg)) {
            // If subscription status is known & free plan, tailor message
            const plan = subscriptionStatus.data?.plan || "free";
            if (plan === "free") {
              showWarningToast(
                "You've reached your free monthly message limit. Upgrade for unlimited messaging."
              );
            } else {
              showWarningToast(
                "You've reached your monthly message limit for this plan. Manage your subscription."
              );
            }
          } else {
            showErrorToast(err, "Failed to send message");
          }
          markMessageAsSent(tempId); // remove pending visual even on failure to avoid stuck state
          setIsSending(false);
          return;
        }

        // Proactive soft warning when approaching 80% of quota for free users
        try {
          const plan = subscriptionStatus.data?.plan || "free";
          if (plan === "free") {
            // We don't have immediate usage count here without another fetch; rely on heuristic: message_sent increments from server.
            // Optionally we could fetch usage endpoint after every 5 sends; keep lightweight: warn on 15th message (75%) of new 20 limit).
            const sentCount = messages.filter(
              (m) => m.fromUserId === currentUserId
            ).length;
            if (sentCount === 15) {
              showInfoToast(
                "You're nearing the free message limit. Upgrade to keep the conversation going."
              );
            }
          }
        } catch {}

        markMessageAsSent(tempId);

        trackUsage({
          feature: "message_sent",
          metadata: { targetUserId: matchUserId, messageType: "text" },
        });

        setText("");
        setReplyTo(null);
        setIsNearBottom(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      } catch (error) {
        const mapped = handleErrorUtil(error);
        showErrorToast(null, mapped.message);
        if (mapped.type === "UNAUTHORIZED" || mapped.type === "TOKEN_EXPIRED") {
          console.warn("Auth error; user may need to re-login");
        }
        if (mapped.type === "RATE_LIMITED") {
          showErrorToast(null, "Rate limited. We’ll retry and send shortly.");
        }
      } finally {
        setIsSending(false);
      }
    },
    [
      isSending,
      isBlocked,
      currentUserId,
      matchUserId,
      sendMessageFs,
      stopTyping,
      markMessageAsPending,
      markMessageAsSent,
      trackUsage,
      editing,
    ]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setText(value);
      if (value.trim() && !isBlocked) startTyping();
      else stopTyping();
    },
    [isBlocked, startTyping, stopTyping]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSendMessage(text);
      } else if (e.key === "Escape") {
        setText("");
        stopTyping();
      }
    },
    [text, handleSendMessage, stopTyping]
  );

  // Voice is disabled; keep placeholder for future enablement
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _sendVoiceMessage = useCallback(
    async (_blob: Blob, _toUserId: string, _duration: number) => {
      // Intentionally no-op; voice disabled in this layer
      return;
    },
    []
  );

  const handleBlockUser = useCallback(async () => {
    try {
      await blockUserUtil({ matchUserId, setIsBlocked, setShowReportModal });
      showSuccessToast("User has been blocked");
      trackUsage({
        feature: "user_block",
        metadata: { targetUserId: matchUserId },
      });
    } catch (err) {
      const mapped = handleErrorUtil(err);
      console.error("Error blocking user:", mapped.message);
      showErrorToast(null, "Failed to block user");
    }
  }, [matchUserId, trackUsage]);

  const handleUnblockUser = useCallback(async () => {
    try {
      await unblockUserUtil({ matchUserId, setIsBlocked, setShowReportModal });
      trackUsage({
        feature: "user_unblock",
        metadata: { targetUserId: matchUserId },
      });
      showUndoToast("User unblocked", async () => {
        try {
          await blockUserUtil({
            matchUserId,
            setIsBlocked,
            setShowReportModal,
          });
          trackUsage({
            feature: "user_block",
            metadata: { targetUserId: matchUserId },
          });
          showSuccessToast("User re-blocked");
        } catch (error) {
          const mapped = handleErrorUtil(error);
          showErrorToast(null, mapped.message);
        }
      });
    } catch (err) {
      const mapped = handleErrorUtil(err);
      console.error("Error unblocking user:", mapped.message);
      showErrorToast(null, "Failed to unblock user");
    }
  }, [matchUserId, trackUsage]);

  const handleReportUser = useCallback(
    async (reason: ReportReason, description: string) => {
      try {
        await reportUserUtil({
          matchUserId,
          reason,
          description,
          setShowReportModal,
        });
        trackUsage({
          feature: "user_report",
          metadata: { targetUserId: matchUserId, reason },
        });
        showSuccessToast("Report submitted successfully");
      } catch (err) {
        const mapped = handleErrorUtil(err);
        console.error("Error reporting user:", mapped.message);
        showErrorToast(null, "Failed to submit report");
      }
    },
    [matchUserId, setShowReportModal, trackUsage]
  );

  // Reactions state: map messageId -> emoji -> Set<userId>
  type ReactionMap = Map<string, Map<string, Set<string>>>;
  const [reactions, setReactions] = useState<ReactionMap>(new Map());

  // Load initial reactions for this conversation
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { getReactions } = await import("@/lib/chat/reactions");
        const res = await getReactions(conversationId);
        if (!mounted || !res.success || !res.data) return;
        const map: ReactionMap = new Map();
        for (const r of res.data.reactions) {
          if (!map.has(r.messageId)) map.set(r.messageId, new Map());
          const inner = map.get(r.messageId)!;
          if (!inner.has(r.emoji)) inner.set(r.emoji, new Set());
          inner.get(r.emoji)!.add(r.userId);
        }
        setReactions(map);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [conversationId]);

  const getReactionsForMessage = useCallback(
    (messageId: string) => {
      const inner = reactions.get(messageId);
      if (!inner)
        return [] as Array<{
          emoji: string;
          count: number;
          reactedByMe: boolean;
        }>;
      return Array.from(inner.entries()).map(([emoji, users]) => ({
        emoji,
        count: users.size,
        reactedByMe: users.has(currentUserId),
      }));
    },
    [reactions, currentUserId]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      // Optimistic update
      setReactions((prev) => {
        const map = new Map(prev);
        const inner = new Map(map.get(messageId) || new Map());
        const set = new Set(inner.get(emoji) || new Set<string>());
        if (set.has(currentUserId)) set.delete(currentUserId);
        else set.add(currentUserId);
        inner.set(emoji, set);
        map.set(messageId, inner);
        return map;
      });
      try {
        const { toggleReaction: apiToggle } = await import(
          "@/lib/chat/reactions"
        );
        const res = await apiToggle(messageId, emoji);
        if (!res.success) throw new Error(getErrorMessage(res.error));
      } catch (err) {
        // revert on failure
        setReactions((prev) => {
          const map = new Map(prev);
          const inner = new Map(map.get(messageId) || new Map());
          const set = new Set(inner.get(emoji) || new Set<string>());
          if (set.has(currentUserId)) set.delete(currentUserId);
          else set.add(currentUserId);
          inner.set(emoji, set);
          map.set(messageId, inner);
          return map;
        });
      }
    },
    [currentUserId]
  );

  // Edit helpers to start/cancel editing from UI
  const startEditMessage = useCallback(
    (messageId: string, originalText: string) => {
      setReplyTo(null);
      setEditing({ messageId, originalText });
      setText(originalText || "");
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    []
  );

  const cancelEditMessage = useCallback(() => {
    setEditing(null);
    setText("");
  }, []);

  // Public API
  return {
    subscriptionStatus,
    connectionStatus,
    scrollRef,
    inputRef,
    toggleBtnRef,
    pickerRef,
    state: {
      text,
      showPicker,
      isSending,
      isBlocked,
      playingVoice,
      showReportModal,
      messageFeedback,
      error,
      replyTo,
      editing,
    },
    messagesState: {
      messages,
      loading,
      loadingOlder,
      hasMore,
      typingUsers,
      getMessageDeliveryStatus,
      showScrollToBottom,
      otherLastReadAt: getLastReadAtForOther(matchUserId),
      getReactionsForMessage,
    },
    handlers: {
      setText,
      setShowPicker,
      setPlayingVoice,
      setShowReportModal,
      setMessageFeedback,
      handleSendMessage,
      handleInputChange,
      handleKeyPress,
      handleBlockUser,
      handleUnblockUser,
      handleReportUser,
      onFetchOlder: fetchOlder,
      onScrollToBottom: () =>
        scrollToBottomUtil(scrollRef as React.RefObject<HTMLDivElement>, true),
      setReplyTo,
      startEditMessage,
      cancelEditMessage,
      toggleReaction,
    },
    presence: otherPresence,
  };
}

export type { ReportReason };