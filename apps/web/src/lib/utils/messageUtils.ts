// Cookie-based Convex Auth is used in server routes; this is a pure UI utility module.

import type { Conversation as SharedConversation, Message as SharedMessage, MessageType } from "@aroosi/shared/types";

// Message types and interfaces
export type MessageData = SharedMessage;
export type ConversationData = SharedConversation;

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: number;
}

// Conversation ID utilities
export function createConversationId(userId1: string, userId2: string): string {
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
}

export function parseConversationId(
  conversationId: string
): { user1: string; user2: string } | null {
  const parts = conversationId.split("_");
  if (parts.length !== 2) return null;

  return {
    user1: parts[0],
    user2: parts[1],
  };
}

export function getOtherUserId(
  conversationId: string,
  currentUserId: string
): string | null {
  const parsed = parseConversationId(conversationId);
  if (!parsed) return null;

  return parsed.user1 === currentUserId ? parsed.user2 : parsed.user1;
}

// Message formatting utilities
export function formatMessageTime(timestamp: number | string | Date): string {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffInMs = now.getTime() - messageDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return "Just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays === 1) {
    return "Yesterday";
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return messageDate.toLocaleDateString();
  }
}

export function formatVoiceDuration(durationInSeconds: number): string {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function truncateMessage(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// Message grouping utilities
export function groupMessagesByDate(
  messages: MessageData[]
): Record<string, MessageData[]> {
  const groups: Record<string, MessageData[]> = {};

  messages.forEach((message) => {
    const timestamp = message._creationTime || message.createdAt || Date.now();
    const date = new Date(timestamp);
    const dateKey = date.toDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });

  return groups;
}

export function shouldShowTimestamp(
  currentMessage: MessageData,
  previousMessage?: MessageData
): boolean {
  if (!previousMessage) return true;

  const currentTs = Number(currentMessage._creationTime || currentMessage.createdAt) || 0;
  const prevTs = Number(previousMessage._creationTime || previousMessage.createdAt) || 0;
  const timeDiff = currentTs - prevTs;
  const minutesDiff = timeDiff / (1000 * 60);

  // Show timestamp if more than 15 minutes apart or different sender
  return (
    minutesDiff > 15 || currentMessage.fromUserId !== previousMessage.fromUserId
  );
}

// Typing indicator utilities
const typingTimeouts = new Map<string, NodeJS.Timeout>();

export function handleTypingStart(
  conversationId: string,
  userId: string,
  onTypingUpdate: (typing: TypingIndicator) => void
): void {
  // Clear existing timeout
  const existingTimeout = typingTimeouts.get(`${conversationId}_${userId}`);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Emit typing start
  onTypingUpdate({
    userId,
    conversationId,
    isTyping: true,
    timestamp: Date.now(),
  });

  // Set timeout to stop typing after 3 seconds
  const timeout = setTimeout(() => {
    onTypingUpdate({
      userId,
      conversationId,
      isTyping: false,
      timestamp: Date.now(),
    });
    typingTimeouts.delete(`${conversationId}_${userId}`);
  }, 3000);

  typingTimeouts.set(`${conversationId}_${userId}`, timeout);
}

export function handleTypingStop(
  conversationId: string,
  userId: string,
  onTypingUpdate: (typing: TypingIndicator) => void
): void {
  const existingTimeout = typingTimeouts.get(`${conversationId}_${userId}`);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    typingTimeouts.delete(`${conversationId}_${userId}`);
  }

  onTypingUpdate({
    userId,
    conversationId,
    isTyping: false,
    timestamp: Date.now(),
  });
}

// Unread message utilities
export function calculateUnreadCount(
  messages: MessageData[],
  currentUserId: string
): number {
  return messages.filter(
    (message) => message.toUserId === currentUserId && !message.isRead
  ).length;
}

export function getLastMessage(messages: MessageData[]): MessageData | null {
  if (messages.length === 0) return null;
  return messages[messages.length - 1];
}

// Voice message utilities
export function isVoiceMessage(message: MessageData): boolean {
  return message.type === "voice" && !!message.audioStorageId;
}

export function getVoiceMessageUrl(messageId: string): string {
  return `/api/voice-messages/${messageId}/url`;
}

// Message status utilities
export interface MessageStatus {
  sent: boolean;
  delivered: boolean;
  read: boolean;
  timestamp: number;
}

export function getMessageStatus(message: MessageData): MessageStatus {
  return {
    sent: true, // If we have the message, it was sent
    delivered: true, // In this system, delivered = sent
    read: !!message.isRead,
    timestamp: Number(message.readAt || message._creationTime || message.createdAt) || Date.now(),
  };
}

// Conversation utilities
export async function getConversationWithUser(
  _currentUserId: string,
  _otherUserId: string,
  _token: string
): Promise<ConversationData | null> {
  // Not implemented in UI util; conversations are fetched via server API routes.
  return null;
}

// Subscription feature checks
export function canSendVoiceMessage(userPlan: string): boolean {
  return ["premium", "premiumPlus"].includes(userPlan);
}

export function canSendImages(userPlan: string): boolean {
  return ["premium", "premiumPlus"].includes(userPlan);
}

export function getMessageLimit(userPlan: string): number {
  switch (userPlan) {
    case "free":
      return 5; // 5 messages per day
    case "premium":
      return 100; // 100 messages per day
    case "premiumPlus":
      return -1; // Unlimited
    default:
      return 5;
  }
}

// Search and filter utilities
export function searchMessages(
  messages: MessageData[],
  query: string
): MessageData[] {
  const lowercaseQuery = query.toLowerCase();
  return messages.filter((message) =>
    (message.text || "").toLowerCase().includes(lowercaseQuery)
  );
}

export function filterMessagesByType(
  messages: MessageData[],
  type: MessageType
): MessageData[] {
  return messages.filter((message) => message.type === type);
}

// Message export utilities
export function exportConversationToText(
  messages: MessageData[],
  userNames: Record<string, string>
): string {
  let exportText = `Conversation Export - ${new Date().toISOString()}\n`;
  exportText += "=".repeat(50) + "\n\n";

  const grouped = groupMessagesByDate(messages);

  Object.entries(grouped).forEach(([date, msgs]) => {
    exportText += `--- ${date} ---\n`;

    msgs.forEach((message) => {
      const senderName = userNames[message.fromUserId || ""] || "Unknown User";
      const timestamp = message._creationTime || message.createdAt || Date.now();
      const time = new Date(timestamp).toLocaleTimeString();

      if (message.type === "voice") {
        exportText += `[${time}] ${senderName}: [Voice Message - ${formatVoiceDuration(message.duration || 0)}]\n`;
      } else {
        exportText += `[${time}] ${senderName}: ${message.text || ""}\n`;
      }
    });

    exportText += "\n";
  });

  return exportText;
}

// Cleanup utilities
export function cleanupTypingTimeouts(): void {
  typingTimeouts.forEach((timeout) => clearTimeout(timeout));
  typingTimeouts.clear();
}

// Message preview utilities
export function getMessagePreview(message: MessageData): string {
  if (message.type === "voice") {
    return `🎤 Voice message (${formatVoiceDuration(message.duration || 0)})`;
  } else if (message.type === "image") {
    return "📷 Image";
  } else {
    return truncateMessage(message.text || "", 40);
  }
}

// Real-time event utilities
export interface MessageEvent {
  type:
    | "message_sent"
    | "message_read"
    | "typing_start"
    | "typing_stop"
    | "user_online"
    | "user_offline";
  conversationId: string;
  userId: string;
  data?: unknown;
  timestamp: number;
}

export function createMessageEvent(
  type: MessageEvent["type"],
  conversationId: string,
  userId: string,
  data?: unknown
): MessageEvent {
  return {
    type,
    conversationId,
    userId,
    data,
    timestamp: Date.now(),
  };
}
