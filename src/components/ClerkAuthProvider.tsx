"use client";

import { useUser, useAuth, useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserWithProfile, Profile } from "@/lib/profile/userProfileApi";

interface User {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  createdAt?: number;
  profile?: Profile | null;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Legacy compatibility properties (sans token)
  isSignedIn: boolean;
  isLoaded: boolean;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
  isAdmin: boolean;
  userId: string;
  profile: Profile | null;
  error: string | null;
  // Auth methods
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (
    credential?: string,
    state?: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  // Legacy compatibility methods
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useClerkAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useClerkAuth must be used within a ClerkAuthProvider");
  }
  return context;
}

// Alias for backward compatibility
export const useAuthContext = useClerkAuth;

interface ClerkAuthProviderProps {
  children: React.ReactNode;
}

export function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { getToken, isSignedIn: clerkIsSignedIn = false, userId: clerkUserId } = useAuth();
  const { signOut: clerkSignOut } = useClerk();
  const { signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Guard against late async state overwrites during logout
  const logoutVersionRef = React.useRef(0);

  // Fetch current user using Clerk authentication
  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      // Use our enhanced profile API that integrates with Clerk
      const profileResponse = await getCurrentUserWithProfile();
      
      if (!profileResponse.success || !profileResponse.data) {
        return null;
      }
      
      const profileData = profileResponse.data;
      
      // Combine profile data with Clerk user data
      const userData: User = {
        id: profileData.userId || clerkUserId || "",
        email: profileData.email || clerkUser?.emailAddresses[0]?.emailAddress || "",
        role: profileData.role || "user",
        emailVerified: clerkUser?.emailAddresses[0]?.verification?.status === "verified",
        createdAt: profileData.createdAt,
        profile: profileData?._id ? profileData : null,
      };
      
      return userData;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("ClerkAuthProvider.fetchUser failed", error);
      }
      return null;
    }
  }, [clerkUser, clerkUserId]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    // Capture current logout version to ignore late updates occurring after a logout
    const version = logoutVersionRef.current;
    const userData = await fetchUser();
    if (logoutVersionRef.current !== version) {
      // A logout occurred while we were fetching; ignore this result
      return;
    }
    setUser(userData ?? null);
  }, [fetchUser]);

  // Legacy compatibility method
  const refreshProfile = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      if (!clerkLoaded) return;
      
      if (clerkIsSignedIn && clerkUserId) {
        const tokenUser = await fetchUser();
        setUser(tokenUser ?? null);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };
    void initAuth();
  }, [clerkLoaded, clerkIsSignedIn, clerkUserId, fetchUser]);

  // Sign in with email/password using Clerk
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        
        if (!clerkSignIn) {
          throw new Error("Sign in not available");
        }
        
        try {
          // Attempt to sign in with Clerk
          const signInResponse = await clerkSignIn.create({
            identifier: email,
            password,
          });
          
          // Check if sign in was successful
          if (signInResponse.status === "complete") {
            // Refresh user data after successful sign in
            await refreshUser();
            return { success: true };
          } else {
            // Handle incomplete sign in (e.g., requires additional verification)
            const errorMessage = "Sign in requires additional verification. Please check your email.";
            setError(errorMessage);
            return { success: false, error: errorMessage };
          }
        } catch (clerkError: any) {
          // Handle Clerk-specific errors
          let errorMessage = "Sign in failed. Please try again.";
          
          if (clerkError.errors) {
            const error = clerkError.errors[0];
            if (error.code === "form_identifier_not_found") {
              errorMessage = "No account found with this email address. Please check your email or sign up for a new account.";
            } else if (error.code === "form_password_incorrect") {
              errorMessage = "Invalid password. Please check your password and try again.";
            } else if (error.code === "invalid_credentials") {
              errorMessage = "Invalid email or password. Please check your credentials and try again.";
            } else if (error.code === "too_many_requests") {
              errorMessage = "Too many requests. Please try again later.";
            } else {
              errorMessage = error.longMessage || error.message || errorMessage;
            }
          }
          
          setError(errorMessage);
          setUser(null);
          return { success: false, error: errorMessage };
        }
      } catch (error: any) {
        let errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
        
        if (error?.message) {
          errorMessage = error.message;
        }
        
        if (process.env.NODE_ENV !== "production") {
          console.error("Sign in error", error);
        }
        setUser(null);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [clerkSignIn, refreshUser]
  );

  // Sign up with email/password using Clerk
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string
    ) => {
      try {
        setError(null);
        setUser(null);

        if (!clerkSignUp) {
          throw new Error("Sign up not available");
        }
        
        try {
          // Attempt to sign up with Clerk
          const signUpResponse = await clerkSignUp.create({
            emailAddress: email,
            password,
            firstName,
            lastName,
          });
          
          // Check if sign up was successful
          if (signUpResponse.status === "complete") {
            // Refresh user data after successful sign up
            await refreshUser();
            return { success: true };
          } else {
            // Handle incomplete sign up (e.g., requires email verification)
            const errorMessage = "Sign up requires email verification. Please check your email.";
            setError(errorMessage);
            return { success: false, error: errorMessage };
          }
        } catch (clerkError: any) {
          // Handle Clerk-specific errors
          let errorMessage = "Sign up failed. Please try again.";
          
          if (clerkError.errors) {
            const error = clerkError.errors[0];
            if (error.code === "form_identifier_exists") {
              errorMessage = "An account with this email already exists. Please sign in instead.";
            } else if (error.code === "form_password_size") {
              errorMessage = "Password does not meet security requirements. Please use a stronger password.";
            } else if (error.code === "form_password_pwned") {
              errorMessage = "This password has been compromised in a data breach. Please choose a different password.";
            } else if (error.code === "too_many_requests") {
              errorMessage = "Too many requests. Please try again later.";
            } else {
              errorMessage = error.longMessage || error.message || errorMessage;
            }
          }
          
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }
      } catch (error: any) {
        let errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
        
        if (error?.message) {
          errorMessage = error.message;
        }
        
        if (process.env.NODE_ENV !== "production") {
          console.error("Sign up error", error);
        }
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [clerkSignUp, refreshUser]
  );

  // Sign in with Google using Clerk OAuth
  const signInWithGoogle = useCallback(
    async () => {
      try {
        setError(null);
        
        if (!clerkSignIn) {
          throw new Error("Sign in not available");
        }
        
        try {
          // Initiate Google OAuth flow with Clerk
          await clerkSignIn.authenticateWithRedirect({
            strategy: "oauth_google",
            redirectUrl: "/sso-callback",
            redirectUrlComplete: "/search",
          });
          
          return { success: true };
        } catch (clerkError: any) {
          // Handle Clerk OAuth errors
          let errorMessage = "Google sign in failed. Please try again.";
          
          if (clerkError.errors) {
            const error = clerkError.errors[0];
            errorMessage = error.longMessage || error.message || errorMessage;
          }
          
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Google sign in error", error);
        }
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [clerkSignIn]
  );

  // Sign out
  const signOut = useCallback(async () => {
    logoutVersionRef.current += 1;
    try {
      // Sign out from Clerk
      await clerkSignOut({ redirectUrl: "/sign-in" });
    } catch (error) {
      // Log error but continue with local signout
      console.error("Sign out failed:", error);
    } finally {
      setUser(null);
      setError(null);
      // Show a success message
      if (typeof window !== "undefined") {
        // Dynamically import toast to avoid SSR issues
        import("@/lib/ui/toast").then(({ showSuccessToast }) => {
          showSuccessToast("You have been successfully signed out.");
        }).catch(() => {
          // Fallback if toast can't be imported
          console.log("Signed out successfully");
        });
      }
      // Router push is handled by clerkSignOut redirectUrl
    }
  }, [clerkSignOut]);

  // Computed values
  const isAuthenticated = !!(user && clerkIsSignedIn);
  const isSignedIn = isAuthenticated;
  const isLoaded = !isLoading && clerkLoaded;
  const isProfileComplete = user?.profile?.isProfileComplete ?? false;
  const isOnboardingComplete = user?.profile?.isOnboardingComplete ?? false;
  const isAdmin = user?.role === "admin";
  const userId = user?.id || clerkUserId || "";
  const profile = user?.profile || null;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    // Legacy compatibility
    isSignedIn,
    isLoaded,
    isProfileComplete,
    isOnboardingComplete,
    isAdmin,
    userId,
    profile,
    error,
    // Auth methods
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshUser,
    // Legacy compatibility methods
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}