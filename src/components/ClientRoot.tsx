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
      <Toaster position="bottom-right" />
      <ChatBot />
    </>
  );
}
