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
          className: "aroosi-toast",
          style: {
            background: "hsl(var(--neutral-dark) / 0.95)",
            color: "hsl(var(--base-light))",
            border: "1px solid hsl(var(--base-light) / 0.1)",
            borderRadius: "1rem",
            fontSize: "14px",
            fontWeight: "500",
            padding: "16px 20px",
            fontFamily: "var(--font-family-sans)",
            boxShadow:
              "0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)",
          },
        }}
        theme="dark"
        richColors={true}
        closeButton={true}
        expand={true}
        visibleToasts={5}
        gap={12}
        aria-live="polite"
      />
      <ChatBot />
    </>
  );
}
