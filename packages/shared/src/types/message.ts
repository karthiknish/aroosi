/**
 * Message Types - Shared between web and mobile
 */

export type MessageType = 'text' | 'image' | 'audio' | 'gif' | 'icebreaker';

export interface Message {
    id: string;
    matchId: string;
    senderId: string;
    recipientId: string;
    type: MessageType;
    content: string;
    mediaUrl?: string;
    readAt?: Date | string;
    createdAt: Date | string;
}

export interface Conversation {
    matchId: string;
    participants: string[];
    lastMessage?: Message;
    unreadCount: number;
    updatedAt: Date | string;
}
