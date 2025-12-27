"use client";

import React from "react";
import { UserCircle, MapPin, Eye, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { calculateAge } from "@/lib/utils/profileFormatting";
import type { Profile } from "@aroosi/shared/types";

interface ProfileHeaderProps {
  profile: Profile;
  isOwnProfile: boolean;
  isPremiumPlus: boolean;
  viewersCount?: number;
   interestStatus?: string | null;
  compatScore?: number | null;
}

export function ProfileHeader({
  profile,
  isOwnProfile,
  isPremiumPlus,
  viewersCount,
  interestStatus,
  compatScore,
}: ProfileHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.5 } }}
      className="flex flex-col items-center text-center md:items-start md:text-left mb-8 px-6 md:px-10"
    >
      <div className="flex items-center gap-3 text-3xl md:text-4xl font-serif font-bold text-primary mb-2 flex-wrap justify-center md:justify-start">
        <UserCircle className="w-8 h-8 md:w-10 md:h-10" />
        <h1>{profile.fullName ?? "-"}</h1>
        
        {/* Interest Status Badge */}
        {!isOwnProfile && interestStatus && ["pending", "accepted", "mutual"].includes(interestStatus) && (
          <Badge
            variant="secondary"
            className={`text-xs px-2 py-0.5 rounded-full ${
              interestStatus === "pending"
                ? "bg-warning/10 text-warning"
                : "bg-success/10 text-success"
            }`}
          >
            {interestStatus === "pending" ? "Interest sent" : "Matched"}
          </Badge>
        )}

        {/* Viewers Count Badge */}
        {isOwnProfile && isPremiumPlus && typeof viewersCount === "number" && (
          <Badge
            variant="outline"
            className="text-neutral-dark border-neutral/30 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
          >
            <Eye className="w-3 h-3" />
            {viewersCount}
          </Badge>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-lg text-neutral mb-3 font-nunito">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-5 h-5 text-accent" />
          <span>{profile.city ?? "-"}, {profile.country ?? "-"}</span>
        </div>
        
        {compatScore != null && (
          <Badge variant="outline" className="bg-warning/5 text-warning border-warning/20 px-2 py-0.5">
            Compatibility: {compatScore}%
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-accent font-nunito opacity-80">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>Age: {calculateAge(profile.dateOfBirth || "") || "-"}</span>
        </div>
        <span className="hidden md:inline">•</span>
        <div className="flex items-center gap-1.5">
          <span>Member since:</span>
          <span>
            {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
