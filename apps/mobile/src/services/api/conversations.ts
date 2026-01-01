/**
 * Conversations API Service
 */

import { api, ApiResponse } from './client';
import type { Conversation } from '@aroosi/shared';

export type { Conversation } from '@aroosi/shared';

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<ApiResponse<Conversation[]>> {
    return api.get<Conversation[]>('/conversations');
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    return api.get<Conversation>(`/conversations/${conversationId}`);
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<ApiResponse<{ success: boolean }>> {
    return api.delete<{ success: boolean }>(`/conversations/${conversationId}`);
}
