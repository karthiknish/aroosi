"use client";

import { CustomForgotPasswordForm } from "@/components/auth/CustomForgotPasswordForm";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { signIn, isLoaded: signInLoaded } = useSignIn();

  const handleGoogle = async () => {
    if (!signInLoaded || !signIn) return;
    try {
      const res = await signIn.create({
        strategy: "oauth_google",
        redirectUrl: "/oauth/callback",
        actionCompleteRedirectUrl: "/",
      });
      // minimal authUrl extraction reused from prior pages
      const hasExtUrl = (
        v: unknown
      ): v is { externalVerificationRedirectURL?: string } =>
        typeof v === "object" &&
        v !== null &&
        "externalVerificationRedirectURL" in v;
      let authUrl: string | undefined;
      if (hasExtUrl(res) && res.externalVerificationRedirectURL) {
        authUrl = res.externalVerificationRedirectURL;
      }
      if (authUrl) window.open(authUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Google reset password error", err);
    }
  };

  return (
    <div className="w-full overflow-y-hidden py-12 bg-base-light flex items-center justify-center relative overflow-x-hidden">
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block relative mb-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary mb-2">
              Reset Password
            </h1>
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
              onClick={handleGoogle}
              className="w-full bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 flex items-center justify-center space-x-2"
              variant="outline"
              disabled={!signInLoaded}
            >
              <GoogleIcon className="h-5 w-5" />
              <span>Continue with Google</span>
            </Button>
            <CustomForgotPasswordForm
              onComplete={() => router.push("/sign-in")}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
