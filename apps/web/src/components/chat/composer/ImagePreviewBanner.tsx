"use client";

import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

interface ImagePreviewBannerProps {
  previewUrl: string | null;
  fileName: string | null;
  error: string | null;
  isUploading: boolean;
  cancelUpload: () => void;
  removePreview: () => void;
}

export function ImagePreviewBanner({
  previewUrl,
  fileName,
  error,
  isUploading,
  cancelUpload,
  removePreview,
}: ImagePreviewBannerProps) {
  return (
    <AnimatePresence>
      {previewUrl && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mt-3 relative inline-flex flex-col gap-1.5 rounded-2xl border border-neutral/20 bg-white p-2.5 shadow-lg max-w-full"
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={fileName || "Selected"}
              className="max-h-56 md:max-h-64 max-w-full h-auto rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={removePreview}
              disabled={isUploading}
              className={cn(
                "absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-neutral shadow ring-1 ring-neutral/10",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
                <div className="flex items-center gap-2 text-white text-xs font-medium">
                  <LoadingSpinner size={14} /> Uploading…
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            {fileName && <span className="truncate text-xs text-neutral-light">{fileName}</span>}
            {isUploading && (
              <Button variant="ghost" size="sm" onClick={cancelUpload} className="h-7 text-xs">
                Cancel
              </Button>
            )}
          </div>
          {error && <div className="text-xs text-danger font-medium">{error}</div>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
