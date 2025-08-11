"use client";

import { useSignUp, useSignIn } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerkAuth } from "@/components/ClerkAuthProvider";

export default function SSOCallback() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();
  const { refreshUser } = useClerkAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const handleSSOCallback = async () => {
      try {
        // Check if there's a signup attempt in progress
        if (signUp && 'status' in signUp && signUp.status === "complete" && 'createdSessionId' in signUp && signUp.createdSessionId) {
          // If signup is complete, set the session active
          await setActive?.({ session: signUp.createdSessionId });
          // Refresh user data in our context
          await refreshUser();
          // Redirect to home or dashboard
          router.push("/");
          return;
        }

        // Check if there's a signin attempt in progress
        if (signIn && 'status' in signIn && signIn.status === "complete" && 'createdSessionId' in signIn && signIn.createdSessionId) {
          // If signin is complete, set the session active
          await setActive?.({ session: signIn.createdSessionId });
          // Refresh user data in our context
          await refreshUser();
          // Redirect to home or dashboard
          router.push("/");
          return;
        }

        // Handle the OAuth callback
        const redirectUrl = new URL(window.location.href).searchParams.get("redirect_url");
        
        // Try to complete the sign in flow
        await signIn?.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: redirectUrl || "/",
        });

        // The redirect will happen automatically, so we don't need to check the result
        return;

        // Try to complete the sign up flow
        await signUp?.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: redirectUrl || "/",
        });

        // The redirect will happen automatically, so we don't need to check the result
        return;
      } catch (err) {
        console.error("SSO callback error:", err);
        setError("Authentication failed. Please try again.");
      }
    };

    handleSSOCallback();
  }, [isLoaded, signUp, signIn, setActive, router, refreshUser]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/sign-in")}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Completing Authentication</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-600 mt-4">Please wait while we complete your authentication...</p>
      </div>
    </div>
  );
}