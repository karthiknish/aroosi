"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface TypingIndicatorProps {
  userName?: string;
  avatarUrl?: string;
  className?: string;
}

export function TypingIndicator({ userName = "Someone", avatarUrl, className }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn("flex justify-start", className)}
    >
      <div className="max-w-[280px] px-4 py-3 rounded-2xl rounded-bl-md bg-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={userName} />
            ) : (
              <AvatarFallback>{userName[0]}</AvatarFallback>
            )}
          </Avatar>
          <span className="text-xs text-gray-500">{userName} is typing</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}