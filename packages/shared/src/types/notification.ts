/**
 * Notification Types - Shared between web and mobile
 */

export interface NotificationSettings {
    matches: boolean;
    messages: boolean;
    likes: boolean;
    superLikes: boolean;
    dailyPicks: boolean;
    promotions: boolean;
}

export interface PushToken {
    token: string;
    deviceId?: string;
    platform: 'ios' | 'android' | 'web';
    createdAt?: Date | string;
}

export type NotificationType = 
    | 'match'
    | 'message'
    | 'interest_received'
    | 'interest_accepted'
    | 'profile_view'
    | 'super_like'
    | 'daily_pick'
    | 'shortlist'
    | 'promotion';

export interface InAppNotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    read: boolean;
    createdAt: Date | string;
}
