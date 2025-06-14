"use client";

import { SignIn, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 px-4">
      <ClerkLoading>
        <LoadingSpinner size={32} />
      </ClerkLoading>
      <ClerkLoaded>
        <SignIn
          path="/forgot-password"
          routing="path"
          signUpUrl="/sign-up"
          redirectUrl="/"
          appearance={{ variables: { colorPrimary: "#BFA67A" } }}
        />
      </ClerkLoaded>
    </div>
  );
}
