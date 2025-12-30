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
    return api.post<{ message: string; reportId: string }>('/safety/report', {
        reportedUserId: data.reportedUserId,
        reason: data.reason,
        description: data.description,
    });
}

/**
 * Block a user (prevents matching and messaging)
 */
export async function blockUser(userId: string) {
    return api.post<{ message: string }>('/safety/block', { blockedUserId: userId });
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string) {
    return api.post<{ message: string }>('/safety/unblock', { blockedUserId: userId });
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers() {
    return api.get<{
        blockedUsers: Array<{
            id: string;
            blockedUserId: string;
            createdAt: number;
            blockedProfile?: {
                fullName: string;
                profileImageUrl?: string;
            };
        }>;
        nextCursor: string | null;
    }>('/safety/blocked');
}
