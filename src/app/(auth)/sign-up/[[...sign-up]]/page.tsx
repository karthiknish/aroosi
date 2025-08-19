"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import Head from "next/head";
export default function SignUpPage() {
  const router = useRouter();
  const { isAuthenticated } = useFirebaseAuth();

  React.useEffect(() => {
    // If user is already authenticated, redirect to search
    if (isAuthenticated) {
      router.push("/search");
      return;
    }

    // Redirect to the onboarding flow
    router.push("/profile/create");
  }, [isAuthenticated, router]);

  return (
    <>
      <Head>
        <title>Sign Up | Aroosi</title>
        <meta
          name="description"
          content="Create your Aroosi account and start your Afghan matrimony journey. Sign up to find your perfect match."
        />
        <meta property="og:title" content="Sign Up | Aroosi" />
        <meta
          property="og:description"
          content="Create your Aroosi account and start your Afghan matrimony journey. Sign up to find your perfect match."
        />
        <meta property="og:image" content="/logo.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Sign Up | Aroosi" />
        <meta
          name="twitter:description"
          content="Create your Aroosi account and start your Afghan matrimony journey. Sign up to find your perfect match."
        />
        <meta name="twitter:image" content="/logo.png" />
      </Head>
      <div className="min-h-screen w-full overflow-y-hidden py-12 bg-base-light flex items-center justify-center relative overflow-x-hidden">
        {/* Decorative elements matching sign-in page */}
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md mx-auto text-center">
          <div className="bg-white/90 rounded-2xl shadow-xl p-8">
            <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
            <p className="mb-4">
              We&apos;re redirecting you to complete your profile.
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        </div>
      </div>
    </>
  );
}