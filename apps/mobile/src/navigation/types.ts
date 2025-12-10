/**
 * Navigation Types
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
    Welcome: undefined;
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    VerifyOTP: { phone: string };
};

// Home Stack (nested in Tab)
export type HomeStackParamList = {
    HomeMain: undefined;
    ProfileDetail: { userId: string };
    Chat: {
        matchId: string;
        recipientName: string;
        recipientPhoto?: string;
    };
};

// Discover Stack (nested in Tab)
export type DiscoverStackParamList = {
    DiscoverMain: undefined;
    ProfileDetail: { userId: string };
};

// Messages Stack (nested in Tab)
export type MessagesStackParamList = {
    MessagesMain: undefined;
    Chat: {
        matchId: string;
        recipientName: string;
        recipientPhoto?: string;
    };
};

// Profile Stack (nested in Tab)
export type ProfileStackParamList = {
    ProfileMain: undefined;
    EditProfile: undefined;
    Settings: undefined;
    Preferences: undefined;
    Subscription: undefined;
    // New engagement screens
    QuickPicks: undefined;
    Shortlists: undefined;
    Icebreakers: undefined;
    Interests: undefined;
    ProfileViewers: undefined;
    BlockedUsers: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
    Home: NavigatorScreenParams<HomeStackParamList>;
    Discover: NavigatorScreenParams<DiscoverStackParamList>;
    Messages: NavigatorScreenParams<MessagesStackParamList>;
    Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// Root Navigator
export type RootStackParamList = {
    Auth: NavigatorScreenParams<AuthStackParamList>;
    Main: NavigatorScreenParams<MainTabParamList>;
    Onboarding: undefined;
};

// Screen Props Types
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
    AuthStackParamList,
    T
>;

export type HomeStackScreenProps<T extends keyof HomeStackParamList> = CompositeScreenProps<
    NativeStackScreenProps<HomeStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
>;

export type DiscoverStackScreenProps<T extends keyof DiscoverStackParamList> = CompositeScreenProps<
    NativeStackScreenProps<DiscoverStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
>;

export type MessagesStackScreenProps<T extends keyof MessagesStackParamList> = CompositeScreenProps<
    NativeStackScreenProps<MessagesStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = CompositeScreenProps<
    NativeStackScreenProps<ProfileStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
>;

// Declare global navigation types for useNavigation hook
declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}
