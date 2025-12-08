/**
 * Aroosi Mobile App
 * Main application component
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './navigation';
import { useAuthStore } from './store';
import { onAuthStateChanged } from './services/firebase';
import { initCrashlytics, setUserId, logMessage } from './services/crashlytics';

// Suppress specific warnings (for development)
LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
]);

export default function App() {
    const { setUser, setLoading } = useAuthStore();

    useEffect(() => {
        // Initialize Crashlytics
        initCrashlytics().then(() => {
            logMessage('App started');
        });

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
                // Set user ID for crash reports
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

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar barStyle="dark-content" />
            <AppNavigator />
        </GestureHandlerRootView>
    );
}
