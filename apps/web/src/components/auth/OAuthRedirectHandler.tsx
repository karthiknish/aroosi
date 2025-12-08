"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

export default function OAuthRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider");

  useEffect(() => {
    const handleOAuth = async () => {
      if (provider) {
        try {
          // Validate provider
          const validProviders = ["google", "github", "facebook", "linkedin"];
          if (!validProviders.includes(provider)) {
            router.push("/sign-in?error=invalid_provider");
            return;
          }
          
          // For now, redirect to sign-in with an error since we're removing Clerk
          router.push(`/sign-in?error=oauth_not_supported&provider=${provider}`);
        } catch (error) {
          console.error("OAuth error:", error);
          router.push("/sign-in?error=oauth_failed");
        }
      } else {
        router.push("/sign-in?error=missing_provider");
      }
    };

    handleOAuth();
  }, [router, provider]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Redirecting to OAuth Provider</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-600 mt-4">Please wait while we redirect you to the authentication provider...</p>
      </div>
    </div>
  );
}