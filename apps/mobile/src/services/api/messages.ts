/**
 * Messages API Service
 */

import { api } from './client';
import auth from '@react-native-firebase/auth';
import { API_BASE_URL } from '../../config';

export type MessageType = 'text' | 'image' | 'audio' | 'gif' | 'icebreaker';

export interface Message {
    id: string;
    matchId: string;
    senderId: string;
    recipientId: string;
    type: MessageType;
    content: string;
    mediaUrl?: string;
    readAt?: string;
    createdAt: string;
}

export interface Conversation {
    matchId: string;
    userId: string;
    user: {
        id: string;
        displayName: string | null;
        photoURL: string | null;
    };
    lastMessage?: Message;
    unreadCount: number;
    updatedAt: string;
}

/**
 * Get conversations
 */
export async function getConversations() {
    return api.get<Conversation[]>('/conversations');
}

/**
 * Get messages for a match
 */
export async function getMessages(matchId: string, cursor?: string) {
    const url = cursor
        ? `/messages?matchId=${matchId}&cursor=${cursor}`
        : `/messages?matchId=${matchId}`;
    return api.get<{ messages: Message[]; nextCursor?: string }>(url);
}

/**
 * Send a text message
 */
export async function sendMessage(matchId: string, content: string) {
    return api.post<Message>('/messages/send', {
        matchId,
        type: 'text',
        content,
    });
}

/**
 * Send an icebreaker message
 */
export async function sendIcebreaker(matchId: string, icebreakerText: string) {
    return api.post<Message>('/messages/send', {
        matchId,
        type: 'icebreaker',
        content: icebreakerText,
    });
}

/**
 * Send an image message
 */
export async function sendImageMessage(matchId: string, imageUri: string) {
    // First upload the image
    const formData = new FormData();
    formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'message_image.jpg',
    } as unknown as Blob);
    formData.append('matchId', matchId);

    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/messages/upload-image`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    return response.json();
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(matchId: string) {
    return api.post('/messages/mark-read', { matchId });
}

/**
 * Send typing indicator
 */
export async function sendTypingIndicator(matchId: string, isTyping: boolean) {
    return api.post('/typing-indicators', { matchId, isTyping });
}

/**
 * Send delivery receipt
 */
export async function sendDeliveryReceipt(messageIds: string[]) {
    return api.post('/delivery-receipts', { messageIds });
}

/**
 * React to a message
 */
export async function reactToMessage(messageId: string, emoji: string) {
    return api.post('/reactions', { messageId, emoji });
}

/**
 * Upload voice message
 */
export async function uploadVoiceMessage(matchId: string, audioUri: string, durationMs: number) {
    const formData = new FormData();
    formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'voice_message.m4a',
    } as unknown as Blob);
    formData.append('matchId', matchId);
    formData.append('duration', String(durationMs));

    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/voice-messages/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    return response.json();
}

// Helper
async function getAuthToken(): Promise<string | null> {
    const user = auth().currentUser;
    if (!user) return null;
    return user.getIdToken();
}
