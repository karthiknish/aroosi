"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/**
 * RouteLoader shows a thin progress bar and a centered spinner during route
 * transitions. It uses a simple timer-based heuristic: when the pathname
 * changes we show the loader for a short period. This is intentionally
 * lightweight and avoids tight coupling with framework internals.
 */
export default function RouteLoader() {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    // Ignore initial mount
    if (prev.current === null) {
      prev.current = pathname;
      return;
    }
    if (prev.current !== pathname) {
      prev.current = pathname;
      setLoading(true);
      // Show loader for at least 600ms and at most 2500ms
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setLoading(false), 1200);
    }
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [pathname]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="route-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none"
        >
          {/* Top progress bar */}
          <div className="absolute left-0 right-0 top-2 h-1 z-50 overflow-hidden">
            <motion.div
              className="h-1 bg-accent"
              initial={{ width: "0%" }}
              animate={{ width: ["0%", "60%", "90%"] }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
          </div>

          {/* Center spinner */}
          <div className="mt-12 rounded-full bg-black/40 p-3 pointer-events-auto">
            <LoadingSpinner size={28} colorClassName="text-white" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
