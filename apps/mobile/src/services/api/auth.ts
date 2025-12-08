/**
 * Auth API Service
 */

import { api } from './client';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    phoneNumber: string | null;
    emailVerified: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    displayName: string;
}

/**
 * Sign in with email and password
 */
export async function loginWithEmail(credentials: LoginCredentials) {
    try {
        const result = await auth().signInWithEmailAndPassword(
            credentials.email,
            credentials.password
        );
        return { user: result.user, error: null };
    } catch (error: unknown) {
        const firebaseError = error as { code?: string; message?: string };
        return { user: null, error: firebaseError.message || 'Login failed' };
    }
}

/**
 * Register with email and password
 */
export async function registerWithEmail(data: RegisterData) {
    try {
        const result = await auth().createUserWithEmailAndPassword(
            data.email,
            data.password
        );

        // Update display name
        await result.user.updateProfile({
            displayName: data.displayName,
        });

        // Create profile on backend
        await api.post('/auth/register', {
            uid: result.user.uid,
            email: data.email,
            displayName: data.displayName,
        });

        return { user: result.user, error: null };
    } catch (error: unknown) {
        const firebaseError = error as { code?: string; message?: string };
        return { user: null, error: firebaseError.message || 'Registration failed' };
    }
}

/**
 * Sign in with Google
 */
export async function loginWithGoogle() {
    try {
        // Check if device supports Google Play Services
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

        // Get the user's ID token
        const signInResult = await GoogleSignin.signIn();
        const idToken = signInResult?.data?.idToken;

        if (!idToken) {
            throw new Error('No ID token returned from Google');
        }

        // Create a Google credential with the token
        const googleCredential = auth.GoogleAuthProvider.credential(idToken);

        // Sign-in the user with the credential
        const result = await auth().signInWithCredential(googleCredential);

        // Notify backend
        await api.post('/auth/google', {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
        });

        return { user: result.user, error: null };
    } catch (error: unknown) {
        const googleError = error as { code?: string; message?: string };
        return { user: null, error: googleError.message || 'Google sign-in failed' };
    }
}

/**
 * Sign out
 */
export async function logout() {
    try {
        // Sign out from Google if signed in
        try {
            await GoogleSignin.signOut();
        } catch {
            // Not signed in with Google, ignore
        }

        // Sign out from Firebase
        await auth().signOut();

        // Notify backend
        await api.post('/auth/logout');

        return { success: true, error: null };
    } catch (error: unknown) {
        const logoutError = error as { message?: string };
        return { success: false, error: logoutError.message || 'Logout failed' };
    }
}

/**
 * Send password reset email
 */
export async function forgotPassword(email: string) {
    try {
        await auth().sendPasswordResetEmail(email);
        return { success: true, error: null };
    } catch (error: unknown) {
        const resetError = error as { message?: string };
        return { success: false, error: resetError.message || 'Password reset failed' };
    }
}

/**
 * Delete account
 */
export async function deleteAccount() {
    try {
        // Notify backend first
        await api.delete('/auth/delete-account');

        // Delete Firebase user
        const user = auth().currentUser;
        if (user) {
            await user.delete();
        }

        return { success: true, error: null };
    } catch (error: unknown) {
        const deleteError = error as { message?: string };
        return { success: false, error: deleteError.message || 'Account deletion failed' };
    }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
    return api.get<AuthUser>('/auth/me');
}
