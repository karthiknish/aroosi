"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { Suspense } from 'react';
import Loading from './loading';

export const dynamic = 'force-dynamic';

function SSOCallbackContent() {
  const { refreshUser } = useFirebaseAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSSOCallback = async () => {
      try {
        // Get redirect URL from query params or use defaults
        const redirectUrl = searchParams.get("redirect_url");
        const defaultRedirect = "/search";
        
        // For now, redirect to sign-in with an error since we're removing Clerk
        router.push(`/sign-in?error=sso_not_supported&redirect_url=${encodeURIComponent(redirectUrl || defaultRedirect)}`);
        
        return;
      } catch (err) {
        console.error("SSO callback error:", err);
        setError("Authentication failed. Please try again.");
      }
    };

    handleSSOCallback();
  }, [router, refreshUser, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Authentication Error
          </h1>
          <p className="text-neutral-600 mb-4">{error}</p>
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
        <h1 className="text-2xl font-bold text-neutral-800 mb-4">
          Completing Authentication
        </h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-neutral-600 mt-4">
          Please wait while we complete your authentication...
        </p>
      </div>
    </div>
  );
}

export default function SSOCallback() {
  return (
    <Suspense fallback={<Loading />}>
      <SSOCallbackContent />
    </Suspense>
  );
}