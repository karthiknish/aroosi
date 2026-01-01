/**
 * Auth API Service
 */

import { api, ApiResponse } from './client';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { AuthUser, LoginCredentials, RegisterData } from '@aroosi/shared';

// Re-export types for convenience
export type { AuthUser, LoginCredentials, RegisterData } from '@aroosi/shared';

/**
 * Sign in with email and password
 */
export async function loginWithEmail(credentials: LoginCredentials): Promise<ApiResponse<FirebaseAuthTypes.UserCredential>> {
    try {
        // 1. Call backend /auth/login for centralization of auth logic
        const backendResult = await api.post<{
            uid: string;
            email: string;
            customToken: string;
            idToken?: string;
            refreshToken?: string;
        }>('/auth/login', {
            email: credentials.email,
            password: credentials.password,
        }, { authenticated: false });

        if (backendResult.error || !backendResult.data?.customToken) {
            return { 
                error: backendResult.error || 'Login failed', 
                status: backendResult.status,
                code: backendResult.code
            };
        }

        // 2. Sign in to Firebase with the custom token
        const result = await auth().signInWithCustomToken(backendResult.data.customToken);
        
        return { data: result, status: 200 };
    } catch (error: unknown) {
        const firebaseError = error as { code?: string; message?: string };
        console.error('[Auth] loginWithEmail error:', firebaseError);
        return { 
            error: firebaseError.message || 'Login failed', 
            status: 401,
            code: firebaseError.code
        };
    }
}

/**
 * Register with email and password
 */
export async function registerWithEmail(data: RegisterData): Promise<ApiResponse<FirebaseAuthTypes.User>> {
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

        return { data: result.user, status: 201 };
    } catch (error: unknown) {
        const firebaseError = error as { code?: string; message?: string };
        return { error: firebaseError.message || 'Registration failed', status: 400 };
    }
}

/**
 * Sign in with Google
 */
export async function loginWithGoogle(): Promise<ApiResponse<FirebaseAuthTypes.User>> {
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

        return { data: result.user, status: 200 };
    } catch (error: unknown) {
        const googleError = error as { code?: string; message?: string };
        return { error: googleError.message || 'Google sign-in failed', status: 401 };
    }
}

/**
 * Sign out
 */
export async function logout(): Promise<ApiResponse<{ success: boolean }>> {
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

        return { data: { success: true }, status: 200 };
    } catch (error: unknown) {
        const logoutError = error as { message?: string };
        return { error: logoutError.message || 'Logout failed', status: 500 };
    }
}

/**
 * Send password reset email
 */
export async function forgotPassword(email: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
        await auth().sendPasswordResetEmail(email);
        return { data: { success: true }, status: 200 };
    } catch (error: unknown) {
        const resetError = error as { message?: string };
        return { error: resetError.message || 'Password reset failed', status: 400 };
    }
}

/**
 * Delete account
 */
export async function deleteAccount(): Promise<ApiResponse<{ success: boolean }>> {
    try {
        // Notify backend first
        await api.delete('/auth/delete-account');

        // Delete Firebase user
        const user = auth().currentUser;
        if (user) {
            await user.delete();
        }

        return { data: { success: true }, status: 200 };
    } catch (error: unknown) {
        const deleteError = error as { message?: string };
        return { error: deleteError.message || 'Account deletion failed', status: 500 };
    }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    return api.get<AuthUser>('/auth/me');
}
