"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MessageCircle, Mic, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatMessageTime,
  getMessagePreview,
  calculateUnreadCount,
  ConversationData,
  getOtherUserId,
} from "@/lib/utils/messageUtils";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { getConversations } from "@/lib/api/conversation";

interface ConversationListProps {
  onConversationSelect: (
    conversationId: string,
    otherUserId: string,
    otherUserName: string,
  ) => void;
  selectedConversationId?: string;
  className?: string;
}

interface ConversationWithUser extends ConversationData {
  otherUser: {
    _id: string;
    fullName: string;
    profileImage?: string;
    isOnline?: boolean;
  };
  unreadCount: number;
  lastMessagePreview: string;
}

export default function ConversationList({
  onConversationSelect,
  selectedConversationId,
  className = "",
}: ConversationListProps) {
  const { getToken, userId } = useAuth();
  const subscriptionStatus = useSubscriptionStatus();
  const [conversations, setConversations] = useState<ConversationWithUser[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error("Authentication required");

      const result = await getConversations({ token });
      const conversationsData = (result.conversations as unknown[]) || [];

      // Transform conversations to include user info and metadata
      const transformedConversations: ConversationWithUser[] =
        conversationsData.map((conv: any) => {
          const otherUserId = getOtherUserId(conv._id, userId);
          const unreadCount = calculateUnreadCount(conv.messages || [], userId);
          const lastMessage = conv.lastMessage;

          return {
            ...conv,
            otherUser: {
              _id: otherUserId || "",
              fullName: conv.otherUserName || "Unknown User",
              profileImage: conv.otherUserImage,
              isOnline: conv.otherUserOnline,
            },
            unreadCount,
            lastMessagePreview: lastMessage
              ? getMessagePreview(lastMessage)
              : "No messages yet",
          };
        });

      setConversations(transformedConversations);
      setError(null);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load conversations",
      );
    } finally {
      setLoading(false);
    }
  }, [userId, getToken]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.otherUser.fullName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      conv.lastMessagePreview.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle conversation selection
  const handleConversationClick = useCallback(
    (conv: ConversationWithUser) => {
      onConversationSelect(
        conv._id,
        conv.otherUser._id,
        conv.otherUser.fullName,
      );
    },
    [onConversationSelect],
  );

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center space-y-2">
          <LoadingSpinner size={32} />
          <p className="text-gray-500 text-sm">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <div className="space-y-3">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <MessageCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              Failed to load conversations
            </h3>
            <p className="text-gray-500 text-sm mt-1">{error}</p>
          </div>
          <Button onClick={fetchConversations} size="sm">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-base", className)}>
      {/* Header */}
      <div className="p-4 border-b border-secondary-light/30">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-neutral font-serif">
            Messages
          </h2>
          {(subscriptionStatus.data as { plan?: string })?.plan === "free" && (
            <div className="text-xs bg-accent-light text-accent-dark px-2 py-1 rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3" />
              <span>Free Plan</span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-secondary-light/50 focus:ring-primary"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">
                  {searchQuery
                    ? "No matching conversations"
                    : "No conversations yet"}
                </h3>
                <p className="text-gray-500 text-sm">
                  {searchQuery
                    ? "Try searching for a different name or message"
                    : "Start messaging your matches to see conversations here"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            <AnimatePresence>
              {filteredConversations.map((conv) => (
                <motion.div
                  key={conv._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    "font-medium text-sm truncate",
                    conv.unreadCount > 0
                      ? "text-neutral"
                      : "text-neutral-light",
                  )}
                  onClick={() => handleConversationClick(conv)}
                >
                  <div className="flex items-start gap-3">
                    {/* Profile Image */}
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-light/30 to-secondary-light/30 rounded-full flex items-center justify-center">
                        {conv.otherUser.profileImage ? (
                          <img
                            src={conv.otherUser.profileImage}
                            alt={conv.otherUser.fullName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-primary font-medium text-lg">
                            {conv.otherUser.fullName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Online indicator */}
                      {conv.otherUser.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success border-2 border-base rounded-full" />
                      )}
                      {/* Unread badge */}
                      {conv.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </div>
                      )}{" "}
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3
                          className={cn(
                            "font-medium text-sm truncate",
                            conv.unreadCount > 0
                              ? "text-gray-900"
                              : "text-gray-700",
                          )}
                        >
                          {conv.otherUser.fullName}
                        </h3>
                        <span className="text-xs text-neutral-light flex-shrink-0">
                          {conv.lastMessage
                            ? formatMessageTime(conv.lastMessage._creationTime)
                            : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Message type indicator */}
                        {conv.lastMessage?.type === "voice" && (
                          <Mic className="w-3 h-3 text-secondary flex-shrink-0" />
                        )}

                        <p
                          className={cn(
                            "text-sm truncate",
                            conv.unreadCount > 0
                              ? "text-neutral font-medium"
                              : "text-neutral-light",
                          )}
                        >
                          {conv.lastMessagePreview}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer with upgrade prompt for free users */}
      {(subscriptionStatus.data as { plan?: string })?.plan === "free" && (
        <div className="p-4 border-t border-secondary-light/30 bg-gradient-to-r from-primary-light/20 to-secondary-light/20">
          <div className="text-center space-y-2">
            <p className="text-xs text-neutral-light">
              Limited to 5 messages per day
            </p>
            <Button
              size="sm"
              className="w-full bg-primary hover:bg-primary-dark"
            >
              Upgrade to Premium
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
