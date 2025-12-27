/**
 * Profile Viewers API Service
 * Handles tracking and fetching profile views
 */

import { api } from './client';
import type { ProfileViewer, ViewersResponse, ViewerFilter } from '@aroosi/shared';

// Re-export types for convenience
export type { ProfileViewer, ViewersResponse, ViewerFilter } from '@aroosi/shared';

/**
 * Get list of users who viewed your profile
 * @param profileId - The user's own profile ID (required by backend)
 */
export async function getProfileViewers(
    profileId: string,
    page = 0,
    limit = 20,
    filter: ViewerFilter = 'all'
) {
    const offset = page * limit;
    return api.get<ViewersResponse>(
        `/profile/view?profileId=${encodeURIComponent(profileId)}&limit=${limit}&offset=${offset}&filter=${filter}`
    );
}

/**
 * Track a profile view (call when viewing another user's profile)
 */
export async function trackProfileView(profileId: string) {
    return api.post<{ success: boolean }>('/profile/view', {
        profileId,
    });
}

/**
 * Get count of profile views
 * @param profileId - The user's own profile ID
 */
export async function getProfileViewCount(profileId: string) {
    return api.get<{ count: number; newCount: number }>(
        `/profile/view?profileId=${encodeURIComponent(profileId)}&mode=count`
    );
}

/**
 * Mark profile views as seen
 */
export async function markViewsAsSeen() {
    return api.post<{ success: boolean }>('/profile/view/seen');
}

/**
 * Get viewers grouped by time period
 */
export function groupViewersByDate(viewers: ProfileViewer[]): {
    today: ProfileViewer[];
    thisWeek: ProfileViewer[];
    earlier: ProfileViewer[];
} {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;

    const today: ProfileViewer[] = [];
    const thisWeek: ProfileViewer[] = [];
    const earlier: ProfileViewer[] = [];

    for (const viewer of viewers) {
        const viewedAt = viewer.viewedAt instanceof Date
            ? viewer.viewedAt.getTime()
            : typeof viewer.viewedAt === 'string' 
                ? new Date(viewer.viewedAt).getTime() 
                : viewer.viewedAt;

        if (viewedAt >= todayStart.getTime()) {
            today.push(viewer);
        } else if (viewedAt >= weekStart) {
            thisWeek.push(viewer);
        } else {
            earlier.push(viewer);
        }
    }

    return { today, thisWeek, earlier };
}

