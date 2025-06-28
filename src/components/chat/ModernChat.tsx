"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useMatchMessages } from "@/lib/utils/useMatchMessages";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useTypingIndicators } from "@/hooks/useTypingIndicators";
import { useDeliveryReceipts } from "@/hooks/useDeliveryReceipts";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  Smile,
  Send,
  Image as ImageIcon,
  ArrowDown,
  Mic,
  MicOff,
  Play,
  Pause,
  Shield,
  AlertTriangle,
  Crown,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  formatMessageTime,
  formatVoiceDuration,
  getVoiceMessageUrl,
} from "@/lib/utils/messageUtils";
import { safetyAPI } from "@/lib/api/safety";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { getSubscriptionFeatures } from "@/lib/utils/subscriptionUtils";
import { TypingIndicator } from "./TypingIndicator";
import { DeliveryStatus } from "./DeliveryStatus";
import type { ReportReason } from "@/lib/api/safety";
import type { MatchMessage } from "@/lib/api/matchMessages";

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
  const [connectionStatus, setConnectionStatus] = useState<
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
  } = useMatchMessages(conversationId, token, setConnectionStatus);

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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

    checkBlockStatus();
  }, [token, matchUserId]);

  // Mark incoming messages as read when they come into view
  useEffect(() => {
    if (messages.length > 0 && !isBlocked) {
      const incomingMessages = messages.filter(
        (msg) => msg.fromUserId === matchUserId
      );

      // Mark the latest incoming message as read
      if (incomingMessages.length > 0) {
        const latestMessage = incomingMessages[incomingMessages.length - 1];
        markMessageAsRead(latestMessage._id);
      }
    }
  }, [messages, matchUserId, isBlocked, markMessageAsRead]);

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
      fetchOlder().then(() => {
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

  const userPlan =
    (subscriptionStatus.data &&
      (subscriptionStatus.data as { plan?: string }).plan) ||
    "free";
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

      // Free users: block if trying to initiate chat
      if (!canInitiateChat && isInitiating) {
        showErrorToast(
          null,
          "Upgrade to Premium to initiate new chats. You can reply to messages from your matches."
        );
        return;
      }
      // Free users: allow reply if match has messaged first
      if (!canChatWithMatches) {
        showErrorToast(null, "Upgrade to Premium to chat with your matches.");
        return;
      }
      // Check subscription limits for free users
      if (userPlan === "free") {
        const todaysMessages = messages.filter(
          (msg) =>
            msg.fromUserId === currentUserId &&
            new Date(msg.createdAt).toDateString() === new Date().toDateString()
        ).length;

        if (todaysMessages >= 5) {
          showErrorToast(
            null,
            "Daily message limit reached. Upgrade to Premium for unlimited messaging."
          );
          return;
        }
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

        await sendMessage(messageData);

        // Mark as sent (the actual message ID will be handled by the optimistic update)
        markMessageAsSent(tempMessageId);

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
        showErrorToast(null, "Failed to send message. Please try again.");
      } finally {
        setIsSending(false);
      }
    },
    [
      isSending,
      isBlocked,
      canInitiateChat,
      canChatWithMatches,
      isInitiating,
      userPlan,
      messages,
      currentUserId,
      trackUsage,
      matchUserId,
      sendMessage,
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
        handleSendMessage(text);
      } else if (e.key === "Escape") {
        // Clear input on escape
        setText("");
        stopTyping();
      }
    },
    [text, handleSendMessage, stopTyping]
  );

  // Voice recording functionality
  const startRecording = useCallback(async () => {
    if (isBlocked || isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        await sendVoiceMessage(audioBlob, recordingTime);

        // Cleanup
        stream.getTracks().forEach((track) => track.stop());
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 300) {
            // 5 minutes max
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      showErrorToast(
        null,
        "Failed to start recording. Please check microphone permissions."
      );
    }
  }, [isBlocked, isRecording, recordingTime]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, [isRecording]);

  const sendVoiceMessage = useCallback(
    async (audioBlob: Blob, duration: number) => {
      if (duration < 1) {
        showErrorToast(null, "Voice message too short");
        return;
      }

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob);
        formData.append("conversationId", conversationId);
        formData.append("duration", duration.toString());
        formData.append("toUserId", matchUserId);

        const response = await fetch("/api/voice-messages/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send voice message");
        }

        await response.json();

        // Track voice message usage
        trackUsage({
          feature: "voice_message_sent",
          metadata: {
            targetUserId: matchUserId,
            messageType: "voice",
          },
        });

        showSuccessToast("Voice message sent!");
        setIsNearBottom(true);
      } catch (error) {
        console.error("Error sending voice message:", error);
        showErrorToast(null, "Failed to send voice message");
      }
    },
    [conversationId, matchUserId, token, trackUsage]
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
        "bg-white text-neutral-900 rounded-xl shadow-sm flex flex-col h-full",
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
            {/* Connection status indicator */}
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                connectionStatus === "connected"
                  ? "bg-success"
                  : connectionStatus === "connecting"
                    ? "bg-accent animate-pulse"
                    : "bg-danger"
              )}
            />

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
                            <VoiceMessage
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
        <form
          className="flex items-end gap-3 relative"
          onSubmit={async (e) => {
            e.preventDefault();
            handleSendMessage(text);
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
            {/* Voice recording button - Premium feature */}
            {(subscriptionStatus.data?.plan === "premium" ||
              subscriptionStatus.data?.plan === "premiumPlus") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "transition-colors p-2 h-10 w-10",
                  isRecording
                    ? "text-danger hover:text-danger bg-danger/10"
                    : "text-secondary hover:text-primary"
                )}
                title={isRecording ? "Stop recording" : "Record voice message"}
                disabled={isBlocked || isSending}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            )}

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

        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-2 flex items-center justify-center gap-2 text-red-500"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                Recording {formatVoiceDuration(recordingTime)}
              </span>
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
      const response = await fetch(getVoiceMessageUrl(message._id), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch voice message");
      }

      const data = await response.json();
      setAudioUrl(data.audioUrl);
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
      audioRef.current.play();
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
