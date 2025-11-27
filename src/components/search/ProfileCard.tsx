import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Rocket } from "lucide-react";
import { SpotlightIcon } from "@/components/ui/spotlight-badge";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { isPremium } from "@/lib/utils/subscriptionPlan";

// Duplicate interfaces to avoid circular deps or complex refactors for now
export interface ProfileData {
  fullName: string;
  city?: string;
  dateOfBirth?: string;
  profileCompletionPercentage?: number;
  hiddenFromSearch?: boolean;
  boostedUntil?: number;
  subscriptionPlan?: string;
  hideFromFreeUsers?: boolean;
  profileImageUrls?: string[];
  hasSpotlightBadge?: boolean;
  spotlightBadgeExpiresAt?: number;
  [key: string]: unknown;
}

export interface ProfileSearchResult {
  userId: string;
  email?: string;
  profile: ProfileData;
}

interface ProfileCardProps {
  result: ProfileSearchResult;
  index: number;
  imgLoaded: boolean;
  setImgLoaded: (userId: string) => void;
}

function getAge(dateOfBirth: string) {
  if (!dateOfBirth) return "-";
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return isNaN(age) ? "-" : age;
}

export function ProfileCard({
  result,
  index,
  imgLoaded,
  setImgLoaded,
}: ProfileCardProps) {
  const router = useRouter();
  const p = result.profile;
  const profileUrls = p.profileImageUrls;
  const matchImageUrl =
    profileUrls && profileUrls.length > 0 ? profileUrls[0] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: index * 0.05 }}
    >
      <Card
        className={`${
          p.boostedUntil && p.boostedUntil > Date.now()
            ? "ring-2 ring-pink-500 shadow-pink-200"
            : ""
        } hover:shadow-xl transition-shadow border-0 bg-white/90 rounded-2xl overflow-hidden flex flex-col`}
      >
        {matchImageUrl ? (
          <div className="w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
            {/* Skeleton loader */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-600 animate-pulse z-0" />
            )}
            <img
              src={matchImageUrl}
              alt={typeof p.fullName === "string" ? p.fullName : ""}
              className={`w-full h-full object-cover transition-all duration-700 ${imgLoaded ? "opacity-100 blur-0" : "opacity-0 blur-md"}`}
              onLoad={() => setImgLoaded(result.userId)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes("placeholder")) return; // prevent loop
                target.src = "/placeholder.jpg";
                setImgLoaded(result.userId);
              }}
            />
            {p.boostedUntil && p.boostedUntil > Date.now() && (
              <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-600 via-pink-700 to-rose-600 text-white text-xs px-3 py-1.5 rounded-full z-10 flex items-center gap-1 shadow-lg animate-pulse border border-pink-400/30">
                <Rocket className="h-3 w-3 fill-current" />
                <span className="font-semibold">Boosted</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden relative">
            <img
              src="/placeholder.jpg"
              alt="Profile placeholder"
              className="w-full h-full object-cover"
            />
            {p.boostedUntil && p.boostedUntil > Date.now() && (
              <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-600 via-pink-700 to-rose-600 text-white text-xs px-3 py-1.5 rounded-full z-10 flex items-center gap-1 shadow-lg animate-pulse border border-pink-400/30">
                <Rocket className="h-3 w-3 fill-current" />
                <span className="font-semibold">Boosted</span>
              </div>
            )}
          </div>
        )}
        <CardContent className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-xl font-bold text-neutral-900 mb-1 flex items-center gap-1">
            {typeof p.fullName === "string" ? p.fullName : ""}
            {isPremium(p.subscriptionPlan) && (
              <BadgeCheck className="w-4 h-4 text-[#BFA67A]" />
            )}
            {isPremium(p.subscriptionPlan) &&
            p.hasSpotlightBadge &&
            p.spotlightBadgeExpiresAt &&
            (p.spotlightBadgeExpiresAt as number) > Date.now() ? (
              <SpotlightIcon className="w-4 h-4" />
            ) : null}
          </div>
          <div
            className="text-sm text-neutral-600 mb-1"
            style={{
              fontFamily: "Nunito Sans, Arial, sans-serif",
            }}
          >
            {typeof p.city === "string" ? p.city : "-"}
          </div>
          <div
            className="text-sm text-neutral-600 mb-1"
            style={{
              fontFamily: "Nunito Sans, Arial, sans-serif",
            }}
          >
            Age: {getAge(typeof p.dateOfBirth === "string" ? p.dateOfBirth : "")}
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-white w-full mt-2"
            onClick={() => router.push(`/profile/${result.userId}`)}
          >
            {"View Profile"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
