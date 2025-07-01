"use client";

import { motion } from "framer-motion";
import { useAuthContext } from "@/components/AuthProvider";
import { CustomSignInForm } from "@/components/auth/CustomSignInForm";
import { useSignIn, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

export default function SignInPage() {
  const { isProfileComplete, isOnboardingComplete } = useAuthContext();
  const needsWizard = !isProfileComplete || !isOnboardingComplete;
  const finalRedirect = needsWizard ? "/" : "/search";

  const router = useRouter();
  const { isSignedIn } = useUser();
  const { signIn } = useSignIn();

  const handleGoogleSignIn = async () => {
    try {
      const res = await signIn?.create({
        strategy: "oauth_google",
        redirectUrl: "/oauth/callback",
        actionCompleteRedirectUrl: finalRedirect,
      });

      let authUrl: string | undefined;
      const maybeObj: unknown = res;
      if (
        typeof maybeObj === "object" &&
        maybeObj !== null &&
        "externalAccount" in maybeObj &&
        typeof (maybeObj as { externalAccount: unknown }).externalAccount ===
          "object" &&
        (maybeObj as { externalAccount: { data?: unknown } }).externalAccount
          .data !== null &&
        typeof (
          (
            maybeObj as {
              externalAccount: { data: { authorization_url?: unknown } };
            }
          ).externalAccount.data as { authorization_url?: unknown }
        ).authorization_url === "string"
      ) {
        authUrl = (
          maybeObj as {
            externalAccount: { data: { authorization_url: string } };
          }
        ).externalAccount.data.authorization_url;
      }
      if (authUrl) {
        window.open(authUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Google sign-in error", err);
    }
  };

  // redirect after sign-in
  if (isSignedIn) {
    router.push(finalRedirect);
    return null;
  }

  return (
    <div className="w-full overflow-y-hidden py-12 bg-base-light flex items-center justify-center relative overflow-x-hidden">
      {/* Decorative color pop circles */}
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      {/* Subtle SVG background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
        style={{
          backgroundImage: `url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")`,
        }}
      ></div>
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block relative mb-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary mb-2">
              Sign In
            </h1>
            {/* Pink wavy SVG underline */}
            <svg
              className="absolute -bottom-2 left-0 w-full"
              height="6"
              viewBox="0 0 200 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 3C50 0.5 150 0.5 200 3"
                stroke="#FDA4AF"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white/90 rounded-2xl shadow-xl p-8"
        >
          <div className="space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-2"
              variant="outline"
            >
              <GoogleIcon className="h-5 w-5" />
              <span>Continue with Google</span>
            </Button>
            <CustomSignInForm onComplete={() => router.push(finalRedirect)} />
          </div>
          <p className="text-center text-sm mt-4">
            <a
              href="/forgot-password"
              className="text-pink-600 hover:text-pink-700 underline"
            >
              Forgot password?
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
