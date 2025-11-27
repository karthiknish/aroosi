"use client";

import React from "react";
import { HeroOnboarding } from "@/components/home/HeroOnboarding";
import { motion } from "framer-motion";

export default function ProfileCreatePage() {
  return (
    <>
      <div className="min-h-screen w-full overflow-y-auto py-12 bg-base-light flex items-center justify-center relative overflow-x-hidden">
        {/* Decorative color pop circles */}
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
        {/* Subtle SVG background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        ></div>
        
        <div className="relative z-10 w-full max-w-md mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-block relative mb-4">
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-primary mb-2">
                Create Profile
              </h1>
              {/* Pink wavy SVG underline */}
              <svg
                className="absolute -bottom-2 left-0 w-full"
                height="6"
                viewBox="0 0 200 6"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 3C50 0.5 150 0.5 200 3"
                  stroke="#FDA4AF"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-neutral-light">
              Complete your profile to find your perfect match
            </p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <HeroOnboarding />
          </motion.div>
        </div>
      </div>
    </>
  );
}
