"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import react-confetti to avoid SSR issues
const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

export default function ProfileCreationSuccessPage() {
  const router = useRouter();

  // Track viewport size for confetti dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function updateSize() {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center relative overflow-hidden">
      {/* Confetti */}
      {dimensions.width > 0 && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          numberOfPieces={250}
          recycle={false}
        />
      )}

      <h1 className="text-3xl font-bold text-primary mb-4 z-10">
        Profile Created!
      </h1>
      <p className="text-muted-foreground max-w-md mb-8 z-10">
        Your profile has been successfully created. You can now start browsing
        and connecting with other members.
      </p>
      <Button className="z-10" onClick={() => router.push("/search")}>
        Start Exploring
      </Button>
    </div>
  );
}
