/**
 * Profile Viewers API Service
 * Handles tracking and fetching profile views
 */

import { api } from './client';

export interface ProfileViewer {
    userId: string;
    fullName?: string | null;
    profileImageUrls?: string[] | null;
    city?: string | null;
    age?: number;
    viewedAt: string;
}

export interface ViewersResponse {
    viewers: ProfileViewer[];
    total: number;
    isPremiumRequired: boolean;
}

/**
 * Get list of users who viewed your profile
 */
export async function getProfileViewers(page = 0, limit = 20) {
    return api.get<ViewersResponse>(
        `/profile/viewers?page=${page}&limit=${limit}`
    );
}

/**
 * Track a profile view (call when viewing another user's profile)
 */
export async function trackProfileView(viewedUserId: string) {
    return api.post<{ success: boolean }>('/profile/view', {
        viewedUserId,
    });
}

/**
 * Get count of profile views
 */
export async function getProfileViewCount() {
    return api.get<{ count: number; newCount: number }>('/profile/viewers/count');
}

/**
 * Mark profile views as seen
 */
export async function markViewsAsSeen() {
    return api.post<{ success: boolean }>('/profile/viewers/seen');
}
