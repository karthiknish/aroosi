/**
 * Recommendations API Service
 */

import { api } from './client';
import type { RecommendedProfile, QuickPick, SearchFilters } from '@aroosi/shared';

// Re-export types for convenience
export type { RecommendedProfile, QuickPick, SearchFilters } from '@aroosi/shared';

/**
 * Get recommended profiles (for swiping)
 */
export async function getRecommendations(limit = 10) {
    return api.get<RecommendedProfile[]>(`/recommendations?limit=${limit}`);
}

/**
 * Get quick picks (daily curated matches)
 */
export async function getQuickPicks() {
    return api.get<QuickPick[]>('/quickpicks');
}

/**
 * Get compatibility score between two users
 */
export async function getCompatibility(userId: string) {
    return api.get<{ score: number; reasons: string[] }>(`/compatibility/${userId}`);
}

/**
 * Search profiles
 */
export async function searchProfiles(query: string, filters?: SearchFilters) {
    return api.post<RecommendedProfile[]>('/search', { query, filters });
}
