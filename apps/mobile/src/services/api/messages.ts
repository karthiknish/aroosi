/**
 * Messages API Service
 */

import { api } from './client';
import auth from '@react-native-firebase/auth';
import { API_BASE_URL } from '../../config';
import type { Message, MessageType, Conversation } from '@aroosi/shared';

// Re-export types for convenience
export type { Message, MessageType, Conversation } from '@aroosi/shared';

/**
 * Get conversations
 */
export async function getConversations() {
    return api.get<Conversation[]>('/conversations');
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string, cursor?: string) {
    const url = cursor
        ? `/messages?conversationId=${conversationId}&cursor=${cursor}`
        : `/messages?conversationId=${conversationId}`;
    return api.get<{ messages: Message[]; nextCursor?: string }>(url);
}

/**
 * Send a text message
 */
export async function sendMessage(
    conversationId: string, 
    fromUserId: string,
    toUserId: string,
    content: string
) {
    return api.post<Message>('/messages/send', {
        conversationId,
        fromUserId,
        toUserId,
        text: content,
        type: 'text',
    });
}

/**
 * Send an icebreaker message
 */
export async function sendIcebreaker(
    conversationId: string,
    fromUserId: string,
    toUserId: string,
    icebreakerText: string
) {
    return api.post<Message>('/messages/send', {
        conversationId,
        fromUserId,
        toUserId,
        text: icebreakerText,
        type: 'icebreaker',
    });
}

/**
 * Send an image message
 */
export async function sendImageMessage(conversationId: string, imageUri: string) {
    // First upload the image
    const formData = new FormData();
    formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'message_image.jpg',
    } as unknown as Blob);
    formData.append('conversationId', conversationId);

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
export async function markMessagesAsRead(conversationId: string) {
    return api.post('/messages/mark-read', { conversationId });
}

/**
 * Send typing indicator
 * @param action - 'start' when user begins typing, 'stop' when user stops
 */
export async function sendTypingIndicator(conversationId: string, action: 'start' | 'stop') {
    return api.post('/typing-indicators', { conversationId, action });
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
 * @param toUserId - The recipient user ID (required by backend)
 */
export async function uploadVoiceMessage(
    conversationId: string, 
    toUserId: string,
    audioUri: string, 
    durationMs: number
) {
    const formData = new FormData();
    formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'voice_message.m4a',
    } as unknown as Blob);
    formData.append('conversationId', conversationId);
    formData.append('toUserId', toUserId);
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
