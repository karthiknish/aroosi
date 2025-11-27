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
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn("flex justify-start py-1", className)}
    >
      <div className="px-4 py-3 rounded-[20px] rounded-bl-[4px] bg-white border border-slate-200 shadow-sm flex items-center gap-1.5 min-h-[42px]">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-slate-400 rounded-full"
            animate={{
              y: [0, -5, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
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