"use client";

import { ReactNode } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RouteTransition from "@/components/RouteTransition";
import { Toaster } from "sonner";
import ChatBot from "@/components/ChatBot";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useOneSignal } from "@/hooks/useOneSignal";

export default function ClientRoot({ children }: { children: ReactNode }) {
  const { isSignedIn, isProfileComplete, isOnboardingComplete } =
    useAuthContext();

  // Wire OneSignal registration for signed-in users
  useOneSignal();

  const hideLinks = isSignedIn && !(isProfileComplete && isOnboardingComplete);

  return (
    <>
      <Header hideLinks={hideLinks} />
      <main
        id="main-content"
        className="pt-12 min-h-[calc(100vh-theme(spacing.24)-theme(spacing.12))] overflow-x-hidden"
        tabIndex={-1}
      >
        <ErrorBoundary>
          <RouteTransition>{children}</RouteTransition>
        </ErrorBoundary>
      </main>
      <Footer />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(255, 255, 255, 0.95)",
            border: "1px solid rgba(231, 227, 223, 0.8)",
            color: "#4A4A4A",
            borderRadius: "0.75rem",
            fontSize: "14px",
            fontWeight: "500",
            padding: "16px 20px",
            fontFamily: "var(--font-family-sans)",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.15)",
            backdropFilter: "blur(10px)",
          },
        }}
        theme="light"
        richColors={false}
        closeButton={true}
        expand={true}
        visibleToasts={5}
        aria-live="polite"
      />
      <ChatBot />
    </>
  );
}
