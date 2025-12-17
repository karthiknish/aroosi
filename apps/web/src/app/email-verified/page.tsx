import React from "react";
import Link from "next/link";

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
          <Link href="/search" className="inline-flex justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-base-light shadow hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors">
            Find Matches
          </Link>
          <Link href="/profile" className="inline-flex justify-center rounded-md border border-neutral/20 px-5 py-2.5 text-sm font-medium text-neutral-dark bg-base-light hover:bg-neutral/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors">
            View Profile
          </Link>
        </div>
      </div>
    </main>
  );
}
