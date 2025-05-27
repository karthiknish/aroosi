import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@clerk/nextjs";
import { Profile } from "@/types/profile";

export default function CreateProfileSuccessPage() {
  const [currentUserProfile, setCurrentUserProfile] = useState<
    { profile: Profile | null } | undefined
  >(undefined);
  const router = useRouter();
  const { width, height } = useWindowSize();
  const { getToken } = useAuth();

  useEffect(() => {
    async function fetchProfile() {
      const token = await getToken();
      if (!token) {
        setCurrentUserProfile({ profile: null });
        return;
      }
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUserProfile(data.profile ? data : { profile: null });
      } else {
        setCurrentUserProfile({ profile: null });
      }
    }
    fetchProfile();
  }, [getToken]);

  useEffect(() => {
    if (currentUserProfile === undefined) return;
    if (!currentUserProfile || !currentUserProfile.profile) {
      router.replace("/create-profile");
    }
  }, [currentUserProfile, router]);

  if (currentUserProfile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>
    );
  }

  if (!currentUserProfile || !currentUserProfile.profile) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-pink-50 via-rose-50 to-white p-4">
      <Confetti
        width={width}
        height={height}
        numberOfPieces={600}
        recycle={false}
        style={{ position: "fixed", top: 0, left: 0, zIndex: 60 }}
      />
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 flex flex-col items-center border-2 border-pink-200 text-pink-700">
        <svg
          className="w-12 h-12 text-pink-500 mb-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4"
          />
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
        <h2 className="text-2xl font-bold text-pink-700 mb-2 text-center">
          Welcome to Aroosi!
        </h2>
        <p className="text-lg text-pink-600 mb-4 text-center">
          Your profile has been created successfully.
          <br />
          We&apos;re excited to have you join our community.
        </p>
        <Button
          className="mt-6 px-6 py-2 rounded bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow"
          onClick={() => router.replace("/search")}
        >
          Start Searching
        </Button>
      </div>
    </div>
  );
}
