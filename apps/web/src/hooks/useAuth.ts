// Re-export useAuth from FirebaseAuthProvider for backward compatibility
export { useFirebaseAuth as useAuth, useAuthContext } from "@/components/FirebaseAuthProvider";

// Legacy types for backward compatibility
import type { AuthUser } from "@aroosi/shared/types";
export type { AuthUser } from "@aroosi/shared/types";

export interface AuthState {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  token: string | null;
}
