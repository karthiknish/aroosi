import { getCurrentUserWithProfile } from "@/lib/api/profile";
import { useAuth } from "@/components/AuthProvider";

export async function signInWithProfileCheck(email: string, password: string) {
  const { signIn } = useAuth();
  const result = await signIn(email, password);
  if (!result.success) return result;

  // After successful sign-in, check for profile
  const token = localStorage.getItem("auth-token");
  if (!token) return { success: false, error: "Authentication failed" };
  const profileRes = await getCurrentUserWithProfile(token);
  if (!profileRes.success || !profileRes.data) {
    return { success: false, error: "No profile found for this account. Please create a profile first." };
  }
  return result;
}
