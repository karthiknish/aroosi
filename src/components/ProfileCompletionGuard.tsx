"use client";

import { ReactNode, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useProfileCompletion } from "@/components/ProfileCompletionProvider";

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
  const router = useRouter();
  const pathname = usePathname();
  const { isProfileComplete, isLoading: isProfileLoading } =
    useProfileCompletion();

  useEffect(() => {
    if (!isClerkLoaded) return;
    if (!isSignedIn) {
      if (pathname === "/create-profile") {
        router.replace("/sign-in");
      }
      return;
    }
    if (isProfileLoading) return;
    if (isProfileComplete === false) {
      if (
        pathname !== profileSetupPath &&
        !publicPaths.some((p) => pathname.startsWith(p))
      ) {
        router.replace(profileSetupPath);
      }
    }
  }, [
    isClerkLoaded,
    isSignedIn,
    isProfileLoading,
    isProfileComplete,
    pathname,
    router,
  ]);

  // Render a loading state while Clerk or the profile query is loading for a signed-in user
  if (!isClerkLoaded || (isSignedIn && isProfileLoading)) {
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
