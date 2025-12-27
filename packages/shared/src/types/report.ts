/**
 * Report Types - Shared between web and mobile
 */

export type ReportReason = 
    | 'inappropriate_content'
    | 'spam'
    | 'harassment'
    | 'fake_profile'
    | 'underage'
    | 'scam'
    | 'threatening_behavior'
    | 'other';

export interface ReportData {
    reportedUserId: string;
    reason: ReportReason;
    description?: string;
    screenshots?: string[];
}

export interface Report extends ReportData {
    id: string;
    reporterId: string;
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    createdAt: Date | string;
    reviewedAt?: Date | string;
}
