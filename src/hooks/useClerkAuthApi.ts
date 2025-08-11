"use client";

import { useUser, useAuth, useSignIn, useSignUp, useSession, useOrganization } from "@clerk/nextjs";
import { useCallback } from "react";

/**
 * Custom hook for accessing Clerk authentication state and methods
 * Provides a simplified interface for common authentication operations
 */
export function useClerkAuthApi() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { sessionId, orgId, has, signOut } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { session } = useSession();
  const { organization } = useOrganization();

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user && !!sessionId;

  /**
   * Get user's email address
   */
  const getUserEmail = useCallback(() => {
    if (!user) return null;
    
    // Get primary email address
    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    );
    
    return primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress || null;
  }, [user]);

  /**
   * Get user's full name
   */
  const getUserFullName = useCallback(() => {
    if (!user) return null;
    
    return user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || null;
  }, [user]);

  /**
   * Get user's first name
   */
  const getUserFirstName = useCallback(() => {
    if (!user) return null;
    
    return user.firstName || null;
  }, [user]);

  /**
   * Get user's profile image URL
   */
  const getUserProfileImageUrl = useCallback(() => {
    if (!user) return null;
    
    return user.imageUrl || null;
  }, [user]);

  /**
   * Get user's phone number
   */
  const getUserPhoneNumber = useCallback(() => {
    if (!user) return null;
    
    // Get primary phone number
    const primaryPhone = user.phoneNumbers.find(
      (phone) => phone.id === user.primaryPhoneNumberId
    );
    
    return primaryPhone?.phoneNumber || null;
  }, [user]);

  /**
   * Sign in with email and password
   */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!signIn) {
      throw new Error("Sign in not available");
    }
    
    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });
      
      return {
        success: signInAttempt.status === "complete",
        status: signInAttempt.status,
        error: null,
      };
    } catch (error: any) {
      return {
        success: false,
        status: null,
        error: error?.errors?.[0]?.message || "Sign in failed",
      };
    }
  }, [signIn]);

  /**
   * Sign up with email and password
   */
  const signUpWithEmail = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    if (!signUp) {
      throw new Error("Sign up not available");
    }
    
    try {
      const signUpAttempt = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });
      
      return {
        success: signUpAttempt.status === "complete",
        status: signUpAttempt.status,
        error: null,
      };
    } catch (error: any) {
      return {
        success: false,
        status: null,
        error: error?.errors?.[0]?.message || "Sign up failed",
      };
    }
  }, [signUp]);

  /**
   * Sign in with OAuth provider
   */
  const signInWithOAuth = useCallback(async (provider: "google" | "github" | "facebook" | "linkedin", redirectUrlComplete?: string) => {
    if (!signIn) {
      throw new Error("Sign in not available");
    }
    
    try {
      await signIn.authenticateWithRedirect({
        strategy: `oauth_${provider}` as any,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: redirectUrlComplete || "/search",
      });
      
      return {
        success: true,
        error: null,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.errors?.[0]?.message || "OAuth sign in failed",
      };
    }
  }, [signIn]);

  /**
   * Sign out
   */
  const signOutUser = useCallback(async () => {
    try {
      await signOut({ redirectUrl: "/sign-in" });
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
    isUserLoaded,
    sessionId,
    orgId,
    session,
    organization,
    
    // Permission checking
    hasPermission: has,
    
    // User info getters
    getUserEmail,
    getUserFullName,
    getUserFirstName,
    getUserProfileImageUrl,
    getUserPhoneNumber,
    
    // Auth methods
    signIn: signInWithEmail,
    signUp: signUpWithEmail,
    signInWithOAuth,
    signOut: signOutUser,
  };
}