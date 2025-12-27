import React from "react";
import { LoadingSpinner } from "./loading-spinner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PageLoaderProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export function PageLoader({
  message = "Loading...",
  className,
  fullScreen = true,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-base-light/50 backdrop-blur-sm z-50",
        fullScreen ? "fixed inset-0" : "w-full h-full min-h-[400px]",
        className
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white shadow-xl border border-neutral/10"
      >
        <div className="relative">
          <LoadingSpinner size={48} colorClassName="text-primary" />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
          />
        </div>
        
        <div className="text-center space-y-1">
          <p className="text-neutral-dark font-bold tracking-tight">{message}</p>
          <div className="flex gap-1 justify-center">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -4, 0],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
                className="w-1.5 h-1.5 bg-primary rounded-full"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
