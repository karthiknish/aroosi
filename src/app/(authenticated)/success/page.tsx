// POTENTIAL ISSUES IN YOUR SUCCESS PAGE:

// 1. CSS Classes might not exist or have zero height
// 2. No auth check - user might be getting redirected by auth middleware
// 3. No loading state while confetti loads
// 4. No error boundaries
// 5. Confetti might be blocking UI rendering

// IMPROVED VERSION WITH DEBUG LOGGING:

"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/AuthProvider"; // Add auth check

// Dynamically import react-confetti to avoid SSR issues
const Confetti = dynamic(() => import("react-confetti"), {
  ssr: false,
  loading: () => null, // Prevent loading spinner from blocking UI
});

export default function ProfileCreationSuccessPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading, isLoaded } = useAuth(); // Add auth context

  // Track viewport size for confetti dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("Success page mounted");
    console.log("Auth state:", { isAuthenticated, user, isLoading, isLoaded });
    return () => console.log("Success page unmounted");
  }, [isAuthenticated, user, isLoading, isLoaded]);

  useEffect(() => {
    function updateSize() {
      const newDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      console.log("Dimensions updated:", newDimensions);
      setDimensions(newDimensions);
      setShowConfetti(true); // Enable confetti after dimensions are set
    }

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Auth check - prevent redirect loops
  useEffect(() => {
    // Use isLoaded instead of !isLoading as per your AuthProvider pattern
    if (isLoaded && !isAuthenticated) {
      console.log("User not authenticated, redirecting to signin");
      router.push("/sign-in"); // Your signOut uses "/sign-in", so keep consistent
    }
  }, [isAuthenticated, isLoaded, router]);

  // Show loading state while auth is checking
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center relative overflow-hidden bg-white">
      {/* Debug info - remove in production */}
      <div className="absolute top-4 left-4 text-xs text-gray-500 z-20">
        Auth: {isAuthenticated ? "✓" : "✗"} | Loaded: {isLoaded ? "✓" : "✗"} |
        User: {user?.id ? "✓" : "✗"} | Dims: {dimensions.width}x
        {dimensions.height} | Confetti: {showConfetti ? "✓" : "✗"}
      </div>

      {/* Confetti - only show when ready */}
      {showConfetti && dimensions.width > 0 && dimensions.height > 0 && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          numberOfPieces={250}
          recycle={false}
        />
      )}

      {/* Main content with explicit colors and sizes */}
      <div className="z-10 max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-pink-600 mb-6">
          🎉 Profile Created!
        </h1>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          Your profile has been successfully created. You can now start browsing
          and connecting with other members.
        </p>
        <Button
          className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 text-lg font-semibold rounded-lg"
          onClick={() => {
            console.log("Start Exploring clicked");
            router.push("/search");
          }}
        >
          Start Exploring
        </Button>
      </div>

      {/* Fallback content in case of styling issues */}
      <style jsx>{`
        .min-h-screen {
          min-height: 100vh !important;
        }
      `}</style>
    </div>
  );
}
