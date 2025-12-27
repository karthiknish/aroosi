"use client";

import React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileGalleryProps {
  imagesToShow: string[];
  currentImageIdx: number;
  setCurrentImageIdx: (idx: number | ((prev: number) => number)) => void;
  fullName?: string;
}

const imageVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } },
};

const galleryImageVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.1 + i * 0.07,
      duration: 0.35,
      type: "spring" as const,
    },
  }),
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

export function ProfileGallery({
  imagesToShow,
  currentImageIdx,
  setCurrentImageIdx,
  fullName,
}: ProfileGalleryProps) {
  const imagesKey = imagesToShow.join(",");
  const mainProfileImageUrl = imagesToShow.length > 0 ? imagesToShow[currentImageIdx] : undefined;

  return (
    <div className="space-y-6">
      <div className="relative w-full aspect-[4/5] md:aspect-[4/3] md:max-h-[520px] overflow-hidden rounded-t-3xl md:rounded-none">
        <AnimatePresence mode="wait">
          {mainProfileImageUrl ? (
            <motion.div
              key={`main-image-${imagesKey}-${currentImageIdx}`}
              variants={imageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full h-full"
            >
              {imagesToShow.length > 1 && (
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-base-light/80 hover:bg-base-light rounded-full p-2 shadow transition-all"
                  onClick={() => setCurrentImageIdx((idx) => Math.max(0, idx - 1))}
                  disabled={currentImageIdx === 0}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6 text-neutral" />
                </button>
              )}
              <Image
                src={mainProfileImageUrl || "/placeholder.jpg"}
                alt={fullName ? `${fullName}'s profile image` : "Profile"}
                fill
                className="object-cover object-center select-none"
                priority
                sizes="(max-width: 768px) 100vw, 768px"
              />
              {imagesToShow.length > 1 && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-base-light/80 hover:bg-base-light rounded-full p-2 shadow transition-all"
                  onClick={() => setCurrentImageIdx((idx) => Math.min(imagesToShow.length - 1, idx + 1))}
                  disabled={currentImageIdx === imagesToShow.length - 1}
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6 text-neutral" />
                </button>
              )}
            </motion.div>
          ) : (
            <div className="w-full h-full bg-neutral/10 flex items-center justify-center">
              <Image
                src="/placeholder.jpg"
                alt="Profile placeholder"
                fill
                className="object-cover object-center"
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Thumbnail strip */}
      {imagesToShow.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-6">
          {imagesToShow.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              className={`w-14 h-14 rounded-lg overflow-hidden border transition-all ${
                i === currentImageIdx ? "ring-2 ring-primary scale-105" : "opacity-70 hover:opacity-100"
              }`}
              onClick={() => setCurrentImageIdx(i)}
            >
              <Image
                src={url}
                alt={`Thumbnail ${i + 1}`}
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Mini gallery grid */}
      {imagesToShow.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-6 md:px-10">
          <AnimatePresence>
            {imagesToShow.map((url: string, idx: number) => (
              <motion.div
                key={url}
                className="relative aspect-square"
                custom={idx}
                variants={galleryImageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="relative w-full h-full group overflow-hidden rounded-lg">
                  <Image
                    src={url}
                    alt={`Gallery ${idx + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                    onClick={() => setCurrentImageIdx(idx)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
