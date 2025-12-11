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
    age?: number | null;
    viewedAt: string | number;
    viewCount?: number;
    isNew?: boolean;
}

export interface ViewersResponse {
    viewers: ProfileViewer[];
    total: number;
    newCount?: number;
    hasMore?: boolean;
    isPremiumRequired: boolean;
}

export type ViewerFilter = 'all' | 'today' | 'week' | 'month';

/**
 * Get list of users who viewed your profile
 */
export async function getProfileViewers(
    page = 0,
    limit = 20,
    filter: ViewerFilter = 'all'
) {
    const offset = page * limit;
    return api.get<ViewersResponse>(
        `/profile/viewers?page=${page}&limit=${limit}&offset=${offset}&filter=${filter}`
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
        const viewedAt = typeof viewer.viewedAt === 'string' 
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

