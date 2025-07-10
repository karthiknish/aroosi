// Re-export useAuth from AuthProvider for backward compatibility
export { useAuth, useAuthContext } from "@/components/AuthProvider";

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
