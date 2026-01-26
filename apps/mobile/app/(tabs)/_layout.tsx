/**
 * Tabs Layout - Native bottom tab navigation using NativeTabs
 */

import { Redirect, Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useAuthStore } from '@/store';
import { colors } from '@/theme';

export default function TabsLayout() {
    const { isAuthenticated, isLoading, needsOnboarding } = useAuthStore();

    if (isLoading) {
        return null;
    }

    if (!isAuthenticated) {
        return <Redirect href="/(auth)" />;
    }

    if (needsOnboarding) {
        return <Redirect href="/onboarding" />;
    }

    return (
        <NativeTabs
            tintColor={colors.primary.DEFAULT}
            iconColor={{ default: colors.neutral[400], selected: colors.primary.DEFAULT }}
            blurEffect="systemMaterial"
        >
            <NativeTabs.Trigger name="index">
                <NativeTabs.Trigger.Icon sf="house.fill" />
                <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="discover">
                <NativeTabs.Trigger.Icon sf="heart.fill" />
                <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="messages">
                <NativeTabs.Trigger.Icon sf="message.fill" />
                <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="profile">
                <NativeTabs.Trigger.Icon sf="person.fill" />
                <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
