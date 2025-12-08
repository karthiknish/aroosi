"use client";

import { ReactNode, useEffect } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RouteTransition from "@/components/RouteTransition";
import { Toaster } from "sonner";
import ChatBot from "@/components/ChatBot";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useOneSignal } from "@/hooks/useOneSignal";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import BackToTop from "@/components/BackToTop";
import { OfflineBanner } from "@/components/ui/offline-banner";

export default function ClientRoot({ children }: { children: ReactNode }) {
  const { profile } = useAuthContext();
  useEffect(() => {
    try {
      if (profile?.banned === true && typeof window !== "undefined") {
        if (!window.location.pathname.startsWith("/banned")) {
          window.location.replace("/banned");
        }
      }
    } catch {}
  }, [profile?.banned]);

  // Wire OneSignal registration for signed-in users
  useOneSignal();

  const hideLinks = false; // onboarding gating removed

  return (
    <>
      <Header hideLinks={!!profile?.banned || hideLinks} />
      <OfflineBanner variant="banner" dismissible={false} />
      <main
        id="main-content"
        className="pt-16 min-h-[calc(100vh-theme(spacing.24)-theme(spacing.16))] overflow-x-hidden"
        tabIndex={-1}
      >
        <VerifyEmailBanner />
        <ErrorBoundary>
          <RouteTransition>{children}</RouteTransition>
        </ErrorBoundary>
      </main>
      <Footer />
      <BackToTop />
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
