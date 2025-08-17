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
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebaseClient";
import { UserProfile } from "@/lib/userProfile";

// Type definitions
export interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
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
}

// Editable subset of profile fields (expand as needed)
export type ProfileUpdates = Partial<Pick<UserProfile,
  | "fullName"
  | "displayName"
  | "firstName"
  | "lastName"
  | "dateOfBirth"
  | "gender"
  | "preferredGender"
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
>>;

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
}

// Hook for Firebase authentication and profile management
export function useUserProfile() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    isProfileComplete: false,
    isOnboardingComplete: false,
    isAdmin: false,
    error: null
  });

  // Fetch user profile from Firestore
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        return null;
      }
      return { id: userId, ...userDoc.data() } as UserProfile;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }, []);

  // Create or update user profile in Firestore
  const createOrUpdateUserProfile = useCallback(async (
    firebaseUser: FirebaseUser, 
    additionalData?: any
  ): Promise<UserProfile> => {
    try {
      const now = Date.now();
      const userRef = doc(db, "users", firebaseUser.uid);
      
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        emailVerified: firebaseUser.emailVerified,
        createdAt: firebaseUser.metadata.creationTime ? 
          new Date(firebaseUser.metadata.creationTime).getTime() : now,
        updatedAt: now,
        role: "user",
        isProfileComplete: false,
        isOnboardingComplete: false,
        profileCompletionPercentage: 0,
        lastLoginAt: now,
        ...additionalData
      };
      
      // Check if user already exists
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        // Update existing user
        await updateDoc(userRef, userData);
      } else {
        // Create new user
        await setDoc(userRef, userData);
      }
      
      const prof = await fetchUserProfile(firebaseUser.uid);
      if (!prof) {
        // Should not happen immediately after creation, but guard for type safety
        throw new Error("Failed to load newly created user profile");
      }
      return prof;
    } catch (error) {
      console.error("Error creating/updating user profile:", error);
      throw error;
    }
  }, [fetchUserProfile]);

  // Update user profile in Firestore
  const updateUserProfile = useCallback(async (updates: ProfileUpdates): Promise<UserProfile> => {
    try {
      if (!authState.user) {
        throw new Error("User not authenticated");
      }
      
      const userRef = doc(db, "users", authState.user.uid);
      const now = Date.now();
      
      // Remove protected fields
      const protectedFields = [
        'id', 'uid', 'email', 'emailVerified', 'createdAt', 'role'
      ];
      
      protectedFields.forEach(field => {
        if (field in (updates as Record<string, unknown>)) {
          delete (updates as Record<string, unknown>)[field];
        }
      });
      
      const updateData = {
        ...updates,
        updatedAt: now
      };
      
      await updateDoc(userRef, updateData);
      
      // Fetch updated profile
      const updatedProfile = await fetchUserProfile(authState.user.uid);
      if (!updatedProfile) {
        throw new Error("Failed to load updated profile");
      }
      return updatedProfile;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }, [authState.user, fetchUserProfile]);

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await fetchUserProfile(firebaseUser.uid);
          setAuthState({
            user: firebaseUser,
            profile: profile,
            isLoading: false,
            isAuthenticated: true,
            isProfileComplete: profile?.isProfileComplete || false,
            isOnboardingComplete: profile?.isOnboardingComplete || false,
            isAdmin: profile?.role === "admin" || false,
            error: null
          });
        } catch (error) {
          setAuthState({
            user: firebaseUser,
            profile: null,
            isLoading: false,
            isAuthenticated: true,
            isProfileComplete: false,
            isOnboardingComplete: false,
            isAdmin: false,
            error: "Failed to load profile"
          });
        }
      } else {
        setAuthState({
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          isProfileComplete: false,
          isOnboardingComplete: false,
          isAdmin: false,
          error: null
        });
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  // Sign in with email and password
  const signIn = useCallback(async ({ email, password }: SignInCredentials): Promise<AuthActionResult> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login timestamp
      const userRef = doc(db, "users", userCredential.user.uid);
      await updateDoc(userRef, {
        lastLoginAt: Date.now(),
        updatedAt: Date.now()
      });
      
      const profile = await fetchUserProfile(userCredential.user.uid);
      
      setAuthState({
        user: userCredential.user,
        profile: profile,
        isLoading: false,
        isAuthenticated: true,
        isProfileComplete: profile?.isProfileComplete || false,
        isOnboardingComplete: profile?.isOnboardingComplete || false,
        isAdmin: profile?.role === "admin" || false,
        error: null
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
      
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      return { success: false, error: errorMessage };
    }
  }, [fetchUserProfile]);

  // Sign up with email and password
  const signUp = useCallback(async ({ email, password, fullName }: SignUpCredentials): Promise<SignUpResult> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      await updateProfile(userCredential.user, { displayName: fullName });
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      // Create user profile in Firestore
      const profile = await createOrUpdateUserProfile(userCredential.user, { fullName });
      
      setAuthState({
        user: userCredential.user,
        profile: profile,
        isLoading: false,
        isAuthenticated: true,
        isProfileComplete: profile?.isProfileComplete || false,
        isOnboardingComplete: profile?.isOnboardingComplete || false,
        isAdmin: profile?.role === "admin" || false,
        error: null
      });
      
  return { success: true, needsEmailVerification: true, needsVerification: true } as any; // include legacy alias
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
      
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      return { success: false, error: errorMessage };
    }
  }, [createOrUpdateUserProfile]);

  // Sign in with Google
  const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      // Ensure profile exists / updated
      await createOrUpdateUserProfile(cred.user, { fullName: cred.user.displayName || "" });
      const profile = await fetchUserProfile(cred.user.uid);
      setAuthState({
        user: cred.user,
        profile: profile,
        isLoading: false,
        isAuthenticated: true,
        isProfileComplete: profile?.isProfileComplete || false,
        isOnboardingComplete: profile?.isOnboardingComplete || false,
        isAdmin: profile?.role === "admin" || false,
        error: null
      });
      return { success: true };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
  const errorMessage = err.message || "Google sign in failed";
      setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, [createOrUpdateUserProfile, fetchUserProfile]);

  // Resend / send email verification
  const sendVerificationEmail = useCallback(async (): Promise<AuthActionResult> => {
    try {
      if (!auth.currentUser) return { success: false, error: "No authenticated user" };
      await sendEmailVerification(auth.currentUser);
      return { success: true };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      return { success: false, error: err.message || "Failed to send verification email" };
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
        isProfileComplete: false,
        isOnboardingComplete: false,
        isAdmin: false,
        error: null
      });
    } catch (error) {
      console.error("Sign out failed:", error);
      setAuthState(prev => ({ 
        ...prev, 
        error: "Failed to sign out" 
      }));
    }
  }, []);

  // Send password reset email
  const sendPasswordReset = useCallback(async (email: string): Promise<AuthActionResult> => {
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
  }, []);

  // Refresh user profile
  const refreshProfile = useCallback(async () => {
    if (!authState.user) return;
    
    try {
      const profile = await fetchUserProfile(authState.user.uid);
      setAuthState(prev => ({
        ...prev,
        profile: profile,
        isProfileComplete: profile?.isProfileComplete || false,
        isOnboardingComplete: profile?.isOnboardingComplete || false,
        isAdmin: profile?.role === "admin" || false
      }));
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }
  }, [authState.user, fetchUserProfile]);

  // Check if user has a specific role
  const hasRole = useCallback((role: string) => {
    return authState.profile?.role === role;
  }, [authState.profile?.role]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: string) => {
    // For now, we'll implement a simple permission check
    // This could be expanded to check permissions array or roles
    if (authState.isAdmin) return true;
    
    // Add more complex permission logic here if needed
    return false;
  }, [authState.isAdmin]);

  const value: AuthContextValue = {
    ...authState,
    // aliases
    isLoaded: !authState.isLoading,
    isSignedIn: authState.isAuthenticated,
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
    sendEmailVerification: sendVerificationEmail,
  };
  return value;
}