/**
 * Deep Linking Configuration
 * Maps URLs to screens in the app
 */

import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from './types';

/**
 * URL Scheme: aroosi://
 * Universal Links: https://aroosi.app/
 * 
 * Supported deep links:
 * - aroosi://profile/:userId
 * - aroosi://chat/:matchId
 * - aroosi://match/:matchId
 * - aroosi://messages
 * - aroosi://settings
 * - https://aroosi.app/profile/:userId
 * - https://aroosi.app/chat/:matchId
 * - https://aroosi.app/match/:matchId
 */

export const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [
        Linking.createURL('/'),
        'aroosi://',
        'https://aroosi.app',
        'https://www.aroosi.app',
    ],
    config: {
        screens: {
            Auth: {
                screens: {
                    Welcome: 'welcome',
                    Login: 'login',
                    Register: 'register',
                    ForgotPassword: 'forgot-password',
                },
            },
            Onboarding: 'onboarding',
            Main: {
                screens: {
                    Home: {
                        screens: {
                            HomeMain: 'home',
                            ProfileDetail: 'profile/:userId',
                            Chat: 'chat/:matchId',
                        },
                    },
                    Discover: {
                        screens: {
                            DiscoverMain: 'discover',
                            ProfileDetail: 'discover/profile/:userId',
                        },
                    },
                    Messages: {
                        screens: {
                            MessagesMain: 'messages',
                            Chat: 'messages/chat/:matchId',
                        },
                    },
                    Profile: {
                        screens: {
                            ProfileMain: 'profile',
                            EditProfile: 'edit-profile',
                            Settings: 'settings',
                            Preferences: 'preferences',
                            Subscription: 'subscription',
                            QuickPicks: 'quick-picks',
                            Shortlists: 'shortlists',
                            Icebreakers: 'icebreakers',
                            Interests: 'interests',
                            ProfileViewers: 'profile-viewers',
                            BlockedUsers: 'blocked-users',
                            ProfileDetail: 'user/:userId',
                        },
                    },
                },
            },
        },
    },
    async getInitialURL() {
        // Check if app was opened from a deep link
        const url = await Linking.getInitialURL();
        
        if (url != null) {
            return url;
        }

        return null;
    },
    subscribe(listener) {
        // Listen for incoming links
        const subscription = Linking.addEventListener('url', (event: { url: string }) => {
            listener(event.url);
        });

        return () => {
            subscription.remove();
        };
    },
};

/**
 * Generate deep link URLs for sharing
 */
export function generateProfileLink(userId: string): string {
    return `https://aroosi.app/profile/${userId}`;
}

export function generateChatLink(matchId: string): string {
    return `https://aroosi.app/chat/${matchId}`;
}

export function generateMatchLink(matchId: string): string {
    return `https://aroosi.app/match/${matchId}`;
}

/**
 * Parse deep link to extract route parameters
 */
export function parseDeepLink(url: string): {
    type: 'profile' | 'chat' | 'match' | 'unknown';
    id?: string;
} {
    try {
        const parsed = Linking.parse(url);
        const path = parsed.path || '';

        if (path.startsWith('profile/')) {
            return { type: 'profile', id: path.replace('profile/', '') };
        }
        if (path.startsWith('chat/')) {
            return { type: 'chat', id: path.replace('chat/', '') };
        }
        if (path.startsWith('match/')) {
            return { type: 'match', id: path.replace('match/', '') };
        }

        return { type: 'unknown' };
    } catch {
        return { type: 'unknown' };
    }
}
