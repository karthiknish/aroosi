/**
 * Auth Layout - Authentication flow layout
 */

import { useAuthStore } from '@/store';
import { Redirect, Stack } from 'expo-router';

export default function AuthLayout() {
    const { isAuthenticated, isLoading, needsOnboarding } = useAuthStore();

    if (isLoading) {
        return null;
    }

    if (isAuthenticated) {
        if (needsOnboarding) {
            return <Redirect href="/onboarding" />;
        }
        return <Redirect href="/(tabs)" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="forgot-password" />
        </Stack>
    );
}
