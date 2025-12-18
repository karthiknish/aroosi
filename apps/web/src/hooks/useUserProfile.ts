// Client-side hook for managing Firebase user profiles
// Provides a unified interface for user authentication and profile management

import { useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db, auth, setAuthTokenCookie } from "@/lib/firebase";
import { UserProfile } from "@/lib/userProfile";
import {
  calculateProfileCompletion,
  isOnboardingEssentialComplete,
  ONBOARDING_REQUIRED_FIELDS,
} from "@/lib/userProfile/calculations";
import {
  submitProfile,
  fetchUserProfile as fetchUserProfileApi,
} from "@/lib/profile/userProfileApi";

// Deprecated local implementation replaced by shared calculation helper
const isOnboardingDone = (obj: Record<string, any> | undefined | null) =>
  isOnboardingEssentialComplete(obj || {});

// Type definitions
export interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  fullName: string;
  // Optional initial profile data to persist at account creation
  profileData?: ProfileUpdates;
}

// Editable subset of profile fields (expand as needed)
export type ProfileUpdates = Partial<
  Pick<
    UserProfile,
    | "fullName"
    | "displayName"
    | "firstName"
    | "lastName"
    | "dateOfBirth"
    | "gender"
    | "preferredGender"
    | "profileFor"
    | "physicalStatus"
    | "city"
    | "state"
    | "country"
    | "height"
    | "maritalStatus"
    | "diet"
    | "smoking"
    | "drinking"
    | "education"
    | "occupation"
    | "annualIncome"
    | "annualIncomeCurrency"
    | "motherTongue"
    | "religion"
    | "caste"
    | "subcaste"
    | "ethnicity"
    | "community"
    | "phoneNumber"
    | "whatsappNumber"
    | "socialMediaLinks"
    | "aboutMe"
    | "hobbies"
    | "interests"
    | "partnerPreferenceAgeMin"
    | "partnerPreferenceAgeMax"
    | "partnerPreferenceHeightMin"
    | "partnerPreferenceHeightMax"
    | "partnerPreferenceMaritalStatus"
    | "partnerPreferenceReligion"
    | "partnerPreferenceCaste"
    | "partnerPreferenceEducation"
    | "partnerPreferenceOccupation"
    | "partnerPreferenceAnnualIncomeMin"
    | "partnerPreferenceLocation"
    | "partnerPreferenceCountry"
    | "profileImageUrls"
    | "mainProfileImageIndex"
    | "privacySettings"
    | "notificationPreferences"
    | "featuresUsed"
  >
>;

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export interface SignUpResult extends AuthActionResult {
  needsEmailVerification?: boolean;
}

export interface AuthContextValue extends AuthState {
  signIn: (credentials: SignInCredentials) => Promise<AuthActionResult>;
  signUp: (credentials: SignUpCredentials) => Promise<SignUpResult>;
  signOut: () => Promise<void> | void;
  sendPasswordReset: (email: string) => Promise<AuthActionResult>;
  updateUserProfile: (updates: ProfileUpdates) => Promise<UserProfile>;
  refreshProfile: () => void;
  // Backwards compatibility aliases
  refreshUser: () => void; // alias of refreshProfile
  isLoaded: boolean; // alias of !isLoading
  isSignedIn: boolean; // alias of isAuthenticated
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  signInWithGoogle: () => Promise<AuthActionResult>;
  sendEmailVerification: () => Promise<AuthActionResult>;
  completeGoogleSignup: (
    profileData: ProfileUpdates
  ) => Promise<AuthActionResult>;
  // Google sign-in variant that only allows existing accounts (no auto-create or onboarding)
  signInWithGoogleExistingOnly: () => Promise<AuthActionResult>;
}

