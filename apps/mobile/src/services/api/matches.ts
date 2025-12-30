/**
 * Matches API Service
 */

import { api } from './client';
import type { Match, MatchStatus, Like } from '@aroosi/shared';

// Re-export types for convenience
export type { Match, MatchStatus, Like } from '@aroosi/shared';

/**
 * Get all matches
 */
export async function getMatches() {
    return api.get<Match[]>('/matches');
}

/**
 * Get unread matches count
 */
export async function getUnreadMatchesCount() {
    return api.get<{ count: number }>('/matches/unread');
}

/**
 * Like a user
 */
export async function likeUser(userId: string, isSuperLike = false) {
    return api.post<{ matched: boolean; matchId?: string }>('/interests', {
        action: 'send',
        toUserId: userId,
        isSuperLike,
    });
}

/**
 * Pass on a user
 */
export async function passUser(userId: string) {
    return api.post<{ success: boolean }>('/engagement/quick-picks', {
        action: 'skip',
        toUserId: userId,
    });
}

/**
 * Unmatch a user
 */
export async function unmatch(matchId: string) {
    return api.delete(`/matches/${matchId}`);
}

/**
 * Report a user
 */
export async function reportUser(
    userId: string,
    reason: string,
    description?: string
) {
    return api.post('/safety/report', {
        reportedUserId: userId,
        reason,
        description,
    });
}

/**
 * Block a user
 */
export async function blockUser(userId: string) {
    return api.post('/safety/block', { blockedUserId: userId });
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string) {
    return api.post('/safety/unblock', { blockedUserId: userId });
}

/**
 * Get blocked users
 */
export async function getBlockedUsers() {
    return api.get<{
        blockedUsers: Array<{
            id: string;
            blockedUserId: string;
            createdAt: number;
            blockedProfile?: {
                fullName: string;
                profileImageUrl?: string;
            };
        }>;
        nextCursor: string | null;
    }>('/safety/blocked');
}
