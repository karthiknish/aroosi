import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";

export function useAuthStatus() {
  const {
    user,
    isLoading,
    isAuthenticated,
    isOnboardingComplete,
    isAdmin,
    profile,
    error,
    refreshUser,
  } = useFirebaseAuth();
  const userId = user?.uid || (profile as any)?._id || (profile as any)?.userId;

  return {
    user,
    isLoading,
    isAuthenticated,
    isOnboardingComplete,
    isAdmin,
    userId,
    profile,
    error,
    refreshUser,
  };
}
