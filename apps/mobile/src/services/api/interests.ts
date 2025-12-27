/**
 * Interests API Service
 * Handles sending and receiving interests between users
 */

import { api, ApiResponse } from './client';
import type { Interest, InterestStatus } from '@aroosi/shared';

// Re-export types for convenience
export type { Interest, InterestStatus } from '@aroosi/shared';

/**
 * Send interest to a user
 */
export async function sendInterest(toUserId: string): Promise<ApiResponse<{ success: boolean; interestId?: string }>> {
    return api.post<{ success: boolean; interestId?: string }>('/interests', {
        action: 'send',
        toUserId,
    });
}

/**
 * Get interests sent by current user
 */
export async function getSentInterests(): Promise<ApiResponse<Interest[]>> {
    return api.get<Interest[]>('/interests?mode=sent');
}

/**
 * Get interests received by current user
 */
export async function getReceivedInterests(): Promise<ApiResponse<Interest[]>> {
    return api.get<Interest[]>('/interests?mode=received');
}

/**
 * Accept an interest
 */
export async function acceptInterest(interestId: string): Promise<ApiResponse<{ success: boolean; status: string; matchId?: string }>> {
    return api.post<{ success: boolean; status: string; matchId?: string }>('/interests', {
        action: 'respond',
        interestId,
        status: 'accepted',
    });
}

/**
 * Decline an interest
 */
export async function declineInterest(interestId: string): Promise<ApiResponse<{ success: boolean; status: string }>> {
    return api.post<{ success: boolean; status: string }>('/interests', {
        action: 'respond',
        interestId,
        status: 'rejected',
    });
}

/**
 * Check if interest was sent to a user
 */
export async function checkInterestStatus(toUserId: string): Promise<ApiResponse<{ status: InterestStatus | null }>> {
    return api.get<{ status: InterestStatus | null }>(
        `/interests?mode=status&userId=${encodeURIComponent(toUserId)}`
    );
}
