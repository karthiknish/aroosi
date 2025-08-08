import { useState, useEffect, useRef, useCallback } from "react";
import { useMatchMessages } from "@/lib/utils/useMatchMessages";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useTypingIndicators } from "@/hooks/useTypingIndicators";
import { getPresence, heartbeat } from "@/lib/api/conversation";
import { useDeliveryReceipts } from "@/hooks/useDeliveryReceipts";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import {
  handleScrollUtil,
  scrollToBottomUtil,
  handleErrorUtil,
  withRetry,
} from "@/lib/chat/utils";
import { blockUserUtil, reportUserUtil, ReportReason } from "@/lib/chat/utils";

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
    loading,
    loadingOlder,
    hasMore,
    fetchOlder,
    sendMessage,
    connectionStatus,
    error,
    getLastReadAtForOther,
  } = useMatchMessages(conversationId, "");

  // Typing indicators
  const { typingUsers, startTyping, stopTyping } = useTypingIndicators({
    conversationId,
    currentUserId,
  });

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

  // Feedback state
  const [messageFeedback, setMessageFeedback] = useState<{
    type: "success" | "error" | "warning" | "loading";
    message: string;
    isVisible: boolean;
  }>({ type: "success", message: "", isVisible: false });

  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("connecting");
  const [otherPresence, setOtherPresence] = useState<{ isOnline: boolean; lastSeen: number }>({ isOnline: false, lastSeen: 0 });

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
    let interval: any;
    (async () => {
      try {
        await heartbeat();
        const p = await getPresence(matchUserId);
        if (mounted) setOtherPresence(p);
      } catch {}
    })();
    interval = setInterval(async () => {
      try {
        await heartbeat();
        const p = await getPresence(matchUserId);
        if (mounted) setOtherPresence(p);
      } catch {}
    }, 15000);
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
  const isInitiating = !hasSentMessage && !hasReceivedMessage;

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
        const payload = {
          fromUserId: currentUserId,
          toUserId: matchUserId,
          text: messageText.trim(),
        };

        const tempId = `tmp-${Date.now()}`;
        markMessageAsPending(tempId);

        await withRetry(
          () => sendMessage(payload),
          3,
          (err, attempt) => {
            const msg =
              err instanceof Error ? err.message : String(err ?? "Unknown");
            console.warn(`Message send attempt ${attempt} failed:`, msg);
            if (attempt < 3) showErrorToast(null, `Retrying... (${attempt}/3)`);
          }
        );

        markMessageAsSent(tempId);

        trackUsage({
          feature: "message_sent",
          metadata: { targetUserId: matchUserId, messageType: "text" },
        });

        setText("");
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
      sendMessage,
      stopTyping,
      markMessageAsPending,
      markMessageAsSent,
      trackUsage,
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
  const sendVoiceMessage = useCallback(
    async (_blob: Blob, _toUserId: string, _duration: number) => {
      // Intentionally no-op; voice disabled in this layer
      return;
    },
    []
  );

  const handleBlockUser = useCallback(async () => {
    try {
      await blockUserUtil({
        matchUserId,
        setIsBlocked,
        setShowReportModal,
      });
      showSuccessToast("User has been blocked");
    } catch (err) {
      const mapped = handleErrorUtil(err);
      console.error("Error blocking user:", mapped.message);
      showErrorToast(null, "Failed to block user");
    }
  }, [matchUserId]);

  const handleReportUser = useCallback(
    async (reason: ReportReason, description: string) => {
      try {
        await reportUserUtil({
          matchUserId,
          reason,
          description,
          setShowReportModal,
        });
        showSuccessToast("Report submitted successfully");
      } catch (err) {
        const mapped = handleErrorUtil(err);
        console.error("Error reporting user:", mapped.message);
        showErrorToast(null, "Failed to submit report");
      }
    },
    [matchUserId, setShowReportModal]
  );

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
      handleReportUser,
      onFetchOlder: fetchOlder,
      onScrollToBottom: () =>
        scrollToBottomUtil(scrollRef as React.RefObject<HTMLDivElement>, true),
    },
    presence: otherPresence,
  };
}

export type { ReportReason };