"use client";

import { ReactNode } from "react";
import { useAuthContext } from "@/components/AuthProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RouteTransition from "@/components/RouteTransition";
import { Toaster } from "sonner";
import ChatBot from "@/components/ChatBot";

export default function ClientRoot({ children }: { children: ReactNode }) {
  const { isSignedIn, isProfileComplete, isOnboardingComplete } =
    useAuthContext();

  const hideLinks = isSignedIn && !(isProfileComplete && isOnboardingComplete);

  return (
    <>
      <Header hideLinks={hideLinks} />
      <main className="pt-12 min-h-[calc(100vh-theme(spacing.24)-theme(spacing.12))] overflow-x-hidden">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <Footer />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#F9F7F5", // brand base color
            border: "1px solid #E7E3DF", // brand base-dark
            color: "#4A4A4A", // brand neutral
            borderRadius: "0.5rem",
            fontSize: "14px",
            fontWeight: "500",
            padding: "12px 16px",
            fontFamily: "var(--font-family-sans)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          },
        }}
        theme="light"
        richColors={false}
        closeButton={true}
        expand={true}
        visibleToasts={5}
      />
      <ChatBot />
    </>
  );
}
