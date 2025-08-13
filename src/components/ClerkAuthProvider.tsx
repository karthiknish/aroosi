"use client";

import { useUser, useAuth, useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserWithProfile, Profile } from "@/lib/profile/userProfileApi";
import { showErrorToast } from "@/lib/ui/toast";

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
    fullName: string
  ) => Promise<{
    success: boolean;
    error?: string;
    needsVerification?: boolean;
    signUpAttemptId?: string;
  }>;
  verifyEmailCode: (
    code: string,
    signUpAttemptId: string
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (
    credential?: string,
    state?: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  resendEmailVerification: (
    signUpAttemptId: string
  ) => Promise<{ success: boolean; error?: string }>;
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
  const { isSignedIn: clerkIsSignedIn = false, userId: clerkUserId } =
    useAuth();
  const { signOut: clerkSignOut, setActive } = useClerk();
  const { signIn: clerkSignIn } = useSignIn();
  const { signUp: clerkSignUp } = useSignUp();
  const _router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track a pending first name we want to apply once the Clerk user object exists
  const _pendingFirstNameRef = React.useRef<string | null>(null);

  // Guard against late async state overwrites during logout
  const logoutVersionRef = React.useRef(0);
  // Prevent duplicate toasts when Clerk user exists but Convex profile isn't ready yet
  const convexSetupToastShownRef = React.useRef(false);

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
        email:
          profileData.email || clerkUser?.emailAddresses[0]?.emailAddress || "",
        role: profileData.role || "user",
        emailVerified:
          clerkUser?.emailAddresses[0]?.verification?.status === "verified",
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

  // Show a generic toast if Clerk session exists but Convex user/profile isn't ready yet
  useEffect(() => {
    if (!clerkLoaded) return;
    if (
      clerkIsSignedIn &&
      clerkUserId &&
      !user &&
      !convexSetupToastShownRef.current
    ) {
      convexSetupToastShownRef.current = true;
      showErrorToast(
        "We couldn't load your account. Please try again shortly."
      );
    }
  }, [clerkLoaded, clerkIsSignedIn, clerkUserId, user]);

  // Removed deferred firstName update to avoid invalid parameter errors

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
            const errorMessage =
              "Sign in requires additional verification. Please check your email.";
            setError(errorMessage);
            return { success: false, error: errorMessage };
          }
        } catch (clerkError: any) {
          // Handle Clerk-specific errors
          let errorMessage = "Sign in failed. Please try again.";

          if (clerkError.errors) {
            const error = clerkError.errors[0];
            if (error.code === "form_identifier_not_found") {
              errorMessage =
                "No account found with this email address. Please check your email or sign up for a new account.";
            } else if (error.code === "form_password_incorrect") {
              errorMessage =
                "Invalid password. Please check your password and try again.";
            } else if (error.code === "invalid_credentials") {
              errorMessage =
                "Invalid email or password. Please check your credentials and try again.";
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
        let errorMessage =
          "Unable to connect to the server. Please check your internet connection and try again.";

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
    async (email: string, password: string, _fullName: string) => {
      try {
        setError(null);
        setUser(null);
        // Names are kept in Convex profile; skip Clerk user firstName updates

        if (!clerkSignUp) {
          throw new Error("Sign up not available");
        }

        try {
          // Attempt to sign up with Clerk (initial attempt)
          const signUpResponse = await clerkSignUp.create({
            emailAddress: email,
            password,
          });

          /* dev: signUpResponse available */

          // Check if sign up was successful
          if (signUpResponse.status === "complete") {
            // Refresh user data after successful sign up
            await refreshUser();
            // Skip Clerk name update
            return { success: true };
          }

          // For any non-complete status, we check if email verification is required and trigger it
          const needsEmailVerification =
            (signUpResponse as any)?.verifications?.emailAddress?.status ===
              "required" ||
            (signUpResponse.unverifiedFields || []).includes("email_address");

          if (needsEmailVerification) {
            try {
              await signUpResponse.prepareEmailAddressVerification({
                strategy: "email_code",
              });
            } catch (prepErr) {
              if (process.env.NODE_ENV !== "production") {
                console.warn("prepareEmailAddressVerification failed", prepErr);
              }
            }
            const msg = "We've sent a verification code to your email.";
            setError(msg);
            return {
              success: false,
              error: msg,
              needsVerification: true,
              signUpAttemptId: signUpResponse.id,
            };
          }

          // Fallback: treat as needing verification if still not complete
          return {
            success: false,
            error: "Additional verification required.",
            needsVerification: true,
            signUpAttemptId: signUpResponse.id,
          };
        } catch (clerkError: any) {
          // Handle Clerk-specific errors
          let errorMessage = "Sign up failed. Please try again.";

          if (clerkError.errors) {
            const error = clerkError.errors[0];
            if (error.code === "form_identifier_exists") {
              errorMessage =
                "An account with this email already exists. Please sign in instead.";
            } else if (error.code === "form_password_size") {
              errorMessage =
                "Password does not meet security requirements. Please use a stronger password.";
            } else if (error.code === "form_password_pwned") {
              errorMessage =
                "This password has been compromised in a data breach. Please choose a different password.";
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
        let errorMessage =
          "Unable to connect to the server. Please check your internet connection and try again.";

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

  // Verify email code (OTP) for pending sign up
  const verifyEmailCode = useCallback(
    async (code: string, _signUpAttemptId: string) => {
      try {
        if (!clerkSignUp) throw new Error("Sign up not available");
        // Ensure we have the same sign up attempt loaded; if IDs differ we can't swap easily, rely on current instance
        let attemptResult: any;
        try {
          attemptResult = await clerkSignUp.attemptEmailAddressVerification({
            code,
          });
        } catch (attemptErr: any) {
          const msg =
            attemptErr?.errors?.[0]?.longMessage ||
            attemptErr?.message ||
            "Invalid or expired code.";
          setError(msg);
          return { success: false, error: msg };
        }

        if (attemptResult.status === "complete") {
          // Activate session if provided
          try {
            if (attemptResult.createdSessionId && setActive) {
              await setActive({ session: attemptResult.createdSessionId });
            }
          } catch {}
          // Skip Clerk name update
          // Trigger auto-heal creation by refetching via util
          try {
            await getCurrentUserWithProfile();
          } catch {}
          await refreshUser();
          return { success: true };
        }
        // Not complete yet
        return {
          success: false,
          error: "Verification incomplete. Please try again.",
        };
      } catch (err: any) {
        let msg = "Invalid or expired code.";
        if (err?.message) {
          msg = err.message;
        }
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [clerkSignUp, refreshUser, setActive]
  );

  const resendEmailVerification = useCallback(
    async (signUpAttemptId: string) => {
      try {
        if (!clerkSignUp) throw new Error("Sign up not available");
        await clerkSignUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        return { success: true };
      } catch (e: any) {
        const msg =
          e?.errors?.[0]?.longMessage || e?.message || "Unable to resend code";
        return { success: false, error: msg };
      }
    },
    [clerkSignUp]
  );

  // Sign in with Google using Clerk OAuth
  const signInWithGoogle = useCallback(async () => {
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
        // eslint-disable-next-line no-console
        // eslint-disable-next-line no-console
        // eslint-disable-next-line no-console
        // eslint-disable-next-line no-console
        console.error("Google sign in error", error);
      }
      const errorMessage = "Network error";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [clerkSignIn]);

  // Sign out
  const signOut = useCallback(async () => {
    logoutVersionRef.current += 1;
    try {
      // Sign out from Clerk
      await clerkSignOut({ redirectUrl: "/sign-in" });
    } catch (error) {
      // Log error but continue with local signout
      // eslint-disable-next-line no-console
      console.error("Sign out failed:", error);
    } finally {
      setUser(null);
      setError(null);
      // Show a success message
      if (typeof window !== "undefined") {
        // Dynamically import toast to avoid SSR issues
        import("@/lib/ui/toast")
          .then(({ showSuccessToast }) => {
            showSuccessToast("You have been successfully signed out.");
          })
          .catch(() => {
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
    verifyEmailCode,
    refreshUser,
    resendEmailVerification,
    // Legacy compatibility methods
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}