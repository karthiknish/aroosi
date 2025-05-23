"use client";

import React from "react";
import Header from "./Header"; // Assuming Header.tsx is in the same directory
import Footer from "./Footer"; // Assuming Footer.tsx is in the same directory

interface MainLayoutContentProps {
  children: React.ReactNode;
}

export default function MainLayoutContent({
  children,
}: MainLayoutContentProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow py-8">
        {/* Added some basic styling for the main content area */}
        {children}
      </main>
      <Footer />
    </div>
  );
}
