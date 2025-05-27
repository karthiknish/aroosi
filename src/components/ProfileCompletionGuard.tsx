"use client";

import { ReactNode, useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Profile } from "@/types/profile";

interface ProfileCompletionGuardProps {
  children: ReactNode;
}

const publicPaths = [
  "/sign-in",
  "/sign-up",
  "/terms",
  "/privacy",
  "/about",
  "/contact",
  "/faq",
];
// Clerk paths are typically handled by Clerk's middleware or components, but good to be aware.
// Add any other public marketing pages or API routes that shouldn't be guarded.
const profileSetupPath = "/profile";

export default function ProfileCompletionGuard({
  children,
}: ProfileCompletionGuardProps) {
  const { isSignedIn, isLoaded: isClerkLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // State for profile data and loading
  const [profileData, setProfileData] = useState<Profile | undefined>(
    undefined
  );
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function fetchProfile() {
      if (!isClerkLoaded || !isSignedIn) {
        setProfileData(undefined);
        setIsProfileLoading(false);
        return;
      }
      setIsProfileLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          setProfileData(undefined);
          setIsProfileLoading(false);
          return;
        }
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        if (!ignore) {
          setProfileData(data);
          setIsProfileLoading(false);
        }
      } catch (e: unknown) {
        console.error(e);
        if (!ignore) {
          setProfileData(undefined);
          setIsProfileLoading(false);
        }
      }
    }
    fetchProfile();
    return () => {
      ignore = true;
    };
  }, [isClerkLoaded, isSignedIn, getToken]);

  const isProfileComplete = profileData?.isProfileComplete; // TODO: fix this
  const isProfileQueryLoading = isProfileLoading;

  useEffect(() => {
    if (!isClerkLoaded) {
      // Clerk is still loading, don't do anything yet
      return;
    }

    if (isSignedIn) {
      if (isProfileQueryLoading) {
        // Profile data is still loading, wait
        return;
      }

      if (isProfileComplete === false) {
        // Profile is incomplete
        if (
          pathname !== profileSetupPath &&
          !publicPaths.some((p) => pathname.startsWith(p))
        ) {
          // User is signed in, profile incomplete, and not on profile page or a public path
          router.replace(profileSetupPath);
        }
      }
      // If isProfileComplete is true or undefined (error/no profile yet, but handled on profile page),
      // allow access or let other logic handle it.
    } else {
      // User is not signed in. Clerk's <SignedIn> / <SignedOut> or middleware should handle public/private routes.
      // This guard focuses on *profile completion* for signed-in users.
    }
  }, [
    isClerkLoaded,
    isSignedIn,
    isProfileQueryLoading,
    isProfileComplete,
    pathname,
    router,
  ]);

  // Render a loading state while Clerk or the profile query is loading for a signed-in user
  // to prevent flashing content or incorrect redirects.
  if (!isClerkLoaded || (isSignedIn && isProfileQueryLoading)) {
    // Avoid showing full page loader if already on a public path or profile path,
    // as those pages have their own content/loading states.
    if (
      pathname !== profileSetupPath &&
      !publicPaths.some((p) => pathname.startsWith(p))
    ) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="h-12 w-12 animate-spin text-pink-600" />
        </div>
      );
    }
  }

  // If user is signed in, profile is incomplete, and they are trying to access a guarded page,
  // they will be redirected by the useEffect. Showing null here prevents brief flash of content.
  if (
    isSignedIn &&
    isProfileComplete === false &&
    pathname !== profileSetupPath &&
    !publicPaths.some((p) => pathname.startsWith(p))
  ) {
    return null;
  }

  return <>{children}</>;
}
