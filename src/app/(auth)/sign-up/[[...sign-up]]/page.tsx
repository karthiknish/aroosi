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
        <title>Sign Up | Aroosi Afghan Matrimony</title>
        <meta
          name="description"
          content="Join Aroosi, the trusted Afghan matrimony platform. Create your free account and start finding meaningful connections with verified Afghan singles worldwide."
        />
        <meta
          name="keywords"
          content="signup aroosi, join afghan matrimony, create account, afghan dating, muslim marriage, halal dating, afghan singles, matrimonial registration"
        />
        <link rel="canonical" href="https://aroosi.app/sign-up" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aroosi.app/sign-up" />
        <meta property="og:title" content="Sign Up | Aroosi Afghan Matrimony" />
        <meta
          property="og:description"
          content="Join Aroosi, the trusted Afghan matrimony platform. Create your free account and start finding meaningful connections."
        />
        <meta property="og:image" content="https://aroosi.app/og-signup.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Join Aroosi - Afghan Matrimony Platform" />
        <meta property="og:site_name" content="Aroosi" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://aroosi.app/sign-up" />
        <meta property="twitter:title" content="Sign Up | Aroosi Afghan Matrimony" />
        <meta
          property="twitter:description"
          content="Join Aroosi, the trusted Afghan matrimony platform. Create your free account and start finding meaningful connections."
        />
        <meta property="twitter:image" content="https://aroosi.app/og-signup.png" />
        <meta property="twitter:site" content="@aroosiapp" />
        <meta property="twitter:creator" content="@aroosiapp" />

        {/* Additional SEO */}
        <meta name="robots" content="noindex, follow" /> {/* Don't index auth pages */}
        <meta name="author" content="Aroosi Team" />
        <meta name="geo.region" content="GLOBAL" />
        <meta name="geo.placename" content="Worldwide" />
        <meta name="geo.position" content="0;0" />
        <meta name="ICBM" content="0, 0" />

        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "Aroosi Sign Up",
              url: "https://aroosi.app/sign-up",
              description: "Sign up page for Aroosi Afghan matrimony platform",
              isPartOf: {
                "@type": "WebSite",
                name: "Aroosi",
                url: "https://aroosi.app",
              },
            }),
          }}
        />
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