"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useFirebaseAuth as useAuth } from "@/components/FirebaseAuthProvider";
import { motion } from "framer-motion";
import { Heart, Sparkles, UserCheck } from "lucide-react";


// Dynamically import react-confetti to avoid SSR issues
const Confetti = dynamic(() => import("react-confetti"), {
  ssr: false,
  loading: () => null,
});

export default function ProfileCreationSuccessPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isLoaded } = useAuth();

  // Track viewport size for confetti dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    function updateSize() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setShowConfetti(true);
    }

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Auth check
  useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoaded, router]);

  // Show loading state while auth is checking
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center relative overflow-hidden bg-gradient-to-br from-primary/5 via-base-light to-accent/5">
      {/* Decorative elements matching sign-in page */}
      <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
      {/* Confetti */}
      {showConfetti && dimensions.width > 0 && dimensions.height > 0 && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          numberOfPieces={300}
          recycle={false}
          gravity={0.1}
        />
      )}

      {/* Main content */}
      <div className="z-10 max-w-lg mx-auto">
        {/* Animated celebration icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2,
          }}
          className="relative mx-auto mb-8 flex items-center justify-center"
        >
          <div className="w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-xl">
            <UserCheck className="text-base-light" size={64} />
          </div>

          {/* Floating sparkles */}
          <motion.div
            animate={{
              y: [-10, 10, -10],
              rotate: [0, 10, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-4 -right-4 text-warning"
          >
            <Sparkles size={24} />
          </motion.div>

          <motion.div
            animate={{
              y: [10, -10, 10],
              rotate: [0, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute -bottom-4 -left-4 text-warning"
          >
            <Sparkles size={24} />
          </motion.div>
        </motion.div>

        {/* Heading with gradient text */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-[1.7]"
        >
          Welcome to Aroosi!
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-neutral text-lg mb-2"
        >
          Your profile has been successfully created
        </motion.p>

        {/* Success message */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-neutral/80 mb-10 leading-relaxed max-w-md mx-auto"
        >
          You&apos;re now part of our community of like-minded individuals.
          Start exploring profiles and connecting with others who share your
          values.
        </motion.p>

        {/* CTA Button with hover effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <Button
            className="bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-accent-dark text-base-light px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            onClick={() => router.push("/search")}
            size="lg"
          >
            <Heart className="mr-2" size={20} />
            Start Exploring
          </Button>
        </motion.div>

        {/* Stats or benefits preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto"
        >
          <div className="bg-base-light/50 backdrop-blur-sm rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-primary">New</div>
            <div className="text-xs text-neutral">Just launched</div>
          </div>
          <div className="bg-base-light/50 backdrop-blur-sm rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-primary">95%</div>
            <div className="text-xs text-neutral">Match Rate</div>
          </div>
          <div className="bg-base-light/50 backdrop-blur-sm rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-primary">24/7</div>
            <div className="text-xs text-neutral">Support</div>
          </div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-24 h-24 rounded-full bg-primary/10 blur-xl"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-accent/10 blur-xl"></div>
      <div className="absolute top-1/3 right-20 w-16 h-16 rounded-full bg-primary/10 blur-lg"></div>
    </div>
    </>
  );
}