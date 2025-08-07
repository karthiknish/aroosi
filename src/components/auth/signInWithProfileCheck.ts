import { getCurrentUserWithProfile } from "@/lib/profile/userProfileApi";

/**
 * Non-hook util that performs sign-in by calling the provided `signIn` function
 * and then verifies that a user profile exists via the API.
 *
 * Centralized HTTP client auto-attaches Authorization using tokenStorage,
 * so no manual token retrieval is required here.
 *
 * NOTE: We cannot use React hooks here. The caller must pass a `signIn` function
 * obtained from the AuthProvider (e.g., const { signIn } = useAuth()).
 */
export async function signInWithProfileCheck(
  email: string,
  password: string,
  opts: {
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  }
) {
  const { signIn } = opts;

  // 1) Perform sign-in using AuthProvider. This will persist tokens via tokenStorage.
  const result = await signIn(email, password);
  if (!result.success) return result;

  // 2) Immediately verify profile using centralized client (auto Authorization header).
  const profileRes = await getCurrentUserWithProfile();
  if (!profileRes.success || !profileRes.data) {
    return {
      success: false,
      error: "No profile found for this account. Please create a profile first.",
    };
  }

  return result;
}
