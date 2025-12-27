/**
 * Notifications API Service
 */

import { Platform } from 'react-native';
import { api } from './client';
import messaging from '@react-native-firebase/messaging';
import type { NotificationSettings, PushToken } from '@aroosi/shared';

// Re-export types for convenience
export type { NotificationSettings, PushToken } from '@aroosi/shared';

/** Legacy alias for backwards compatibility */
export type PushNotificationToken = PushToken;

/**
 * Register push notification token
 */
export async function registerPushToken() {
    try {
        // Request permission
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
            return { success: false, error: 'Permission denied' };
        }

        // Get token
        const token = await messaging().getToken();

        // Register with backend
        const response = await api.post('/push/register', {
            token,
            platform: Platform.OS,
        });

        return { success: true, token, ...response };
    } catch (error) {
        const pushError = error as { message?: string };
        return { success: false, error: pushError.message };
    }
}

/**
 * Get notification settings
 */
export async function getNotificationSettings() {
    return api.get<NotificationSettings>('/notifications/settings');
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(settings: Partial<NotificationSettings>) {
    return api.patch<NotificationSettings>('/notifications/settings', settings);
}

/**
 * Unregister push token (on logout)
 */
export async function unregisterPushToken() {
    try {
        const token = await messaging().getToken();
        await api.post('/push/unregister', { token });
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}
