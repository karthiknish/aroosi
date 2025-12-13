/**
 * App Navigator - Root navigation container
 */

import React, { useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useAuthStore } from '../store/authStore';
import { linking } from './linking';
import { setNavigationRef } from '../services/notificationHandler';

// Navigators
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainNavigator';

// Screens
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
    const { isAuthenticated, isLoading, needsOnboarding, setOnboardingComplete } = useAuthStore();
    const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

    // Show nothing while checking auth state
    if (isLoading) {
        return null;
    }

    return (
        <NavigationContainer 
            ref={navigationRef}
            linking={linking}
            onReady={() => {
                // Set navigation ref for push notification navigation
                setNavigationRef(navigationRef.current);
            }}
        >
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isAuthenticated ? (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                ) : needsOnboarding ? (
                    <Stack.Screen name="Onboarding">
                        {() => <OnboardingScreen onComplete={setOnboardingComplete} />}
                    </Stack.Screen>
                ) : (
                    <Stack.Screen name="Main" component={MainTabNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
