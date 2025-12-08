/**
 * App Navigator - Root navigation container
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useAuthStore } from '../store/authStore';

// Navigators
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
    const { isAuthenticated, isLoading } = useAuthStore();

    // Show nothing while checking auth state
    if (isLoading) {
        return null;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <Stack.Screen name="Main" component={MainTabNavigator} />
                ) : (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
