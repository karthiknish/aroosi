/**
 * Recommendations API Service
 */

import { api } from './client';

export interface RecommendedProfile {
    id: string;
    displayName: string | null;
    photoURL: string | null;
    photos: string[];
    age?: number;
    bio?: string;
    location?: {
        city?: string;
        distance?: number; // in km
    };
    interests?: string[];
    compatibility?: number; // 0-100
    isVerified?: boolean;
    isPremium?: boolean;
}

export interface QuickPick {
    id: string;
    user: RecommendedProfile;
    reason: string;
    expiresAt: string;
}

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

export interface SearchFilters {
    ageRange?: { min: number; max: number };
    gender?: 'male' | 'female' | 'other';
    distance?: number;
    verified?: boolean;
    interests?: string[];
}
