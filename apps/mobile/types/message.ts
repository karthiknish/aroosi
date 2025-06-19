export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageDeliveryReceipt {
  messageId: string;
  userId: string;
  status: MessageStatus;
  timestamp: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'voice' | 'image' | 'file';
  timestamp: number;
  status: MessageStatus;
  deliveryReceipts?: MessageDeliveryReceipt[];
  
  // Voice message specific
  voiceUrl?: string;
  voiceDuration?: number;
  voiceWaveform?: number[];
  
  // Image/file specific
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  
  // Metadata
  editedAt?: number;
  replyToId?: string;
  isSystemMessage?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastActivity: number;
  unreadCount: number;
  isTyping?: string[]; // User IDs currently typing
  
  // Metadata
  title?: string;
  description?: string;
  isGroup?: boolean;
  createdAt: number;
  updatedAt: number;
}