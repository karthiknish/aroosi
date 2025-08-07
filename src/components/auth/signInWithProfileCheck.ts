import { getCurrentUserWithProfile } from "@/lib/profile/userProfileApi";

/**
 * Non-hook util that performs sign-in by calling the provided `signIn` function
 * and then verifies that a user profile exists via the API.
 *
 * NOTE: We cannot use React hooks here. The caller must pass a `signIn` function
 * obtained from the AuthProvider (e.g., const { signIn } = useAuth()) and a
 * token getter (or rely on localStorage fallback).
 */
export async function signInWithProfileCheck(
  email: string,
  password: string,
  opts: {
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    getToken?: () => Promise<string | null>;
  }
) {
  const { signIn, getToken } = opts;

  const result = await signIn(email, password);
  if (!result.success) return result;

  // After successful sign-in, get token either from provided getter or fallback to localStorage
  let token: string | null = null;
  try {
    token = getToken ? await getToken() : null;
  } catch {
    // ignore and fallback to localStorage
  }
  if (!token) {
    try {
      token = typeof window !== "undefined" ? localStorage.getItem("auth-token") : null;
    } catch {
      token = null;
    }
  }

  if (!token) return { success: false, error: "Authentication failed" };

  // getCurrentUserWithProfile now uses the centralized client and takes no token arg
  const profileRes = await getCurrentUserWithProfile();
  if (!profileRes.success || !profileRes.data) {
    return {
      success: false,
      error:
        "No profile found for this account. Please create a profile first.",
    };
  }
  return result;
}
