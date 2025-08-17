"use client";

import { useCallback } from "react";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";

/**
 * Custom hook for accessing Firebase authentication state and methods
 * Provides a simplified interface for common authentication operations
 */
export function useFirebaseAuthApi() {
  const {
    user,
    isLoading: isUserLoaded,
    isAuthenticated,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  } = useFirebaseAuth();

  /**
   * Get user's email address
   */
  const getUserEmail = useCallback(() => {
    if (!user) return null;
    
    return user.email || null;
  }, [user]);

  /**
   * Get user's full name
   */
  const getUserFullName = useCallback(() => {
    if (!user) return null;

    return user.displayName || null;
  }, [user]);

  /**
   * Get user's profile image URL
   */
  const getUserProfileImageUrl = useCallback(() => {
    if (!user) return null;

    return user.photoURL || null;
  }, [user]);

  /**
   * Sign in with email and password
   */
  const signInWithEmail = useCallback(
  async (email: string, password: string) => {
      try {
    const result = await signIn({ email, password });
        
        return {
          success: result.success,
          status: result.success ? "complete" : "failed",
          error: result.error || null,
        };
      } catch (error: any) {
        return {
          success: false,
          status: null,
          error: error?.message || "Sign in failed",
        };
      }
    },
    [signIn]
  );

  /**
   * Sign up with email and password
   */
  const signUpWithEmail = useCallback(
  async (email: string, password: string, fullName: string) => {
      try {
    const result = await signUp({ email, password, fullName });
        
        return {
          success: result.success,
          status: result.success ? "complete" : "failed",
          error: result.error || null,
        };
      } catch (error: any) {
        return {
          success: false,
          status: null,
          error: error?.message || "Sign up failed",
        };
      }
    },
    [signUp]
  );

  /**
   * Sign in with OAuth provider (Google)
   */
  const signInWithOAuth = useCallback(async (provider: "google", redirectUrlComplete?: string) => {
    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        // Redirect to the specified URL or default to search
        if (redirectUrlComplete && typeof window !== "undefined") {
          window.location.href = redirectUrlComplete;
        }
      }
      
      return {
        success: result.success,
        error: result.error || null,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "OAuth sign in failed",
      };
    }
  }, [signInWithGoogle]);

  /**
   * Sign out
   */
  const signOutUser = useCallback(async () => {
    try {
      await signOut();
      return {
        success: true,
        error: null,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Sign out failed",
      };
    }
  }, [signOut]);

  return {
    // User data
    user,
    isAuthenticated,
    isUserLoaded: !isUserLoaded,
  sessionId: (user as any)?.uid || null,
    orgId: null,
    session: null,
    organization: null,

    // User info getters
    getUserEmail,
    getUserFullName,
    getUserProfileImageUrl,
    getUserPhoneNumber: () => null, // Firebase doesn't have phone numbers in the same way

    // Auth methods
    signIn: signInWithEmail,
    signUp: signUpWithEmail,
    signInWithOAuth,
    signOut: signOutUser,
  };
}