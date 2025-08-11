// Re-export useAuth from ClerkAuthProvider for backward compatibility
export { useClerkAuth as useAuth, useAuthContext } from "@/components/ClerkAuthProvider";

// Legacy types for backward compatibility
export interface AuthUser {
  id: string;
  email: string;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  token: string | null;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
}
