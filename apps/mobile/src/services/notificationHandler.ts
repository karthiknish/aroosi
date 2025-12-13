/**
 * Push Notification Handler Service
 * Handles notification events and navigation
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { NavigationContainerRef } from '@react-navigation/native';
import { registerPushToken } from './api/notifications';

// Navigation reference for deep navigation from notifications
let navigationRef: NavigationContainerRef<ReactNavigation.RootParamList> | null = null;

export function setNavigationRef(ref: NavigationContainerRef<ReactNavigation.RootParamList> | null) {
    navigationRef = ref;
}

// Notification data types
interface NotificationData {
    type?: 'match' | 'message' | 'like' | 'profile_view' | 'interest';
    matchId?: string;
    userId?: string;
    chatId?: string;
    recipientName?: string;
    recipientPhoto?: string;
}

/**
 * Handle notification navigation based on data
 */
function handleNotificationNavigation(data: NotificationData) {
    if (!navigationRef?.isReady()) {
        console.log('Navigation not ready');
        return;
    }

    switch (data.type) {
        case 'message':
            if (data.matchId && data.recipientName) {
                // Navigate to chat screen
                navigationRef.navigate('Main', {
                    screen: 'Messages',
                    params: {
                        screen: 'Chat',
                        params: {
                            matchId: data.matchId,
                            recipientName: data.recipientName,
                            recipientPhoto: data.recipientPhoto,
                        },
                    },
                });
            }
            break;

        case 'match':
            // Navigate to messages/matches tab
            navigationRef.navigate('Main', {
                screen: 'Messages',
                params: { screen: 'MessagesMain' },
            });
            break;

        case 'like':
        case 'interest':
            // Navigate to interests screen
            navigationRef.navigate('Main', {
                screen: 'Profile',
                params: { screen: 'Interests' },
            });
            break;

        case 'profile_view':
            // Navigate to profile viewers
            navigationRef.navigate('Main', {
                screen: 'Profile',
                params: { screen: 'ProfileViewers' },
            });
            break;

        default:
            // Default: go to home
            navigationRef.navigate('Main', {
                screen: 'Home',
                params: { screen: 'HomeMain' },
            });
    }
}

/**
 * Handle foreground notification (app is open)
 */
function handleForegroundNotification(
    message: FirebaseMessagingTypes.RemoteMessage,
    onNotification?: (message: FirebaseMessagingTypes.RemoteMessage) => void
) {
    console.log('Foreground notification:', message);
    
    // Call custom handler if provided
    onNotification?.(message);
    
    // You could show an in-app notification banner here
}

/**
 * Handle notification opened (user tapped notification)
 */
function handleNotificationOpened(message: FirebaseMessagingTypes.RemoteMessage) {
    console.log('Notification opened:', message);
    
    const data = message.data as NotificationData | undefined;
    if (data) {
        handleNotificationNavigation(data);
    }
}

/**
 * Setup notification handlers
 * Call this from your root component
 */
export async function setupNotifications() {
    // Request permission (iOS)
    if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
            console.log('Notification permission denied');
            return;
        }
    }

    // Register push token with backend
    try {
        await registerPushToken();
    } catch (error) {
        console.error('Failed to register push token:', error);
    }
}

/**
 * Hook to use notification handlers in a component
 */
export function useNotificationHandlers(
    onNotification?: (message: FirebaseMessagingTypes.RemoteMessage) => void
) {
    useEffect(() => {
        // Handle foreground messages
        const unsubscribeForeground = messaging().onMessage(async (message) => {
            handleForegroundNotification(message, onNotification);
        });

        // Handle notification opened from background state
        const unsubscribeOpened = messaging().onNotificationOpenedApp((message) => {
            handleNotificationOpened(message);
        });

        // Check if app was opened from a quit state notification
        messaging()
            .getInitialNotification()
            .then((message) => {
                if (message) {
                    handleNotificationOpened(message);
                }
            });

        return () => {
            unsubscribeForeground();
            unsubscribeOpened();
        };
    }, [onNotification]);
}

/**
 * Subscribe to a topic (e.g., for broadcast notifications)
 */
export async function subscribeToTopic(topic: string) {
    try {
        await messaging().subscribeToTopic(topic);
        console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
        console.error(`Failed to subscribe to topic ${topic}:`, error);
    }
}

/**
 * Unsubscribe from a topic
 */
export async function unsubscribeFromTopic(topic: string) {
    try {
        await messaging().unsubscribeFromTopic(topic);
        console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
        console.error(`Failed to unsubscribe from topic ${topic}:`, error);
    }
}
