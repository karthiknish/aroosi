/**
 * Conversations API Service
 */

import { api, ApiResponse } from './client';
import type { Conversation } from '@aroosi/shared';

export type { Conversation } from '@aroosi/shared';

interface ConversationParticipant {
    userId: string;
    fullName?: string;
    profileImageUrls?: string[];
}

interface ConversationApiRecord {
    _id?: string;
    id?: string;
    conversationId?: string;
    participants?: ConversationParticipant[];
    lastMessage?: Conversation['lastMessage'];
    lastMessageAt?: number | null;
    unreadCount?: number;
    updatedAt?: number | string;
}

interface ConversationListResponse {
    conversations?: ConversationApiRecord[];
}

interface ConversationDetailResponse {
    conversation?: ConversationApiRecord;
}

function normalizeConversation(record: ConversationApiRecord): Conversation {
    const conversationId = record.conversationId || record.id || record._id || '';
    const participants = Array.isArray(record.participants) ? record.participants : [];
    const selfParticipant = participants.find((participant) => participant.fullName === 'You');
    const otherParticipant =
        participants.find((participant) => participant.userId !== selfParticipant?.userId) ||
        participants[0];

    return {
        matchId: conversationId,
        conversationId,
        participants: participants.map((participant) => participant.userId),
        userId: selfParticipant?.userId,
        user: otherParticipant
            ? {
                id: otherParticipant.userId,
                displayName: otherParticipant.fullName || null,
                photoURL: otherParticipant.profileImageUrls?.[0] || null,
            }
            : undefined,
        lastMessage: record.lastMessage,
        lastMessageAt: record.lastMessageAt ?? undefined,
        unreadCount: record.unreadCount || 0,
        updatedAt: record.updatedAt || record.lastMessageAt || 0,
        _id: record._id || conversationId,
        id: record.id || conversationId,
    };
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<ApiResponse<Conversation[]>> {
    const response = await api.get<ConversationListResponse>('/conversations');
    return {
        ...response,
        data: Array.isArray(response.data?.conversations)
            ? response.data.conversations.map(normalizeConversation)
            : [],
    };
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    const response = await api.get<ConversationDetailResponse>(`/conversations/${conversationId}`);
    return {
        ...response,
        data: response.data?.conversation ? normalizeConversation(response.data.conversation) : undefined,
    };
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<ApiResponse<{ success: boolean }>> {
    return api.delete<{ success: boolean }>(`/conversations/${conversationId}`);
}
