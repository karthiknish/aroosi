/**
 * Root Layout - Expo Router root layout with auth state
 */

import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/store';
import { onAuthStateChanged } from '../src/services/firebase';
import { initCrashlytics, setUserId, logMessage } from '../src/services/crashlytics';
import { setupNotifications, useNotificationHandlers } from '../src/services/notificationHandler';
import { Alert } from 'react-native';

export default function RootLayout() {
    const { setUser, setLoading, isAuthenticated } = useAuthStore();

    // Setup notification handlers
    useNotificationHandlers((message) => {
        if (message.notification?.title) {
            Alert.alert(
                message.notification.title,
                message.notification.body || '',
                [{ text: 'OK' }]
            );
        }
    });

    useEffect(() => {
        // Initialize Crashlytics
        initCrashlytics().then(() => {
            logMessage('App started');
        });

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
                setUserId(firebaseUser.uid);
                setUser({
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    phoneNumber: firebaseUser.phoneNumber,
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, [setUser, setLoading]);

    // Setup push notifications when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            setupNotifications();
        }
    }, [isAuthenticated]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar barStyle="dark-content" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />

                {/* Form Sheets */}
                <Stack.Screen
                    name="quick-picks"
                    options={{
                        presentation: 'formSheet',
                        headerShown: false,
                        contentStyle: { backgroundColor: 'transparent' } as any,
                        sheetGrabberVisible: true as any,
                        sheetAllowedDetents: [0.5, 0.75] as any,
                    } as any}
                />
                <Stack.Screen
                    name="report"
                    options={{
                        presentation: 'formSheet',
                        headerShown: false,
                        contentStyle: { backgroundColor: 'transparent' } as any,
                        sheetGrabberVisible: true as any,
                        sheetAllowedDetents: [0.35] as any,
                    } as any}
                />
            </Stack>
        </GestureHandlerRootView>
    );
}
