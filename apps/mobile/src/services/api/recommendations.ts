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
 * Get compatibility score between two users
 */
export async function getCompatibility(userId: string) {
    return api.get<{ score: number; reasons: string[] }>(`/compatibility/${userId}`);
}

/**
 * Search profiles
 */
export async function searchProfiles(filters: SearchFilters & { page?: number; pageSize?: number }) {
    const params = new URLSearchParams();
    
    if (filters.page !== undefined) params.set('page', String(filters.page));
    if (filters.pageSize !== undefined) params.set('pageSize', String(filters.pageSize));
    if (filters.city && filters.city !== 'any') params.set('city', filters.city.trim());
    if (filters.country && filters.country !== 'any') params.set('country', filters.country.trim());
    if (filters.ageMin !== undefined) params.set('ageMin', String(filters.ageMin));
    if (filters.ageMax !== undefined) params.set('ageMax', String(filters.ageMax));
    if (filters.gender && filters.gender !== 'any') params.set('preferredGender', filters.gender);
    if (filters.ethnicity && filters.ethnicity !== 'any') params.set('ethnicity', filters.ethnicity);
    if (filters.motherTongue && filters.motherTongue !== 'any') params.set('motherTongue', filters.motherTongue);

    return api.get<{ profiles: RecommendedProfile[]; total: number }>(`/search?${params.toString()}`);
}
