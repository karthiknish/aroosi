"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";

interface MessageSearchOverlayProps {
  showSearch: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setShowSearch: (show: boolean) => void;
  searchResults: any[];
  currentSearchIndex: number;
  navigateSearch: (direction: "next" | "prev") => void;
}

export function MessageSearchOverlay({
  showSearch,
  searchQuery,
  setSearchQuery,
  setShowSearch,
  searchResults,
  currentSearchIndex,
  navigateSearch,
}: MessageSearchOverlayProps) {
  return (
    <AnimatePresence>
      {showSearch && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 py-3 border-b border-neutral/10 bg-gradient-to-r from-white/95 via-[#FEFCFA]/95 to-white/95 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 bg-neutral/5 rounded-xl px-3 py-2 border border-neutral/20">
            <Search className="w-4 h-4 text-neutral-light" />
            <input
              type="text"
              placeholder="Search in conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder-neutral-light text-neutral"
              autoFocus
              aria-label="Search through conversation messages"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  navigateSearch("next");
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setShowSearch(false);
                  setSearchQuery("");
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  navigateSearch("prev");
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  navigateSearch("next");
                }
              }}
            />
            {searchQuery && (
              <div className="flex items-center gap-1.5 text-xs text-neutral-light">
                {searchResults.length > 0 && (
                  <span aria-live="polite" className="font-medium">
                    {currentSearchIndex + 1}/{searchResults.length}
                  </span>
                )}
                <button
                  onClick={() => navigateSearch("prev")}
                  className="p-1.5 hover:bg-neutral/10 rounded-lg transition-colors"
                  disabled={searchResults.length <= 1}
                  aria-label="Previous search result"
                  title="Previous (↑)"
                >
                  ↑
                </button>
                <button
                  onClick={() => navigateSearch("next")}
                  className="p-1.5 hover:bg-neutral/10 rounded-lg transition-colors"
                  disabled={searchResults.length <= 1}
                  aria-label="Next search result"
                  title="Next (↓)"
                >
                  ↓
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="p-1.5 hover:bg-neutral/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-neutral-light" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
