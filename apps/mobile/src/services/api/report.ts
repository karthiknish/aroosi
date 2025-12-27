/**
 * Report API Service
 * Handles user reporting and blocking
 */

import { api } from './client';
import type { ReportReason, ReportData, Report } from '@aroosi/shared';

// Re-export types for convenience
export type { ReportReason, ReportData, Report } from '@aroosi/shared';

/**
 * Human-readable labels for report reasons
 */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
    harassment: 'Harassment or Bullying',
    inappropriate_content: 'Inappropriate Photos/Content',
    fake_profile: 'Fake Profile',
    scam: 'Scam or Fraud',
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
