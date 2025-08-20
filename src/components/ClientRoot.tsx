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
  const { isSignedIn } = useAuthContext();

  // Wire OneSignal registration for signed-in users
  useOneSignal();

  const hideLinks = false; // onboarding gating removed

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
            background: "rgba(20,20,20,0.85)",
            color: "#f5f5f5",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.75rem",
            fontSize: "14px",
            fontWeight: "500",
            padding: "14px 18px",
            fontFamily: "var(--font-family-sans)",
            boxShadow:
              "0 4px 14px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.35)",
            backdropFilter: "blur(8px)",
          },
        }}
        theme="dark"
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
