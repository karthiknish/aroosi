/**
 * Main Navigator - Bottom tabs with nested stacks
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import type {
    MainTabParamList,
    HomeStackParamList,
    DiscoverStackParamList,
    MessagesStackParamList,
    ProfileStackParamList,
} from './types';
import { colors, spacing, fontSize } from '../theme';

// Screen imports
import HomeScreen from '../screens/home/HomeScreen';
import DiscoverScreen from '../screens/home/DiscoverScreen';
import MessagesScreen from '../screens/home/MessagesScreen';
import ProfileDetailScreen from '../screens/home/ProfileDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import PreferencesScreen from '../screens/profile/PreferencesScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import SubscriptionScreen from '../screens/profile/SubscriptionScreen';
import ProfileViewersScreen from '../screens/profile/ProfileViewersScreen';
import BlockedUsersScreen from '../screens/profile/BlockedUsersScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import QuickPicksScreen from '../screens/engagement/QuickPicksScreen';
import ShortlistsScreen from '../screens/engagement/ShortlistsScreen';
import IcebreakersScreen from '../screens/engagement/IcebreakersScreen';
import InterestsScreen from '../screens/engagement/InterestsScreen';

// Create navigators
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Simple icon component (replace with proper icons later)
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
    const iconMap: Record<string, string> = {
        Home: '🏠',
        Discover: '💖',
        Messages: '💬',
        Profile: '👤',
    };

    return (
        <View style={styles.iconContainer}>
            <Text style={[styles.icon, focused && styles.iconFocused]}>
                {iconMap[name] || '•'}
            </Text>
        </View>
    );
}

// Home Stack Navigator
function HomeStackNavigator() {
    return (
        <HomeStack.Navigator screenOptions={{ headerShown: false }}>
            <HomeStack.Screen name="HomeMain" component={HomeScreen} />
            <HomeStack.Screen
                name="ProfileDetail"
                component={ProfileDetailWrapper}
                options={{ presentation: 'card' }}
            />
            <HomeStack.Screen
                name="Chat"
                component={ChatWrapper}
                options={{ presentation: 'card' }}
            />
        </HomeStack.Navigator>
    );
}

// Discover Stack Navigator
function DiscoverStackNavigator() {
    return (
        <DiscoverStack.Navigator screenOptions={{ headerShown: false }}>
            <DiscoverStack.Screen name="DiscoverMain" component={DiscoverScreen} />
            <DiscoverStack.Screen
                name="ProfileDetail"
                component={ProfileDetailWrapper}
                options={{ presentation: 'card' }}
            />
        </DiscoverStack.Navigator>
    );
}

// Messages Stack Navigator
function MessagesStackNavigator() {
    return (
        <MessagesStack.Navigator screenOptions={{ headerShown: false }}>
            <MessagesStack.Screen name="MessagesMain" component={MessagesScreen} />
            <MessagesStack.Screen
                name="Chat"
                component={ChatWrapper}
                options={{ presentation: 'card' }}
            />
        </MessagesStack.Navigator>
    );
}

// Profile Stack Navigator
function ProfileStackNavigator() {
    return (
        <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
            <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
            <ProfileStack.Screen
                name="EditProfile"
                component={EditProfileWrapper}
                options={{ presentation: 'card' }}
            />
            <ProfileStack.Screen
                name="Preferences"
                component={PreferencesWrapper}
                options={{ presentation: 'card' }}
            />
            <ProfileStack.Screen
                name="Settings"
                component={SettingsWrapper}
                options={{ presentation: 'card' }}
            />
            <ProfileStack.Screen
                name="Subscription"
                component={SubscriptionWrapper}
                options={{ presentation: 'card' }}
            />
            {/* New Engagement Screens */}
            <ProfileStack.Screen
                name="QuickPicks"
                component={QuickPicksScreen}
                options={{ presentation: 'card' }}
            />
            <ProfileStack.Screen
                name="Shortlists"
                component={ShortlistsScreen}
                options={{ presentation: 'card' }}
            />
            <ProfileStack.Screen
                name="Icebreakers"
                component={IcebreakersScreen}
                options={{ presentation: 'card' }}
            />
            <ProfileStack.Screen
                name="Interests"
                component={InterestsScreen}
                options={{ presentation: 'card' }}
            />
            <ProfileStack.Screen
                name="ProfileViewers"
                component={ProfileViewersScreen}
                options={{ presentation: 'card' }}
            />
            <ProfileStack.Screen
                name="BlockedUsers"
                component={BlockedUsersScreen}
                options={{ presentation: 'card' }}
            />
            <ProfileStack.Screen
                name="ProfileDetail"
                component={ProfileDetailWrapper}
                options={{ presentation: 'card' }}
            />
        </ProfileStack.Navigator>
    );
}

// Wrapper components to handle navigation props
function ProfileDetailWrapper({ route, navigation }: any) {
    return (
        <ProfileDetailScreen
            userId={route.params.userId}
            onBack={() => navigation.goBack()}
            onMatch={() => {
                // Navigate to chat after match
                navigation.goBack();
            }}
        />
    );
}

function ChatWrapper({ route, navigation }: any) {
    return (
        <ChatScreen
            matchId={route.params.matchId}
            recipientName={route.params.recipientName}
            recipientPhoto={route.params.recipientPhoto}
            onBack={() => navigation.goBack()}
        />
    );
}

function EditProfileWrapper({ navigation }: any) {
    return (
        <EditProfileScreen
            onBack={() => navigation.goBack()}
            onSave={() => navigation.goBack()}
        />
    );
}

function PreferencesWrapper({ navigation }: any) {
    return (
        <PreferencesScreen
            onBack={() => navigation.goBack()}
            onSave={() => navigation.goBack()}
        />
    );
}

function SettingsWrapper({ navigation }: any) {
    return (
        <SettingsScreen
            onBack={() => navigation.goBack()}
        />
    );
}

function SubscriptionWrapper({ navigation }: any) {
    return (
        <SubscriptionScreen
            onBack={() => navigation.goBack()}
        />
    );
}

// Main Tab Navigator
export function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: colors.primary.DEFAULT,
                tabBarInactiveTintColor: colors.neutral[400],
                tabBarLabelStyle: styles.tabLabel,
                tabBarIcon: ({ focused }) => (
                    <TabIcon name={route.name} focused={focused} />
                ),
            })}
        >
            <Tab.Screen name="Home" component={HomeStackNavigator} />
            <Tab.Screen name="Discover" component={DiscoverStackNavigator} />
            <Tab.Screen name="Messages" component={MessagesStackNavigator} />
            <Tab.Screen name="Profile" component={ProfileStackNavigator} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.background.light,
        borderTopWidth: 1,
        borderTopColor: colors.border.light,
        paddingTop: spacing[2],
        paddingBottom: spacing[6],
        height: 80,
    },
    tabLabel: {
        fontSize: fontSize.xs,
        marginTop: spacing[1],
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 24,
        opacity: 0.6,
    },
    iconFocused: {
        opacity: 1,
    },
});
