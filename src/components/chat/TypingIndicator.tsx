"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  userName?: string;
  avatarUrl?: string;
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("flex justify-start py-1.5", className)}
    >
      <div className="px-5 py-3.5 rounded-2xl rounded-bl-md bg-white shadow-md shadow-neutral-900/5 border border-neutral-100/80 flex items-center gap-2 min-h-[48px]">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-gradient-to-br from-rose-400 to-rose-500 rounded-full"
            animate={{
              y: [0, -6, 0],
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}