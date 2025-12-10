/**
 * Interests API Service
 * Handles sending and receiving interests between users
 */

import { api } from './client';

export type InterestStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Interest {
    id: string;
    fromUserId: string;
    toUserId: string;
    status: InterestStatus;
    createdAt: string;
    respondedAt?: string;
    user?: {
        userId: string;
        fullName?: string | null;
        profileImageUrls?: string[] | null;
        city?: string | null;
        age?: number;
    };
}

/**
 * Send interest to a user
 */
export async function sendInterest(toUserId: string) {
    return api.post<{ success: boolean; interestId?: string }>('/interests', {
        toUserId,
    });
}

/**
 * Get interests sent by current user
 */
export async function getSentInterests() {
    return api.get<Interest[]>('/interests/sent');
}

/**
 * Get interests received by current user
 */
export async function getReceivedInterests() {
    return api.get<Interest[]>('/interests/received');
}

/**
 * Accept an interest
 */
export async function acceptInterest(interestId: string) {
    return api.post<{ success: boolean; matchId?: string }>(
        `/interests/${interestId}/accept`
    );
}

/**
 * Decline an interest
 */
export async function declineInterest(interestId: string) {
    return api.post<{ success: boolean }>(`/interests/${interestId}/decline`);
}

/**
 * Check if interest was sent to a user
 */
export async function checkInterestStatus(toUserId: string) {
    return api.get<{ sent: boolean; received: boolean; status?: InterestStatus }>(
        `/interests/check?userId=${encodeURIComponent(toUserId)}`
    );
}
