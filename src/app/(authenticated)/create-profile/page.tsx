"use client";

import ProfileForm from "@/components/profile/ProfileForm";
import Link from "next/link";

export default function CreateProfilePage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white p-4 pt-24 sm:pt-28 md:pt-32">
      <main className="w-full max-w-2xl space-y-8 bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-2xl">
        <div className="text-center">
          <Link
            href="/"
            className="inline-block mb-4 text-4xl sm:text-5xl font-serif font-bold text-pink-600 hover:text-pink-700 transition-colors"
          >
            Aroosi
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-800">
            Create Your Profile
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Tell us a bit about yourself to get started. The more you share, the
            better your matches!
          </p>
        </div>
        <ProfileForm
          mode="create"
          onSubmit={async (values) => {
            console.log(values);
          }}
        />
      </main>
    </div>
  );
}
