import React, { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Rocket, Heart, Check } from "lucide-react";
import { SpotlightIcon } from "@/components/ui/spotlight-badge";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { isPremium } from "@/lib/utils/subscriptionPlan";
import { interestsAPI } from "@/lib/api/interests";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { useQueryClient } from "@tanstack/react-query";

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

function ProfileCardComponent({
  result,
  index,
  imgLoaded,
  setImgLoaded,
}: ProfileCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  const p = result.profile;
  const profileUrls = p.profileImageUrls;
  const matchImageUrl =
    profileUrls && profileUrls.length > 0 ? profileUrls[0] : null;

  const handleSendInterest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sending || sent) return;
    
    setSending(true);
    try {
      await interestsAPI.send(result.userId);
      setSent(true);
      showSuccessToast("Interest sent successfully!");
      
      // Invalidate queries to update lists
      queryClient.invalidateQueries({ queryKey: ["sentInterests"] });
      queryClient.invalidateQueries({ queryKey: ["interestStatus", undefined, result.userId] });
    } catch (error: any) {
      // If already sent (409), treat as success
      if (error?.status === 409 || error?.message?.includes("409")) {
        setSent(true);
        showSuccessToast("Interest sent successfully!");
      } else {
        showErrorToast(error?.message || "Failed to send interest");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: index * 0.05 }}
    >
      <Card
        className={`${
          p.boostedUntil && p.boostedUntil > Date.now()
            ? "ring-2 ring-primary shadow-primary/20"
            : ""
        } hover:shadow-xl transition-all duration-300 border-0 bg-base-light/90 backdrop-blur-sm rounded-2xl overflow-hidden flex flex-col h-full`}
      >
        <div 
          className="relative cursor-pointer group"
          onClick={() => router.push(`/profile/${result.userId}`)}
          onMouseEnter={() => router.prefetch(`/profile/${result.userId}`)}
        >
          {matchImageUrl ? (
            <div className="w-full aspect-square bg-neutral/10 flex items-center justify-center overflow-hidden relative">
              {/* Skeleton loader */}
              {!imgLoaded && (
                <div className="absolute inset-0 bg-neutral/10 animate-pulse z-0" />
              )}
              <Image
                src={matchImageUrl}
                alt={typeof p.fullName === "string" ? p.fullName : ""}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className={`object-cover transition-all duration-700 group-hover:scale-105 ${imgLoaded ? "opacity-100 blur-0" : "opacity-0 blur-md"}`}
                onLoad={() => setImgLoaded(result.userId)}
                priority={index < 4}
              />
              {p.boostedUntil && p.boostedUntil > Date.now() && (
                <div className="absolute top-2 left-2 bg-gradient-to-r from-primary via-primary-dark to-primary-dark text-white text-xs px-3 py-1.5 rounded-full z-10 flex items-center gap-1 shadow-lg animate-pulse border border-white/20">
                  <Rocket className="h-3 w-3 fill-current" />
                  <span className="font-semibold">Boosted</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-square bg-neutral/10 flex items-center justify-center overflow-hidden relative">
              <Image
                src="/placeholder.jpg"
                alt="Profile placeholder"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {p.boostedUntil && p.boostedUntil > Date.now() && (
                <div className="absolute top-2 left-2 bg-gradient-to-r from-primary via-primary-dark to-primary-dark text-white text-xs px-3 py-1.5 rounded-full z-10 flex items-center gap-1 shadow-lg animate-pulse border border-white/20">
                  <Rocket className="h-3 w-3 fill-current" />
                  <span className="font-semibold">Boosted</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <CardContent className="flex-1 flex flex-col p-4">
          <div className="flex-1 flex flex-col items-center justify-center mb-4">
            <div className="text-xl font-bold text-neutral-dark mb-1 flex items-center gap-1">
              {typeof p.fullName === "string" ? p.fullName : ""}
              {isPremium(p.subscriptionPlan) && (
                <BadgeCheck className="w-4 h-4 text-accent" />
              )}
              {isPremium(p.subscriptionPlan) &&
              p.hasSpotlightBadge &&
              p.spotlightBadgeExpiresAt &&
              (p.spotlightBadgeExpiresAt as number) > Date.now() ? (
                <SpotlightIcon className="w-4 h-4" />
              ) : null}
            </div>
            <div className="text-sm text-neutral-light mb-1">
              {typeof p.city === "string" ? p.city : "-"}
            </div>
            <div className="text-sm text-neutral-light">
              Age: {getAge(typeof p.dateOfBirth === "string" ? p.dateOfBirth : "")}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 w-full mt-auto">
            <Button
              variant="outline"
              className="w-full border-primary/20 text-primary hover:bg-primary/5 hover:text-primary-dark"
              onClick={() => router.push(`/profile/${result.userId}`)}
            >
              View
            </Button>
            <Button
              className={`w-full text-white transition-all duration-300 ${
                sent 
                  ? "bg-success hover:bg-success/90" 
                  : "bg-primary hover:bg-primary-dark"
              }`}
              onClick={handleSendInterest}
              disabled={sending || sent}
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : sent ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Sent
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-1 fill-current" />
                  Like
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export const ProfileCard = React.memo(ProfileCardComponent);
