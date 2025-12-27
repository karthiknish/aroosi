import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Email Verified - Aroosi" };

export default function EmailVerifiedPage() {
  return (
    <main id="main-content" className="min-h-screen pt-28 pb-16 px-4 flex flex-col items-center text-center bg-base-light">
      <div className="max-w-lg w-full bg-base-light p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-semibold mb-4 text-neutral-dark">Email Verified ✅</h1>
        <p className="text-neutral-light mb-6 text-sm leading-relaxed">
          Your email address has been successfully verified. You now have full access to all Aroosi features.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="px-5 py-2.5">
            <Link href="/search">
              Find Matches
            </Link>
          </Button>
          <Button asChild variant="outline" className="px-5 py-2.5">
            <Link href="/profile">
              View Profile
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
