/**
 * Engagement API Service
 * Handles shortlists, notes, and other engagement features
 */

import { api, ApiResponse } from './client';
import type { QuickPickProfile, ShortlistEntry, NoteData } from '@aroosi/shared';
import { nowTimestamp } from '../../utils/timestamp';

// Re-export types for convenience
export type { QuickPickProfile, ShortlistEntry, NoteData } from '@aroosi/shared';

// Quick Picks

/**
 * Get current day key for quick picks
 */
function todayKey(): string {
    const d = new Date(nowTimestamp());
    return (
        d.getUTCFullYear().toString() +
        String(d.getUTCMonth() + 1).padStart(2, '0') +
        String(d.getUTCDate()).padStart(2, '0')
    );
}

/**
 * Get daily quick pick profiles
 */
export async function getDailyQuickPicks(dayKey?: string): Promise<ApiResponse<{ userIds: string[]; profiles: QuickPickProfile[] }>> {
    const key = dayKey || todayKey();
    return api.get<{ userIds: string[]; profiles: QuickPickProfile[] }>(
        `/engagement/quick-picks?day=${encodeURIComponent(key)}`
    );
}

/**
 * Act on a quick pick (like or skip)
 */
export async function actOnQuickPick(toUserId: string, action: 'like' | 'skip'): Promise<ApiResponse<{ success: boolean }>> {
    return api.post<{ success: boolean }>('/engagement/quick-picks', {
        toUserId,
        action,
    });
}

// Shortlists

/**
 * Fetch user's shortlisted profiles
 */
export async function fetchShortlists(): Promise<ApiResponse<ShortlistEntry[]>> {
    return api.get<ShortlistEntry[]>('/engagement/shortlist');
}

/**
 * Toggle shortlist - adds if not present, removes if present
 */
export async function toggleShortlist(toUserId: string): Promise<ApiResponse<{ success: boolean; added?: boolean; removed?: boolean }>> {
    return api.post<{ success: boolean; added?: boolean; removed?: boolean }>(
        '/engagement/shortlist',
        { toUserId }
    );
}

/**
 * Check if a user is shortlisted
 */
export async function isUserShortlisted(userId: string): Promise<boolean> {
    try {
        const response = await fetchShortlists();
        if (response.data) {
            return response.data.some((entry) => entry.userId === userId);
        }
        return false;
    } catch {
        return false;
    }
}

// Private Notes

/**
 * Fetch note for a user
 */
export async function fetchNote(toUserId: string): Promise<ApiResponse<NoteData>> {
    return api.get<NoteData>(
        `/engagement/notes?toUserId=${encodeURIComponent(toUserId)}`
    );
}

/**
 * Set/update note for a user
 */
export async function setNote(toUserId: string, note: string): Promise<ApiResponse<{ success: boolean }>> {
    return api.post<{ success: boolean }>('/engagement/notes', {
        toUserId,
        note,
    });
}

// Daily limits based on subscription plan
export function getQuickPicksLimit(plan: string): number {
    switch (plan?.toLowerCase()) {
        case 'premiumplus':
            return 40;
        case 'premium':
            return 20;
        default:
            return 5;
    }
}
