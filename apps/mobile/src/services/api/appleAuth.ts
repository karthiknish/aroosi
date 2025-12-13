/**
 * Apple Auth Service
 * Handle Apple Sign-In for iOS
 */

import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import auth from '@react-native-firebase/auth';
import { api } from './client';

/**
 * Check if Apple Sign-In is available
 * Only available on iOS 13+
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
        return false;
    }
    return await AppleAuthentication.isAvailableAsync();
}

/**
 * Sign in with Apple
 */
export async function loginWithApple() {
    try {
        // Check availability
        const isAvailable = await isAppleSignInAvailable();
        if (!isAvailable) {
            return { user: null, error: 'Apple Sign-In is not available on this device' };
        }

        // Request Apple credentials
        const appleCredential = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
        });

        // Get the identity token
        const { identityToken, fullName, email } = appleCredential;

        if (!identityToken) {
            throw new Error('No identity token returned from Apple');
        }

        // Create a Firebase credential from the Apple ID token
        const credential = auth.AppleAuthProvider.credential(identityToken);

        // Sign in to Firebase with the Apple credential
        const result = await auth().signInWithCredential(credential);

        // Build display name from Apple's full name (only provided on first sign-in)
        let displayName = result.user.displayName;
        if (!displayName && fullName) {
            const parts = [fullName.givenName, fullName.familyName].filter(Boolean);
            displayName = parts.join(' ') || null;

            // Update Firebase profile with the name
            if (displayName) {
                await result.user.updateProfile({ displayName });
            }
        }

        // Notify backend
        await api.post('/auth/apple', {
            uid: result.user.uid,
            email: email || result.user.email,
            displayName: displayName || result.user.displayName,
            photoURL: result.user.photoURL,
        });

        return { user: result.user, error: null };
    } catch (error: unknown) {
        const appleError = error as { code?: string; message?: string };
        
        // Handle user cancellation
        if (appleError.code === 'ERR_REQUEST_CANCELED') {
            return { user: null, error: null }; // User cancelled, not an error
        }

        return { 
            user: null, 
            error: appleError.message || 'Apple Sign-In failed' 
        };
    }
}
