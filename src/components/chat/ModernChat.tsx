"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useMatchMessages } from "@/lib/utils/useMatchMessages";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useTypingIndicators } from "@/hooks/useTypingIndicators";
import { useDeliveryReceipts } from "@/hooks/useDeliveryReceipts";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import {
  getMatchMessages,
  sendMatchMessage,
  markConversationAsRead,
  generateVoiceUploadUrl,
  getVoiceMessageUrl,
  type MatchMessage,
  type ApiResponse,
} from "@/lib/api/matchMessages";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  Smile,
  Send,
  Image as ImageIcon,
  ArrowDown,
  Shield,
  AlertTriangle,
  Crown,
  Play,
  Pause,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  formatMessageTime,
  formatVoiceDuration,
} from "@/lib/utils/messageUtils";
import { safetyAPI } from "@/lib/api/safety";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { getSubscriptionFeatures } from "@/lib/utils/subscriptionUtils";
import {
  useMessagingFeatures,
  useDailyMessageLimit,
  useVoiceMessageLimits,
} from "@/hooks/useMessagingFeatures";
import { TypingIndicator } from "./TypingIndicator";
import { DeliveryStatus } from "./DeliveryStatus";
import VoiceMessageBubble from "./VoiceMessageBubble";
import type { ReportReason } from "@/lib/api/safety";
import VoiceRecorderButton from "./VoiceRecorderButton";
// Error handling utilities will be handled inline
import { uploadVoiceMessage } from "@/lib/voiceMessageUtil";
import {
  MessageFeedback,
  ConnectionStatus,
  MessageOperationFeedback,
  LoadingOverlay,
} from "@/components/ui/MessageFeedback";

export type ModernChatProps = {
  conversationId: string;
  currentUserId: string;
  matchUserId: string;
  matchUserName?: string;
  matchUserAvatarUrl?: string;
  className?: string;
  token: string;
};

