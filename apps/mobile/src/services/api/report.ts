/**
 * Report API Service
 * Handle user reports for safety and moderation
 */

import { api } from './client';

export type ReportReason = 
    | 'harassment'
    | 'inappropriate_content'
    | 'fake_profile'
    | 'spam'
    | 'underage'
    | 'threatening_behavior'
    | 'other';

export interface ReportData {
    reportedUserId: string;
    reason: ReportReason;
    description?: string;
    screenshots?: string[];
}

export interface Report {
    id: string;
    reportedUserId: string;
    reporterId: string;
    reason: ReportReason;
    description?: string;
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    createdAt: string;
}

/**
 * Human-readable labels for report reasons
 */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
    harassment: 'Harassment or Bullying',
    inappropriate_content: 'Inappropriate Photos/Content',
    fake_profile: 'Fake Profile or Scam',
    spam: 'Spam or Advertising',
    underage: 'Appears Underage',
    threatening_behavior: 'Threatening Behavior',
    other: 'Other',
};

/**
 * Submit a report against a user
 */
export async function reportUser(data: ReportData) {
    return api.post<{ success: boolean; reportId: string }>('/reports', data as unknown as Record<string, unknown>);
}

/**
 * Get reports submitted by current user
 */
export async function getMyReports() {
    return api.get<Report[]>('/reports/mine');
}

/**
 * Block a user (prevents matching and messaging)
 */
export async function blockUser(userId: string) {
    return api.post<{ success: boolean }>('/users/block', { userId });
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string) {
    return api.post<{ success: boolean }>('/users/unblock', { userId });
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers() {
    return api.get<{ id: string; displayName: string; photoURL?: string }[]>('/users/blocked');
}