// Hook for Firebase authentication and profile management
export function useUserProfile() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
    error: null,
  });

  // Fetch user profile from API
  const fetchUserProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      try {
        const result = await fetchUserProfileApi(userId);
        if (result.success && result.data) {
          return result.data as unknown as UserProfile;
        }
        return null;
      } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }
    },
    []
  );

  // Create or update user profile via API
  const createOrUpdateUserProfile = useCallback(
    async (
      firebaseUser: FirebaseUser,
      additionalData?: Record<string, unknown>
    ): Promise<UserProfile> => {
      try {
        const prospective: any = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          emailVerified: firebaseUser.emailVerified,
          role: "user",
          ...(additionalData || {}),
        };

        const result = await submitProfile(firebaseUser.uid, prospective, "create");
        
        if (!result.success) {
          const errorMsg = typeof result.error === 'string' ? result.error : result.error?.message || "Failed to create profile";
          throw new Error(errorMsg);
        }

        return result.data as unknown as UserProfile;
      } catch (error) {
        console.error("Error creating/updating user profile:", error);
        throw error;
      }
    },
    []
  );

  // Update user profile via API
  const updateUserProfile = useCallback(
    async (updates: ProfileUpdates): Promise<UserProfile> => {
      try {
        if (!authState.user) {
          throw new Error("User not authenticated");
        }

        const result = await submitProfile(authState.user.uid, updates as any, "edit");
        
        if (!result.success) {
          const errorMsg = typeof result.error === 'string' ? result.error : result.error?.message || "Failed to update profile";
          throw new Error(errorMsg);
        }

        return result.data as unknown as UserProfile;
      } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
      }
    },
    [authState.user]
  );

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ensure the auth token cookie is present (avoid duplicate refreshes)
        if (typeof window !== "undefined") {
          if (!document.cookie.includes("firebaseAuthToken=")) {
            setAuthTokenCookie().catch(() => {});
          }
        }
        // Force token refresh to ensure Firestore has valid credentials
        try {
          await firebaseUser.getIdToken(true);
        } catch (tokenErr) {
          console.warn("[useUserProfile] Token refresh failed:", tokenErr);
        }
        const profile = await fetchUserProfile(firebaseUser.uid);
        setAuthState({
          user: firebaseUser,
          profile,
          isLoading: false,
          isAuthenticated: true,
          isAdmin: profile?.role === "admin" || false,
          error: null,
        });
      } else {
        setAuthState({
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          isAdmin: false,
          error: null,
        });
      }
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  // Sign in with email and password
  const signIn = useCallback(
    async ({
      email,
      password,
    }: SignInCredentials): Promise<AuthActionResult> => {
      try {
        setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Detect if this email was originally created with Google (or another provider)
        // and does not have a password sign-in method enabled. In that case, surface
        // a clear, friendly message instead of the generic "user not found" / "wrong password".
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (methods.length > 0 && !methods.includes("password")) {
            // Specifically handle Google-only accounts (common case that causes confusion)
            if (methods.includes("google.com")) {
              const msg =
                "This account was created using Google. Please use 'Sign in with Google' instead.";
              setAuthState((prev) => ({
                ...prev,
                isLoading: false,
                error: msg,
              }));
              return { success: false, error: msg };
            } else {
              const msg =
                "This account uses a different sign‑in method. Use the original provider to continue.";
              setAuthState((prev) => ({
                ...prev,
                isLoading: false,
                error: msg,
              }));
              return { success: false, error: msg };
            }
          }
        } catch (providerCheckErr) {
          // Non-fatal; fall through to normal sign-in attempt
        }

        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Update last login timestamp
        const userRef = doc(db, "users", userCredential.user.uid);
        await updateDoc(userRef, {
          lastLoginAt: Date.now(),
          updatedAt: Date.now(),
        });

        const profile = await fetchUserProfile(userCredential.user.uid);

        // Proactively refresh cookie after sign in
        if (typeof window !== "undefined") {
          setAuthTokenCookie().catch(() => {});
        }
        setAuthState({
          user: userCredential.user,
          profile: profile,
          isLoading: false,
          isAuthenticated: true,
          isAdmin: profile?.role === "admin" || false,
          error: null,
        });

        return { success: true };
      } catch (error: unknown) {
        let errorMessage = "Sign in failed";
        const err = error as { code?: string; message?: string };
        switch (err.code) {
          case "auth/user-not-found":
            errorMessage = "No account found with this email";
            break;
          case "auth/wrong-password":
            errorMessage = "Incorrect password";
            break;
          case "auth/invalid-email":
            errorMessage = "Invalid email address";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many requests. Try again later";
            break;
          default:
            errorMessage = err.message || errorMessage;
        }

        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return { success: false, error: errorMessage };
      }
    },
    [fetchUserProfile]
  );

  // Sign up with email and password
  const signUp = useCallback(
    async ({
      email,
      password,
      fullName,
      profileData,
    }: SignUpCredentials): Promise<SignUpResult> => {
      try {
        setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Early existence check to provide instant feedback without attempting account creation
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (methods.length > 0) {
            const existsMsg = "An account with this email already exists";
            setAuthState((prev) => ({
              ...prev,
              isLoading: false,
              error: existsMsg,
            }));
            return { success: false, error: existsMsg };
          }
        } catch {}

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Update display name
        await updateProfile(userCredential.user, { displayName: fullName });

        // Send email verification
        await sendEmailVerification(userCredential.user);

        // Create user profile in Firestore
        // Filter out empty / undefined initial profile values to avoid noisy document
        const cleaned: Record<string, unknown> = {};
        if (profileData) {
          Object.entries(profileData).forEach(([k, v]) => {
            if (
              v === undefined ||
              v === null ||
              (typeof v === "string" && v.trim() === "") ||
              (Array.isArray(v) && v.length === 0)
            )
              return;
            cleaned[k] = v;
          });
        }
        // Ensure fullName & default subscription plan stored
        cleaned.fullName = fullName;
        if (!("subscriptionPlan" in cleaned)) {
          cleaned.subscriptionPlan = "free";
        }

        // Basic normalization for annualIncome & height at creation
        if (typeof cleaned.annualIncome === "string") {
          const parsed = parseInt(cleaned.annualIncome as string, 10);
          if (!isNaN(parsed)) cleaned.annualIncome = parsed;
        }
        if (typeof cleaned.height === "string") {
          const h = cleaned.height as string;
          let cm: number | undefined;
          const cmMatch = h.match(/(\d+(?:\.\d+)?)\s*cm/i);
          if (cmMatch) cm = parseFloat(cmMatch[1]);
          else if (/\d+'\d+"?/.test(h)) {
            const feetIn = h.match(/(\d+)'(\d+)/);
            if (feetIn) {
              const feet = parseInt(feetIn[1], 10);
              const inches = parseInt(feetIn[2], 10);
              cm = Math.round((feet * 12 + inches) * 2.54);
            }
          } else if (/^\d{2,3}$/.test(h)) {
            const val = parseInt(h, 10);
            if (val > 90 && val < 250) cm = val;
          }
          if (cm) cleaned.heightCm = cm;
        }

        const profile = await createOrUpdateUserProfile(
          userCredential.user,
          cleaned
        );

        // Don't force onboarding completion; Firestore rules enforce required fields for true.

        if (typeof window !== "undefined") {
          setAuthTokenCookie().catch(() => {});
        }
        setAuthState({
          user: userCredential.user,
          profile: profile,
          isLoading: false,
          isAuthenticated: true,
          // onboarding flag removed
          isAdmin: profile?.role === "admin" || false,
          error: null,
        });

        return {
          success: true,
          needsEmailVerification: true,
          needsVerification: true,
        } as any; // include legacy alias
      } catch (error: unknown) {
        let errorMessage = "Sign up failed";
        const err = error as { code?: string; message?: string };
        switch (err.code) {
          case "auth/email-already-in-use":
            errorMessage = "An account with this email already exists";
            break;
          case "auth/invalid-email":
            errorMessage = "Invalid email address";
            break;
          case "auth/operation-not-allowed":
            errorMessage = "Email/password accounts are not enabled";
            break;
          case "auth/weak-password":
            errorMessage = "Password is too weak";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many requests. Try again later";
            break;
          default:
            errorMessage = err.message || errorMessage;
        }

        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        return { success: false, error: errorMessage };
      }
    },
    [createOrUpdateUserProfile]
  );

  // Sign in with Google
  const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const profile = await fetchUserProfile(cred.user.uid);
      if (typeof window !== "undefined") {
        setAuthTokenCookie().catch(() => {});
      }
      // If no profile doc yet, treat as onboarding-incomplete (used for Google signup flow)
      const onboardingComplete = true;
      setAuthState({
        user: cred.user,
        profile: profile,
        isLoading: false,
        isAuthenticated: true,
        // onboarding flag removed
        isAdmin: profile?.role === "admin" || false,
        error: null,
      });
      return { success: true };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      let errorMessage = "Google sign in failed";
      switch (err.code) {
        case "auth/popup-closed-by-user":
          errorMessage = "Google sign in cancelled";
          break;
        case "auth/popup-blocked":
          errorMessage = "Popup blocked by browser";
          break;
        case "auth/cancelled-popup-request":
          errorMessage = "Popup closed before completion";
          break;
        case "auth/network-request-failed":
          errorMessage = "Network error. Check your connection.";
          break;
        default:
          errorMessage = err.message || errorMessage;
      }
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [fetchUserProfile]);

  // Google sign-in that blocks if no existing profile document is present.
  const signInWithGoogleExistingOnly =
    useCallback(async (): Promise<AuthActionResult> => {
      try {
        setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        // Retry a few times to avoid a race where a profile might exist but read is slightly delayed
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        let profile = await fetchUserProfile(cred.user.uid);
        const backoffs = [50, 125, 250];
        for (let i = 0; i < backoffs.length && !profile; i++) {
          await sleep(backoffs[i]);
          profile = await fetchUserProfile(cred.user.uid);
        }
        if (!profile) {
          // No existing profile for this Google user. Determine if this email uses another provider.
          let friendlyMsg =
            "No account exists for this Google email. Please sign up first.";
          try {
            if (cred.user?.email) {
              const methods = await fetchSignInMethodsForEmail(
                auth,
                cred.user.email
              );
              if (methods.includes("password")) {
                friendlyMsg =
                  "This email is registered with email & password. Please sign in using your password.";
              }
            }
          } catch {}

          // Sign out the just-created/linked Google session to avoid partial state
          try {
            await signOut(auth);
          } catch {}
          setAuthState((prev) => ({
            ...prev,
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
            // onboarding flag removed
            isAdmin: false,
            error: friendlyMsg,
          }));
          return {
            success: false,
            error: friendlyMsg,
          };
        }
        if (typeof window !== "undefined") {
          setAuthTokenCookie().catch(() => {});
        }
        setAuthState({
          user: cred.user,
          profile,
          isLoading: false,
          isAuthenticated: true,
          // onboarding flag removed
          isAdmin: profile.role === "admin" || false,
          error: null,
        });
        return { success: true };
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        const errorMessage = err.message || "Google sign in failed";
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    }, [fetchUserProfile]);

  // Resend / send email verification
  const sendVerificationEmail =
    useCallback(async (): Promise<AuthActionResult> => {
      try {
        if (!auth.currentUser)
          return { success: false, error: "No authenticated user" };
        await sendEmailVerification(auth.currentUser);
        return { success: true };
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        return {
          success: false,
          error: err.message || "Failed to send verification email",
        };
      }
    }, []);

  // Sign out
  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      setAuthState({
        user: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
        // onboarding flag removed
        isAdmin: false,
        error: null,
      });
    } catch (error) {
      console.error("Sign out failed:", error);
      setAuthState((prev) => ({
        ...prev,
        error: "Failed to sign out",
      }));
    }
  }, []);

  // Send password reset email
  const sendPasswordReset = useCallback(
    async (email: string): Promise<AuthActionResult> => {
      try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
      } catch (error: unknown) {
        let errorMessage = "Failed to send password reset email";
        const err = error as { code?: string; message?: string };
        switch (err.code) {
          case "auth/invalid-email":
            errorMessage = "Invalid email address";
            break;
          case "auth/user-not-found":
            errorMessage = "No account found with this email";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many requests. Try again later";
            break;
          default:
            errorMessage = err.message || errorMessage;
        }

        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Refresh user profile
  const refreshProfile = useCallback(async () => {
    if (!authState.user) return;

    try {
      const profile = await fetchUserProfile(authState.user.uid);
      setAuthState((prev) => ({
        ...prev,
        profile: profile,
        // onboarding flag removed
        isAdmin: profile?.role === "admin" || false,
      }));
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }
  }, [authState.user, fetchUserProfile]);

  // Check if user has a specific role
  const hasRole = useCallback(
    (role: string) => {
      return authState.profile?.role === role;
    },
    [authState.profile?.role]
  );

  // Check if user has a specific permission
  const hasPermission = useCallback(
    (permission: string) => {
      // For now, we'll implement a simple permission check
      // This could be expanded to check permissions array or roles
      if (authState.isAdmin) return true;

      // Add more complex permission logic here if needed
      return false;
    },
    [authState.isAdmin]
  );

  const value: AuthContextValue = {
    ...authState,
    // aliases
    isLoaded: !authState.isLoading,
    isSignedIn: authState.isAuthenticated,
    // Backward compatibility: some legacy tests expect isProfileComplete
    // onboarding flag removed
    // (Type already may not include it; we cast for legacy access.)
    // isProfileComplete alias removed
    refreshProfile,
    refreshUser: refreshProfile,
    signIn,
    signUp,
    signOut: signOutUser,
    sendPasswordReset,
    updateUserProfile,
    hasRole,
    hasPermission,
    signInWithGoogle,
    signInWithGoogleExistingOnly,
    sendEmailVerification: sendVerificationEmail,
    completeGoogleSignup: async (profileData: ProfileUpdates) => {
      try {
        if (!authState.user)
          return { success: false, error: "Not authenticated" };
        // Ensure this is a Google provider user
        const providerIds = (authState.user.providerData || []).map(
          (p) => p.providerId
        );
        if (!providerIds.includes("google.com")) {
          return { success: false, error: "Not a Google sign-in session" };
        }
        // Validate required onboarding fields
        const missing: string[] = [];
        for (const key of ONBOARDING_REQUIRED_FIELDS as (keyof ProfileUpdates &
          keyof typeof ONBOARDING_REQUIRED_FIELDS)[]) {
          const v = (profileData as any)[key];
          if (
            v === undefined ||
            v === null ||
            (typeof v === "string" && v.trim() === "") ||
            (Array.isArray(v) && v.length === 0)
          ) {
            missing.push(String(key));
          }
        }
        if (missing.length) {
          return {
            success: false,
            error: `Missing required fields: ${missing.join(", ")}`,
          };
        }
        // Build cleaned object (avoid empty values)
        const cleaned: Record<string, unknown> = {};
        Object.entries(profileData).forEach(([k, v]) => {
          if (
            v === undefined ||
            v === null ||
            (typeof v === "string" && v.trim() === "") ||
            (Array.isArray(v) && v.length === 0)
          ) {
            return;
          }
          cleaned[k] = v;
        });
        if (!("subscriptionPlan" in cleaned)) cleaned.subscriptionPlan = "free";
        // Height normalization (same logic reused)
        if (typeof cleaned.height === "string") {
          const h = cleaned.height as string;
          let cm: number | undefined;
          const cmMatch = h.match(/(\d+(?:\.\d+)?)\s*cm/i);
          if (cmMatch) cm = parseFloat(cmMatch[1]);
          else if (/\d+'\d+"?/.test(h)) {
            const feetIn = h.match(/(\d+)'(\d+)/);
            if (feetIn) {
              const feet = parseInt(feetIn[1], 10);
              const inches = parseInt(feetIn[2], 10);
              cm = Math.round((feet * 12 + inches) * 2.54);
            }
          } else if (/^\d{2,3}$/.test(h)) {
            const val = parseInt(h, 10);
            if (val > 90 && val < 250) cm = val;
          }
          if (cm) cleaned.heightCm = cm;
        }
        // Provide fullName fallback
        if (!cleaned.fullName && authState.user.displayName)
          cleaned.fullName = authState.user.displayName;
        const profile = await createOrUpdateUserProfile(
          authState.user,
          cleaned
        );
        setAuthState((prev) => ({
          ...prev,
          profile,
          // onboarding flag removed
        }));
        return { success: true };
      } catch (e: any) {
        return {
          success: false,
          error: e?.message || "Failed to complete Google signup",
        };
      }
    },
  };
  return value;
}