function ModernChat({
  conversationId,
  currentUserId,
  matchUserId,
  matchUserName = "",
  matchUserAvatarUrl = "",
  className = "",
  token,
}: ModernChatProps) {
  const subscriptionStatus = useSubscriptionStatus(token);
  const { trackUsage } = useUsageTracking(token);
  const [_connectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("connecting");

  const {
    messages,
    loading,
    loadingOlder,
    hasMore,
    fetchOlder,
    sendMessage,
    error,
  } = useMatchMessages(conversationId, token);

  // Typing indicators
  const { typingUsers, startTyping, stopTyping } = useTypingIndicators({
    conversationId,
    currentUserId,
    token,
  });

  // Delivery receipts
  const {
    getMessageDeliveryStatus,
    markMessageAsPending,
    markMessageAsSent,
    markMessageAsRead,
  } = useDeliveryReceipts({
    conversationId,
    token,
  });
  const [text, setText] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Enhanced feedback states
  const [messageFeedback, setMessageFeedback] = useState<{
    type: "success" | "error" | "warning" | "loading";
    message: string;
    isVisible: boolean;
  }>({ type: "success", message: "", isVisible: false });
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("connecting");

  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change & if near bottom
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if user is blocked on mount
  useEffect(() => {
    const checkBlockStatus = async () => {
      try {
        const blockStatus = await safetyAPI.checkBlockStatus(
          token,
          matchUserId
        );
        setIsBlocked(!!(blockStatus?.isBlocked || blockStatus?.isBlockedBy));
      } catch (error) {
        console.error("Error checking block status:", error);
      }
    };

    void checkBlockStatus();
  }, [token, matchUserId]);

  // Mark incoming messages as read when they come into view
  useEffect(() => {
    if (messages.length > 0 && !isBlocked) {
      const incomingMessages = messages.filter(
        (msg) => msg.fromUserId === matchUserId
      );

      // Mark the latest incoming message as read using unified API
      if (incomingMessages.length > 0) {
        const latestMessage = incomingMessages[incomingMessages.length - 1];
        markMessageAsRead(latestMessage._id);

        // Also mark conversation as read using unified API
        markConversationAsRead({ conversationId, token })
          .then((response) => {
            if (!response.success) {
              console.warn(
                "Failed to mark conversation as read:",
                response.error?.message
              );
            }
          })
          .catch((error) => {
            console.warn("Error marking conversation as read:", error);
          });
      }
    }
  }, [
    messages,
    matchUserId,
    isBlocked,
    markMessageAsRead,
    conversationId,
    token,
  ]);

  // Auto-scroll and scroll detection
  useEffect(() => {}, [matchUserId]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isNearBottom, scrollToBottom]);

  // Enhanced scroll handling for pagination and scroll-to-bottom detection
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Check if near bottom for auto-scroll behavior
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setIsNearBottom(!!isAtBottom);
    setShowScrollToBottom(!isAtBottom && messages.length > 0);

    // Load older messages when near top (improved threshold)
    if (!loadingOlder && hasMore && el.scrollTop < 200) {
      const currentScrollHeight = el.scrollHeight;
      void fetchOlder().then(() => {
        // Maintain scroll position after loading older messages
        requestAnimationFrame(() => {
          if (el && el.scrollHeight > currentScrollHeight) {
            const newScrollTop =
              el.scrollHeight - currentScrollHeight + el.scrollTop;
            el.scrollTop = newScrollTop;
          }
        });
      });
    }
  }, [loadingOlder, hasMore, fetchOlder, messages.length]);

  // Debounced scroll handler
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let timeoutId: NodeJS.Timeout;
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 50);
    };

    el.addEventListener("scroll", debouncedHandleScroll);
    return () => {
      el.removeEventListener("scroll", debouncedHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);

  // Close picker when clicking outside
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

  // Use unified messaging features
  const {
    features: messagingFeatures,
    canInitiateChat: checkCanInitiateChat,
    canSendTextMessage,
    canSendVoiceMessage,
    recordMessageSent,
    subscriptionTier,
  } = useMessagingFeatures(token);

  const { remainingMessages, hasReachedLimit, recordMessage } =
    useDailyMessageLimit(token);

  // Enhanced error handling - inline implementation
  const handleError = (error: any): { type: string; message: string } => {
    console.error("Messaging error:", error);
    
    let errorType = "UNKNOWN";
    let errorMessage = "An error occurred";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Map common error messages to types
      if (error.message.includes("Unauthorized") || error.message.includes("401")) {
        errorType = "UNAUTHORIZED";
      } else if (error.message.includes("Token expired") || error.message.includes("403")) {
        errorType = "TOKEN_EXPIRED";
      } else if (error.message.includes("Network") || error.message.includes("network")) {
        errorType = "NETWORK_ERROR";
      }
    }
    
    return { type: errorType, message: errorMessage };
  };

  const withRetry = async <T,>(
    operation: () => Promise<T>,
    maxRetries = 3,
    onRetry?: (error: any, attempt: number) => void
  ): Promise<T> => {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (onRetry) onRetry(error, attempt);
        if (attempt === maxRetries) throw error;

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw lastError;
  };

  const userPlan = subscriptionTier;
  const features = getSubscriptionFeatures(
    userPlan as "free" | "premium" | "premiumPlus"
  );

  // Determine if user is allowed to send a message (initiate or reply)
  const hasSentMessage = messages.some(
    (msg) => msg.fromUserId === currentUserId
  );
  const hasReceivedMessage = messages.some(
    (msg) => msg.fromUserId === matchUserId
  );
  const isInitiating = !hasSentMessage && !hasReceivedMessage;
  const canInitiateChat = features.canInitiateChat;
  const canChatWithMatches = features.canChatWithMatches;

  // Enhanced message sending with safety and subscription checks
  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isSending || isBlocked) return;

      // Use unified messaging features for permission checks
      const textPermission = canSendTextMessage();
      if (!textPermission.allowed) {
        showErrorToast(null, textPermission.reason || "Cannot send message");
        return;
      }

      // Check if user can initiate chat (for new conversations)
      if (isInitiating) {
        const initiatePermission = checkCanInitiateChat();
        if (!initiatePermission.allowed) {
          showErrorToast(
            null,
            initiatePermission.reason || "Cannot initiate chat"
          );
          return;
        }
      }

      // Check daily message limit for free users
      if (hasReachedLimit) {
        showErrorToast(
          null,
          "Daily message limit reached. Upgrade to Premium for unlimited messaging."
        );
        return;
      }

      setIsSending(true);

      // Stop typing indicator when sending
      stopTyping();

      try {
        const messageData = {
          fromUserId: currentUserId,
          toUserId: matchUserId,
          text: messageText.trim(),
        };

        // Generate temporary message ID for tracking
        const tempMessageId = `tmp-${Date.now()}`;
        markMessageAsPending(tempMessageId);

        // Use enhanced error handling with retry mechanism
        await withRetry(
          () => sendMessage(messageData),
          3, // max retries
          (error, attempt) => {
            console.warn(
              `Message send attempt ${attempt} failed:`,
              error.message
            );
            if (attempt < 3) {
              showErrorToast(null, `Retrying... (${attempt}/3)`);
            }
          }
        );

        // Mark as sent (the actual message ID will be handled by the optimistic update)
        markMessageAsSent(tempMessageId);

        // Record message sent for daily limit tracking
        recordMessage();

        // Track message usage
        trackUsage({
          feature: "message_sent",
          metadata: {
            targetUserId: matchUserId,
            messageType: "text",
          },
        });

        setText("");
        setIsNearBottom(true);
        // Focus back to input after sending
        setTimeout(() => inputRef.current?.focus(), 100);
      } catch (error) {
        console.error("Failed to send message:", error);
        const messagingError = handleError(error);
        
        // Show error toast
        showErrorToast(null, messagingError.message);

        // Additional handling for specific error types
        if (
          messagingError.type === "UNAUTHORIZED" ||
          messagingError.type === "TOKEN_EXPIRED"
        ) {
          // Handle authentication errors - could redirect to login
          console.warn(
            "Authentication error detected, user may need to re-login"
          );
        }
      } finally {
        setIsSending(false);
      }
    },
    [
      isSending,
      isBlocked,
      canSendTextMessage,
      checkCanInitiateChat,
      isInitiating,
      hasReachedLimit,
      recordMessage,
      currentUserId,
      trackUsage,
      matchUserId,
      sendMessage,
      stopTyping,
      markMessageAsPending,
      markMessageAsSent,
    ]
  );

  // Handle input change with typing indicators
  const handleInputChange = useCallback(
    (value: string) => {
      setText(value);

      // Start typing indicator when user types
      if (value.trim() && !isBlocked) {
        startTyping();
      } else {
        stopTyping();
      }
    },
    [startTyping, stopTyping, isBlocked]
  );

  // Enhanced keyboard shortcuts
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSendMessage(text);
      } else if (e.key === "Escape") {
        // Clear input on escape
        setText("");
        stopTyping();
      }
    },
    [text, handleSendMessage, stopTyping]
  );

  // Voice message sender using unified API
  const sendVoiceMessage = useCallback(
    async (blob: Blob, toUserId: string, duration: number) => {
      try {
        // Use unified messaging features for voice message permission checks
        const voicePermission = canSendVoiceMessage(duration);
        if (!voicePermission.allowed) {
          showErrorToast(
            null,
            voicePermission.reason || "Cannot send voice message"
          );
          return;
        }

        // 1. Generate upload URL using unified API
        const uploadResponse = await generateVoiceUploadUrl(token);
        if (!uploadResponse.success || !uploadResponse.data) {
          throw new Error(
            uploadResponse.error?.message || "Failed to get upload URL"
          );
        }

        // 2. Upload the audio file to storage
        const uploadResult = await fetch(uploadResponse.data.uploadUrl, {
          method: "PUT", // Changed to PUT for Convex storage
          body: blob,
          headers: {
            "Content-Type": blob.type || "audio/webm",
          },
        });

        if (!uploadResult.ok) {
          throw new Error("Failed to upload voice message");
        }

        // 3. Send message with voice metadata using unified API
        const messageResponse = await sendMatchMessage({
          conversationId,
          fromUserId: currentUserId,
          toUserId,
          text: "", // Empty text for voice messages
          type: "voice",
          audioStorageId: uploadResponse.data.storageId,
          duration,
          fileSize: blob.size,
          mimeType: blob.type || "audio/webm",
          token: token,
        });

        if (!messageResponse.success) {
          throw new Error(
            messageResponse.error?.message || "Failed to send voice message"
          );
        }

        trackUsage({
          feature: "voice_message_sent",
          metadata: { targetUserId: toUserId, messageType: "voice" },
        });
        showSuccessToast("Voice message sent!");
      } catch (err) {
        console.error("Error sending voice message", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send voice message";
        showErrorToast(null, errorMessage);
      }
    },
    [token, conversationId, currentUserId, trackUsage, canSendVoiceMessage]
  );

  // Block user handler
  const handleBlockUser = useCallback(async () => {
    try {
      await safetyAPI.blockUser(token, matchUserId);
      setIsBlocked(true);
      setShowReportModal(false);
      showSuccessToast("User has been blocked");
    } catch (error) {
      console.error("Error blocking user:", error);
      showErrorToast(null, "Failed to block user");
    }
  }, [token, matchUserId]);

  // Report user handler
  const handleReportUser = useCallback(
    async (reason: ReportReason, description: string) => {
      try {
        await safetyAPI.reportUser(token, {
          reportedUserId: matchUserId,
          reason,
          description,
        });

        setShowReportModal(false);
        showSuccessToast("Report submitted successfully");
      } catch (error) {
        console.error("Error reporting user:", error);
        showErrorToast(null, "Failed to submit report");
      }
    },
    [token, matchUserId]
  );

  return (
    <div
      className={cn(
        "bg-white text-neutral-900 rounded-xl shadow-sm flex flex-col h-full mb-6",
        className
      )}
    >
      {/* Chat Header */}
      <div className="bg-primary text-white p-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white">
              {matchUserAvatarUrl ? (
                <AvatarImage
                  src={matchUserAvatarUrl}
                  alt={matchUserName || "User"}
                />
              ) : (
                <AvatarFallback>
                  {matchUserName ? matchUserName[0] : "U"}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="font-medium text-lg">
              {matchUserName || "User"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Enhanced Connection status indicator */}
            <ConnectionStatus status={connectionStatus} />

            {subscriptionStatus.data?.plan === "free" && (
              <div className="text-xs bg-accent/20 px-2 py-1 rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3" />
                <span>Free</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setShowReportModal(true)}
            >
              <Shield className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 relative">
        {/* Messages list */}
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
        >
          {/* Load more messages button */}
          {hasMore && !loading && messages.length > 0 && (
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
                  onClick={fetchOlder}
                  className="text-primary hover:bg-primary/10 text-sm"
                >
                  Load older messages
                </Button>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <LoadingSpinner size={32} />
                <p className="text-neutral-light text-sm">
                  Loading messages...
                </p>
              </div>
            </div>
          ) : isBlocked ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    Chat Unavailable
                  </h3>
                  <p className="text-gray-500 text-sm">
                    You cannot message this user
                  </p>
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
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
                  const showTime =
                    !prevMsg ||
                    msg.createdAt - prevMsg.createdAt > 5 * 60 * 1000;
                  const isVoice = msg.type === "voice" && !!msg.audioStorageId;

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
                      {showTime && (
                        <div className="text-center">
                          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                            {formatMessageTime(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={cn(
                            "max-w-[280px] px-4 py-3 rounded-2xl shadow-sm text-sm break-words",
                            isCurrentUser
                              ? "bg-primary text-white rounded-br-md"
                              : "bg-gray-100 text-gray-900 rounded-bl-md"
                          )}
                        >
                          {isVoice ? (
                            <VoiceMessageBubble
                              message={msg}
                              isPlaying={playingVoice === msg._id}
                              onPlayToggle={(playing) => {
                                setPlayingVoice(playing ? msg._id : null);
                              }}
                              isCurrentUser={isCurrentUser}
                              token={token}
                            />
                          ) : (
                            <p className="leading-relaxed">{msg.text}</p>
                          )}
                          <div
                            className={cn(
                              "text-xs mt-2 flex items-center gap-1",
                              isCurrentUser
                                ? "text-purple-100 justify-end"
                                : "text-gray-500"
                            )}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <DeliveryStatus
                              status={getMessageDeliveryStatus(
                                msg._id,
                                isCurrentUser
                              )}
                              isCurrentUser={isCurrentUser}
                            />{" "}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <TypingIndicator
                    userName={matchUserName}
                    key="typing-indicator"
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollToBottom && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-4 right-4"
            >
              <Button
                size="sm"
                onClick={() => scrollToBottom(true)}
                className="rounded-full shadow-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 h-10 w-10 p-0"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="border-t border-secondary-light/30 p-4 bg-base-dark rounded-b-2xl">
        {/* Enhanced Message Feedback */}
        <MessageFeedback
          type={messageFeedback.type}
          message={messageFeedback.message}
          isVisible={messageFeedback.isVisible}
          onClose={() =>
            setMessageFeedback((prev) => ({ ...prev, isVisible: false }))
          }
        />

        <form
          className="flex items-end gap-3 relative"
          onSubmit={async (e) => {
            e.preventDefault();
            void handleSendMessage(text);
          }}
        >
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isBlocked ? "Cannot send messages" : "Type your message…"
              }
              disabled={isSending || isBlocked}
              className={cn(
                "w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all",
                (isSending || isBlocked) && "opacity-50 cursor-not-allowed"
              )}
            />

            {/* Emoji picker toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPicker((p) => !p)}
              ref={toggleBtnRef}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary transition-colors p-2 h-8 w-8"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>

          {/* Additional action buttons */}
          <div className="flex gap-2">
            {/* Voice recorder button */}
            <VoiceRecorderButton
              onSend={(blob, dur) => sendVoiceMessage(blob, matchUserId, dur)}
              onUpgradeRequired={() => {
                const voicePermission = canSendVoiceMessage();
                showErrorToast(
                  null,
                  voicePermission.reason ||
                    "Voice messages are a Premium feature. Upgrade to send voice messages."
                );
              }}
              onRecordingError={(error) => {
                console.error("Voice recording error:", error);
                showErrorToast(
                  null,
                  error.message || "Failed to record voice message"
                );
              }}
              canSendVoice={messagingFeatures?.canSendVoiceMessages || false}
              className="h-10 w-auto"
              maxDuration={messagingFeatures?.voiceMessageDurationLimit || 30}
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-secondary hover:text-primary transition-colors p-2 h-10 w-10"
              title="Send image (Premium feature)"
              disabled
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* Send button */}
          <Button
            type="submit"
            disabled={!text.trim() || isSending || isBlocked}
            className={cn(
              "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl",
              (!text.trim() || isSending || isBlocked) &&
                "opacity-50 cursor-not-allowed transform-none shadow-none"
            )}
          >
            {isSending ? (
              <LoadingSpinner size={16} className="text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>

          {/* Emoji picker */}
          <AnimatePresence>
            {showPicker && (
              <motion.div
                ref={pickerRef}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full right-0 mb-2 z-50 shadow-xl rounded-lg overflow-hidden"
              >
                <EmojiPicker
                  onEmojiClick={(emojiData: EmojiClickData) => {
                    setText((prev) => prev + emojiData.emoji);
                    inputRef.current?.focus();
                  }}
                  width={350}
                  height={400}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 p-3 bg-danger/10 border border-danger/30 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <p className="text-danger text-xs flex-1">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="text-danger hover:bg-danger/20 text-xs px-2 py-1 h-auto"
                >
                  Retry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Report User
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Report inappropriate behavior or content
                  </p>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={() =>
                      handleReportUser(
                        "harassment",
                        "User engaged in harassment"
                      )
                    }
                    className="w-full"
                    variant="outline"
                  >
                    Report Harassment
                  </Button>
                  <Button
                    onClick={() =>
                      handleReportUser(
                        "inappropriate_content",
                        "User sent inappropriate content"
                      )
                    }
                    className="w-full"
                    variant="outline"
                  >
                    Report Inappropriate Content
                  </Button>
                  <Button
                    onClick={handleBlockUser}
                    className="w-full bg-red-500 hover:bg-red-600 text-white"
                  >
                    Block User
                  </Button>
                </div>
                <Button
                  onClick={() => setShowReportModal(false)}
                  variant="ghost"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ModernChat;
// Voice Message Component
interface VoiceMessageProps {
  message: MatchMessage;
  isPlaying: boolean;
  onPlayToggle: (playing: boolean) => void;
  isCurrentUser: boolean;
  token: string;
}

function VoiceMessage({
  message,
  isPlaying,
  onPlayToggle,
  isCurrentUser,
  token,
}: VoiceMessageProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAudioUrl = useCallback(async () => {
    if (audioUrl || loading) return;

    setLoading(true);
    try {
      const response = await getVoiceMessageUrl({
        storageId: message.audioStorageId!,
        token: token,
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.error?.message || "Failed to fetch voice message"
        );
      }

      setAudioUrl(response.data.url);
    } catch (error) {
      console.error("Error fetching voice message:", error);
      showErrorToast(null, "Failed to load voice message");
    } finally {
      setLoading(false);
    }
  }, [message._id, audioUrl, loading, token]);

  const handlePlayToggle = useCallback(async () => {
    if (!audioUrl) {
      await fetchAudioUrl();
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => onPlayToggle(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      onPlayToggle(false);
    } else {
      void audioRef.current.play();
      onPlayToggle(true);
    }
  }, [audioUrl, isPlaying, onPlayToggle, fetchAudioUrl]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="ghost"
        onClick={handlePlayToggle}
        disabled={loading}
        className={cn(
          "p-2 rounded-full",
          isCurrentUser
            ? "hover:bg-white/20 text-white"
            : "hover:bg-gray-200 text-gray-600"
        )}
      >
        {loading ? (
          <LoadingSpinner size={16} />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>
      <div className="flex-1">
        <div
          className={cn(
            "h-1 rounded-full",
            isCurrentUser ? "bg-white/30" : "bg-gray-300"
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isCurrentUser ? "bg-white" : "bg-purple-500"
            )}
            style={{ width: isPlaying ? "100%" : "0%" }}
          />
        </div>
        <div
          className={cn(
            "text-xs mt-1",
            isCurrentUser ? "text-purple-100" : "text-gray-500"
          )}
        >
          🎤 {formatVoiceDuration(message.duration || 0)}
        </div>
      </div>
    </div>
  );
}
