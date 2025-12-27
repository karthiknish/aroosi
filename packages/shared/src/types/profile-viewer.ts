/**
 * Profile Viewer Types - Shared between web and mobile
 */

export type ViewerFilter = 'all' | 'today' | 'week' | 'month';

export interface ProfileViewer {
    userId: string;
    fullName?: string | null;
    profileImageUrls?: string[] | null;
    city?: string | null;
    age?: number | null;
    viewedAt: Date | string | number;
    viewCount?: number;
    isNew?: boolean;
}

export interface ViewersResponse {
    viewers: ProfileViewer[];
    total: number;
    newCount?: number;
    hasMore?: boolean;
    isPremiumRequired?: boolean;
}
