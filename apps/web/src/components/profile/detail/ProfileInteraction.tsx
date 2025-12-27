"use client";

import React from "react";
import { Heart, HeartOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileInteractionProps {
  interestState: {
    interestStatusData: any;
    loadingInterestStatus: boolean;
    alreadySentInterest: boolean;
    handleToggleInterest: () => void;
    showHeartPop: boolean;
    mutationPending: boolean;
  };
  canInteract: boolean;
  isOwnProfile: boolean;
}

const buttonVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 20 },
  },
  tap: { scale: 0.92 },
};

const heartPopVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: [0, 1.4, 1],
    opacity: [0, 0.8, 0],
    transition: { duration: 0.6, times: [0, 0.3, 1] },
  },
};

export function ProfileInteraction({
  interestState,
  canInteract,
  isOwnProfile,
}: ProfileInteractionProps) {
  const {
    interestStatusData,
    loadingInterestStatus,
    alreadySentInterest,
    handleToggleInterest,
    showHeartPop,
    mutationPending,
  } = interestState;

  if (isOwnProfile || !canInteract) return null;

  const isMatched = ["mutual", "accepted"].includes(interestStatusData?.status || "");

  if (isMatched) {
    return (
      <div className="flex items-center gap-2 px-6 py-3 bg-success text-white rounded-full shadow-lg font-semibold animate-in fade-in zoom-in duration-300">
        <svg
          className="w-6 h-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span>You Matched!</span>
      </div>
    );
  }

  return (
    <div className="relative flex justify-center py-4">
      <AnimatePresence mode="wait">
        {loadingInterestStatus ? (
          <div className="flex items-center justify-center">
            <Skeleton className="w-16 h-16 rounded-full" />
          </div>
        ) : (
          <motion.button
            key={alreadySentInterest ? "withdraw" : "express"}
            className={`flex items-center justify-center rounded-full p-6 shadow-xl transition-all font-nunito text-lg font-semibold ${
              alreadySentInterest
                ? "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                : "bg-primary hover:bg-primary-dark text-white shadow-primary/30"
            }`}
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            whileTap="tap"
            onClick={handleToggleInterest}
            disabled={mutationPending}
            title={alreadySentInterest ? "Withdraw Interest" : "Express Interest"}
          >
            {mutationPending ? (
              <svg className="w-10 h-10 animate-spin text-current" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            ) : alreadySentInterest ? (
              <HeartOff className="w-10 h-10 fill-primary" />
            ) : (
              <Heart className="w-10 h-10 fill-white" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Heart pop animation overlay */}
      <AnimatePresence>
        {showHeartPop && (
          <motion.div
            key="heart-pop"
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            variants={heartPopVariants}
            initial="initial"
            animate="animate"
            exit="initial"
          >
            <Heart className="w-24 h-24 text-primary fill-primary" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
