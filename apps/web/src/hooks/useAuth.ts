// Re-export useAuth from FirebaseAuthProvider for backward compatibility
export { useFirebaseAuth as useAuth, useAuthContext } from "@/components/FirebaseAuthProvider";

// Legacy types for backward compatibility
export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  token: string | null;
}
