import { getCurrentUserWithProfile } from "@/lib/profile/userProfileApi";
import { auth } from "@/lib/firebase";

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
    signIn: (creds: {
      email: string;
      password: string;
    }) => Promise<{ success: boolean; error?: string }>;
  }
) {
  const { signIn } = opts;
  const result = await signIn({ email, password });
  if (!result.success) return result;

  const currentUser = auth.currentUser;
  const userId = currentUser?.uid || "";
  const profileRes = await getCurrentUserWithProfile(userId);
  if (!profileRes.success || !profileRes.data) {
    return {
      success: false,
      error:
        "No profile found for this account. Please create a profile first.",
    };
  }

  return result;
}
