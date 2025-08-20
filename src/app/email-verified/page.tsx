import React from "react";
import Link from "next/link";

export const metadata = { title: "Email Verified - Aroosi" };

export default function EmailVerifiedPage() {
  return (
    <main id="main-content" className="min-h-screen pt-28 pb-16 px-4 flex flex-col items-center text-center">
      <div className="max-w-lg w-full">
        <h1 className="text-3xl font-semibold mb-4 text-gray-900">Email Verified ✅</h1>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          Your email address has been successfully verified. You now have full access to all Aroosi features.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/search" className="inline-flex justify-center rounded-md bg-pink-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2">
            Find Matches
          </Link>
          <Link href="/profile" className="inline-flex justify-center rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2">
            View Profile
          </Link>
        </div>
      </div>
    </main>
  );
}
