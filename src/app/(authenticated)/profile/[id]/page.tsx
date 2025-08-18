"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { showErrorToast } from "@/lib/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Heart,
  HeartOff,
  MapPin,
  BookOpen,
  Briefcase,
  Ruler,
  Info,
  Calendar,
  DollarSign,
  Heart as HeartIcon,
  Utensils,
  Cigarette,
  Wine,
  Accessibility,
  Users,
  Target,
  Building2,
  Eye,
} from "lucide-react";
import Head from "next/head";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/lib/profile/userProfileApi";
import { useProfileImages } from "@/hooks/useProfileImages";
import { useInterestStatus } from "@/hooks/useInterestStatus";
import { recordProfileView } from "@/lib/utils/profileApi";
import type { Profile } from "@/types/profile";
import { ErrorState } from "@/components/ui/error-state";
import { useOffline } from "@/hooks/useOffline";
import { SafetyActionButton } from "@/components/safety/SafetyActionButton";
import { BlockedUserBanner } from "@/components/safety/BlockedUserBanner";
import { useBlockStatus } from "@/hooks/useSafety";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { Button } from "@/components/ui/button";
import { useSubscriptionGuard } from "@/hooks/useSubscription";
import {
  calculateAge,
  formatHeight,
  formatCurrency,
  formatArrayToString,
  formatBoolean,
} from "@/lib/utils/profileFormatting";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { IcebreakersPanel } from "./IcebreakersPanel";
import { fetchIcebreakers } from "@/lib/engagementUtil";
import { getJson } from "@/lib/http/client";

export default function ProfileDetailPage() {
  const params = useParams();
  const {
    profile: rawCurrentUserProfile,
    isLoaded,
    isAuthenticated,
  } = useAuthContext();
  // Current user profile model (Firebase) uses `id` (doc id) and `uid` (auth uid).
  // Previous logic incorrectly looked for `_id` / `userId` causing fromUserId to be undefined.
  const currentUserProfile = rawCurrentUserProfile as
    | (typeof rawCurrentUserProfile & {
        id?: string;
        uid?: string;
      })
    | null;
  const offline = useOffline();
  const { trackUsage } = useUsageTracking(undefined);
  const { isPremiumPlus } = useSubscriptionGuard();
  const id = params?.id as string;
  const userId = id as string;
  // Use Firebase uid first, fall back to document id for interest interactions
  const fromUserId = currentUserProfile?.uid || currentUserProfile?.id;
  const toUserId = userId;

  // Determine if viewing own profile (support both uid & doc id comparisons)
  const isOwnProfile = Boolean(
    currentUserProfile &&
      userId &&
      (currentUserProfile.id === userId || currentUserProfile.uid === userId)
  );
  const viewingOwn = isOwnProfile;
  const skipRemoteProfile = viewingOwn && !!currentUserProfile;
  const {
    data: profileData,
    isLoading: loadingProfileRemote,
    error: profileError,
  } = useQuery({
    queryKey: ["profileData", userId],
    queryFn: async () => (userId ? await fetchUserProfile(userId) : null),
    enabled: !!userId && isLoaded && isAuthenticated && !skipRemoteProfile,
    retry: false,
  });
  const loadingProfile = skipRemoteProfile ? false : loadingProfileRemote;
  const profileRaw = skipRemoteProfile
    ? (currentUserProfile as any)
    : profileData?.data;
  const profile: Profile | null =
    profileRaw &&
    typeof profileRaw === "object" &&
    profileRaw !== null &&
    "profile" in profileRaw
      ? (profileRaw as { profile: Profile | null }).profile
      : (profileRaw as Profile | null);
  const { images: fetchedImages } = useProfileImages({
    userId,
    enabled: isLoaded && isAuthenticated,
    preferInlineUrls: profile?.profileImageUrls,
  });
  const localCurrentUserImageOrder: string[] = useMemo(() => {
    if (isOwnProfile && profile && (profile as any).profileImageIds) {
      return (profile as any).profileImageIds || [];
    }
    return [];
  }, [isOwnProfile, profile]);
  const imagesToShow: string[] = useMemo(() => {
    if (profile?.profileImageUrls?.length) return profile.profileImageUrls;
    if (isOwnProfile && localCurrentUserImageOrder.length) {
      const lookup = new Map(
        fetchedImages.map((i) => [i.storageId || i.url, i.url])
      );
      return localCurrentUserImageOrder
        .map((id) => lookup.get(id) || "")
        .filter(Boolean) as string[];
    }
    return fetchedImages.map((i) => i.url).filter(Boolean);
  }, [
    profile?.profileImageUrls,
    isOwnProfile,
    localCurrentUserImageOrder,
    fetchedImages,
  ]);
  const skeletonCount = profile?.profileImageUrls?.length ?? 0;
  const imagesLoading = skeletonCount > 0 && imagesToShow.length === 0;
  const { data: iceQs } = useQuery({
    queryKey: ["icebreakers", "today"],
    queryFn: fetchIcebreakers,
    enabled: isLoaded && isAuthenticated,
  });
  const trackWrapper = (evt: {
    feature: string;
    metadata?: Record<string, any>;
  }) => {
    // Adapt to useUsageTracking's expected params if needed
    trackUsage({ feature: evt.feature as any, metadata: evt.metadata });
  };
  const {
    interestStatusData,
    loadingInterestStatus,
    alreadySentInterest,
    handleToggleInterest,
    showHeartPop,
    interestError,
    mutationPending,
  } = useInterestStatus({
    fromUserId,
    toUserId: String(toUserId),
    enabled: isLoaded && isAuthenticated,
    track: trackWrapper,
  });

  // Removed legacy duplicated interest/status logic block after hook integration.

  // Check if user is blocked
  const { data: blockStatus } = useBlockStatus(toUserId);
  const isBlocked = blockStatus?.isBlocked || false;
  const isBlockedBy = blockStatus?.isBlockedBy || false;
  const canInteract = !isBlocked && !isBlockedBy;

  // Removed legacy Convex ID shape validation (no longer applicable after Firebase migration)
  const invalidIdError: string | null = null;

  const [currentImageIdx, setCurrentImageIdx] = useState<number>(0);
  const imagesKey = imagesToShow.join(",");

  const interestLoading = loadingInterestStatus;
  const missingInteractionIds = !fromUserId || !toUserId;
  if (typeof window !== "undefined") {
    // Lightweight debug (won't spam because values stabilize quickly)
    (window as any).__lastInterestDebug = {
      fromUserId,
      toUserId,
      missingInteractionIds,
      // include raw ids for deeper debugging
      rawProfileIds: {
        profile_id: currentUserProfile?.id,
        profile_uid: currentUserProfile?.uid,
      },
    };
  }

  // Keyboard navigation for image gallery (Left/Right arrows)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentImageIdx((idx) => Math.max(0, idx - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentImageIdx((idx) =>
          Math.min(Math.max(imagesToShow.length - 1, 0), idx + 1)
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Only depend on imagesToShow length to avoid re-adding listeners on every idx change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesToShow.length]);

  // Viewers count (Premium Plus + own profile)
  const { data: viewersCount } = useQuery({
    queryKey: ["profileViewersCount", profile?._id],
    queryFn: async () => {
      if (!isOwnProfile || !profile?._id) return 0;
      const { fetchProfileViewersCount } = await import(
        "@/lib/utils/profileApi"
      );
      return await fetchProfileViewersCount(String(profile._id));
    },
    enabled: Boolean(profile?._id) && isOwnProfile && isPremiumPlus,
    staleTime: 60_000,
  });

  // Record profile view when this component mounts (only if viewing someone else's profile)
  useEffect(() => {
    if (!isOwnProfile && profile?._id) {
      void recordProfileView({
        profileId: String(profile._id ?? ""),
      });
      // Track profile view usage
      trackUsage({
        feature: "profile_view",
        metadata: {
          targetUserId: userId,
        },
      });
    }
  }, [isOwnProfile, profile?._id, trackUsage, userId]);

  // Heart pop animation state now comes from hook; retain local variant definitions below

  // Get the current image to display (just by index)
  const mainProfileImageUrl =
    imagesToShow.length > 0 ? imagesToShow[currentImageIdx] : undefined;

  // Helper for icon+label row
  function IconRow({
    icon,
    label,
    value,
    className = "",
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | undefined;
    className?: string;
  }) {
    return (
      <div
        className={`flex items-center gap-2 mb-1 text-gray-700 ${className}`}
      >
        <span className="text-red-600">{icon}</span>
        <span className="font-medium">{label}:</span>
        <span className="text-gray-800">{value ?? "-"}</span>
      </div>
    );
  }

  // Heart pop animation variants
  const heartPopVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: [0, 1.4, 1],
      opacity: [0, 0.8, 0],
      transition: { duration: 0.6, times: [0, 0.3, 1] },
    },
  };

  // Compatibility score for viewed profile (not your own)
  // Must be called before any early return!
  const { data: compatData } = useQuery<{
    score: number | null;
    reasons: string[];
  } | null>({
    queryKey: ["compatibility", userId],
    queryFn: async () => {
      if (!userId || isOwnProfile) return null;
      return await getJson(
        `/api/compatibility/${encodeURIComponent(String(userId))}`
      );
    },
    enabled: !!userId && !isOwnProfile && isLoaded && isAuthenticated,
    staleTime: 60_000,
  });

  if (offline) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ErrorState />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ErrorState onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ErrorState message="Profile not found." />
      </div>
    );
  }

  // invalidIdError always null now

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, type: "spring" as const },
    },
    exit: { opacity: 0, y: 40, transition: { duration: 0.3 } },
  };

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

  const buttonVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 20 },
    },
    tap: { scale: 0.92 },
  };

  return (
    <>
      <Head>
        <title>
          {profile?.fullName ? `${profile.fullName}'s Profile` : "View Profile"}{" "}
          | Aroosi
        </title>
        <meta
          name="description"
          content={`View ${profile?.fullName || "user"}'s detailed profile on Aroosi, the trusted Afghan matrimony platform for Afghans worldwide.`}
        />
        {/* ... other meta tags ... */}
      </Head>
      <div className="relative w-full overflow-hidden bg-base-light py-16 px-4 flex items-center justify-center overflow-x-hidden">
        {/* Decorative color pop circles */}
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
        {/* Subtle SVG background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        <motion.div
          key="profile-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="max-w-4xl w-full mx-auto"
        >
          <Card className="shadow-xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-md border-0">
            <CardHeader className="p-0 relative">
              {/* Safety Action Button */}
              {!isOwnProfile && (
                <div className="absolute top-4 right-4 z-20">
                  <SafetyActionButton
                    userId={userId}
                    userName={profile?.fullName}
                    variant="icon"
                  />
                </div>
              )}
              <AnimatePresence>
                {mainProfileImageUrl ? (
                  <motion.div
                    key={`main-image-${imagesKey}-${currentImageIdx}`}
                    variants={imageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative w-full"
                    style={{ aspectRatio: "1 / 1" }}
                  >
                    {/* Left Arrow */}
                    {imagesToShow.length > 1 && (
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow"
                        onClick={() =>
                          setCurrentImageIdx((idx) => Math.max(0, idx - 1))
                        }
                        disabled={currentImageIdx === 0}
                        aria-label="Previous image"
                        type="button"
                      >
                        <ChevronLeft className="w-6 h-6 text-gray-700" />
                      </button>
                    )}
                    <Image
                      src={mainProfileImageUrl || "/placeholder.jpg"}
                      alt={
                        profile?.fullName
                          ? `${profile.fullName}'s profile image`
                          : "Profile"
                      }
                      fill
                      className="object-cover object-center"
                      priority
                      sizes="(max-width: 768px) 100vw, 768px"
                      onError={(
                        e: React.SyntheticEvent<HTMLImageElement, Event>
                      ) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes("placeholder")) {
                          target.src = "/placeholder.jpg";
                        }
                      }}
                    />
                    {/* Right Arrow */}
                    {imagesToShow.length > 1 && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow"
                        onClick={() =>
                          setCurrentImageIdx((idx) =>
                            Math.min(imagesToShow.length - 1, idx + 1)
                          )
                        }
                        disabled={currentImageIdx === imagesToShow.length - 1}
                        aria-label="Next image"
                        type="button"
                      >
                        <ChevronRight className="w-6 h-6 text-gray-700" />
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="main-placeholder"
                    variants={imageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full"
                    style={{ aspectRatio: "1 / 1" }}
                  >
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <Image
                        src="/placeholder.jpg"
                        alt="Profile placeholder"
                        fill
                        className="object-cover object-center"
                        sizes="(max-width: 768px) 100vw, 768px"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardHeader>
            <CardContent className="p-10 font-nunito bg-transparent">
              {/* Mini photo strip */}
              {imagesToShow.length > 1 && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  {imagesToShow.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      className={`w-12 h-12 rounded-md overflow-hidden border ${i === currentImageIdx ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setCurrentImageIdx(i)}
                    >
                      <Image
                        src={url}
                        alt="thumb"
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
              {/* Mini photo strip */}
              {imagesToShow.length > 1 && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  {imagesToShow.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      className={`w-12 h-12 rounded-md overflow-hidden border ${i === currentImageIdx ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setCurrentImageIdx(i)}
                    >
                      <Image
                        src={url}
                        alt="thumb"
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
              {/* Blocked User Banner */}
              {!isOwnProfile && (isBlocked || isBlockedBy) && (
                <BlockedUserBanner
                  isBlocked={isBlocked}
                  isBlockedBy={isBlockedBy}
                  userName={profile?.fullName}
                  className="mb-6"
                />
              )}
              {/* Removed inline shortlist & note actions (moved to bottom) */}

              {/* Quick actions: Previous/Next image buttons */}
              {imagesToShow.length > 1 && (
                <div className="flex gap-2 mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentImageIdx((idx) => Math.max(0, idx - 1))
                    }
                    disabled={currentImageIdx === 0}
                  >
                    Previous Photo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentImageIdx((idx) =>
                        Math.min(imagesToShow.length - 1, idx + 1)
                      )
                    }
                    disabled={currentImageIdx >= imagesToShow.length - 1}
                  >
                    Next Photo
                  </Button>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.15, duration: 0.5 },
                }}
                className="flex flex-col items-center mb-8"
              >
                <div
                  className="flex items-center gap-2 text-4xl font-serif font-bold text-primary mb-1 flex-wrap"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  <UserCircle className="w-8 h-8 text-primary" />
                  {profile?.fullName ?? "-"}
                  {/* Compatibility badge is displayed below near location when available */}
                  {/* Inline interest status chip (only when viewing others) */}
                  {!isOwnProfile &&
                    ["pending", "accepted", "mutual"].includes(
                      interestStatusData?.status || ""
                    ) && (
                      <Badge
                        variant="secondary"
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          interestStatusData?.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : interestStatusData?.status === "accepted"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {interestStatusData?.status === "pending"
                          ? "Interest sent"
                          : interestStatusData?.status === "accepted"
                            ? "Interest accepted"
                            : "Mutual interest"}
                      </Badge>
                    )}
                  {/* Profile viewers count (own profile + Premium Plus) */}
                  {isOwnProfile &&
                    isPremiumPlus &&
                    typeof viewersCount === "number" && (
                      <Badge
                        variant="outline"
                        className="text-gray-700 border-gray-300 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        {viewersCount}
                      </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2 text-lg text-neutral mb-1 font-nunito">
                  <MapPin className="w-5 h-5 text-accent" />
                  {profile?.city ?? "-"}, {profile?.country ?? "-"}
                  {compatData?.score != null && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      Compatibility: {compatData.score}%
                    </span>
                  )}
                </div>
                {/* Prompt chips using today's icebreakers */}
                {Array.isArray(iceQs) && iceQs.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap justify-center">
                    {iceQs.slice(0, 2).map((q) => (
                      <span
                        key={q.id}
                        className="text-[10px] px-2 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200"
                      >
                        {q.text}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-accent-600 mb-2 font-nunito">
                  <Calendar className="w-4 h-4 text-accent-200" />
                  <span>
                    Age: {calculateAge(profile?.dateOfBirth || "") || "-"}
                  </span>
                  <span>•</span>
                  <span>Member since:</span>
                  <span>
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </motion.div>

              {/* Similar profiles section removed */}

              {imagesLoading && skeletonCount > 0 && (
                <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                  {Array.from({ length: skeletonCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-full aspect-square bg-gray-100 animate-pulse rounded-lg"
                    />
                  ))}
                </motion.div>
              )}
              {imagesToShow && imagesToShow.length > 0 && (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <AnimatePresence>
                    {imagesToShow.map((url: string, idx: number) => (
                      <motion.div
                        key={url}
                        className="relative w-full"
                        style={{ aspectRatio: "1 / 1" }}
                        custom={idx}
                        variants={galleryImageVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        {url ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={url}
                              alt={`${profile?.fullName ?? "Profile"}'s image ${idx + 1}`}
                              fill
                              sizes="(max-width: 768px) 50vw, 25vw"
                              className="object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setCurrentImageIdx(idx)}
                              onError={(
                                e: React.SyntheticEvent<HTMLImageElement, Event>
                              ) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.src.includes("placeholder")) {
                                  target.src = "/placeholder.jpg";
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
                            <Image
                              src="/placeholder.jpg"
                              alt="Profile placeholder"
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 25vw"
                            />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 mb-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold mb-3 flex items-center gap-2 text-primary-dark text-lg">
                    <UserCircle className="w-5 h-5 text-accent" />
                    Basic Information
                  </h3>
                  <IconRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="Age"
                    value={
                      calculateAge(profile?.dateOfBirth || "")?.toString() ||
                      "-"
                    }
                  />
                  <IconRow
                    icon={<Ruler className="w-4 h-4" />}
                    label="Height"
                    value={formatHeight(profile?.height || "")}
                  />
                  <IconRow
                    icon={<Users className="w-4 h-4" />}
                    label="Marital Status"
                    value={formatBoolean(profile?.maritalStatus || "")}
                  />
                  <IconRow
                    icon={<DollarSign className="w-4 h-4" />}
                    label="Annual Income"
                    value={formatCurrency(profile?.annualIncome || "")}
                  />
                </div>

                {/* Education & Career */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold mb-3 flex items-center gap-2 text-primary-dark text-lg">
                    <BookOpen className="w-5 h-5 text-accent" />
                    Education & Career
                  </h3>
                  <IconRow
                    icon={<BookOpen className="w-4 h-4" />}
                    label="Education"
                    value={profile?.education ?? "-"}
                  />
                  <IconRow
                    icon={<Briefcase className="w-4 h-4" />}
                    label="Occupation"
                    value={profile?.occupation ?? "-"}
                  />
                </div>

                {/* Location */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold mb-3 flex items-center gap-2 text-primary-dark text-lg">
                    <MapPin className="w-5 h-5 text-accent" />
                    Location
                  </h3>
                  <IconRow
                    icon={<MapPin className="w-4 h-4" />}
                    label="City"
                    value={profile?.city ?? "-"}
                  />
                  <IconRow
                    icon={<MapPin className="w-4 h-4" />}
                    label="Country"
                    value={profile?.country ?? "-"}
                  />
                </div>

                {/* Lifestyle */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold mb-3 flex items-center gap-2 text-primary-dark text-lg">
                    <HeartIcon className="w-5 h-5 text-accent" />
                    Lifestyle
                  </h3>
                  <IconRow
                    icon={<Utensils className="w-4 h-4" />}
                    label="Diet"
                    value={formatBoolean(profile?.diet || "")}
                  />
                  <IconRow
                    icon={<Cigarette className="w-4 h-4" />}
                    label="Smoking"
                    value={formatBoolean(profile?.smoking || "")}
                  />
                  <IconRow
                    icon={<Wine className="w-4 h-4" />}
                    label="Drinking"
                    value={formatBoolean(profile?.drinking || "")}
                  />
                  <IconRow
                    icon={<Accessibility className="w-4 h-4" />}
                    label="Physical Status"
                    value={formatBoolean(profile?.physicalStatus || "")}
                  />
                </div>

                {/* Religious Information */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold mb-3 flex items-center gap-2 text-primary-dark text-lg">
                    <Building2 className="w-5 h-5 text-accent" />
                    Religious Information
                  </h3>
                  <IconRow
                    icon={<Building2 className="w-4 h-4" />}
                    label="Religion"
                    value={formatBoolean(profile?.religion || "")}
                  />
                  <IconRow
                    icon={<Users className="w-4 h-4" />}
                    label="Mother Tongue"
                    value={formatBoolean(profile?.motherTongue || "")}
                  />
                  <IconRow
                    icon={<Users className="w-4 h-4" />}
                    label="Ethnicity"
                    value={formatBoolean(profile?.ethnicity || "")}
                  />
                </div>

                {/* Partner Preferences */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold mb-3 flex items-center gap-2 text-primary-dark text-lg">
                    <Target className="w-5 h-5 text-accent" />
                    Partner Preferences
                  </h3>
                  <IconRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="Age Range"
                    value={
                      profile?.partnerPreferenceAgeMin &&
                      profile?.partnerPreferenceAgeMax
                        ? `${profile.partnerPreferenceAgeMin} - ${profile.partnerPreferenceAgeMax}`
                        : "-"
                    }
                  />
                  <IconRow
                    icon={<MapPin className="w-4 h-4" />}
                    label="Preferred Location"
                    value={formatArrayToString(profile?.partnerPreferenceCity)}
                  />
                  <IconRow
                    icon={<Users className="w-4 h-4" />}
                    label="Preferred Gender"
                    value={formatBoolean(profile?.preferredGender || "")}
                  />
                </div>
              </div>

              {/* About Me */}
              <div className="space-y-6">
                <h3 className="font-serif font-semibold mb-3 flex items-center gap-2 text-primary-dark text-lg">
                  <Info className="w-5 h-5 text-accent" />
                  About Me
                </h3>
                <div className="flex items-start gap-2 text-neutral">
                  <Info className="w-4 h-4 mt-0.5 text-accent" />
                  <span>{profile?.aboutMe ?? "-"}</span>
                </div>
              </div>

              {/* Icebreakers (own profile) */}
              {isOwnProfile && <IcebreakersPanel />}

              <div className="flex justify-center gap-8 mt-8 mb-2 relative">
                <AnimatePresence>
                  {!isOwnProfile &&
                    canInteract &&
                    interestStatusData?.status !== "mutual" &&
                    (interestLoading ? (
                      <div className="flex items-center justify-center">
                        <Skeleton className="w-16 h-16 rounded-full" />
                      </div>
                    ) : (
                      <motion.button
                        key={
                          alreadySentInterest
                            ? "withdraw-interest"
                            : "express-interest"
                        }
                        className={`flex items-center justify-center rounded-full p-4 shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 font-nunito text-lg font-semibold ${
                          alreadySentInterest
                            ? "bg-accent-100 hover:bg-accent-200 text-primary border border-accent-200"
                            : "bg-primary hover:bg-primary-dark text-white"
                        }`}
                        variants={buttonVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        whileTap="tap"
                        onClick={() => {
                          if (missingInteractionIds) return; // silently ignore until IDs ready
                          handleToggleInterest();
                        }}
                        // Dynamic labels; disabled state shows loading context
                        title={
                          alreadySentInterest
                            ? "Withdraw Interest"
                            : "Express Interest"
                        }
                        aria-label={
                          alreadySentInterest
                            ? "Withdraw Interest"
                            : "Express Interest"
                        }
                        type="button"
                        disabled={
                          loadingInterestStatus ||
                          mutationPending ||
                          missingInteractionIds
                        }
                        aria-disabled={
                          loadingInterestStatus ||
                          mutationPending ||
                          missingInteractionIds
                        }
                      >
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0.7 }}
                          animate={{
                            scale: 1,
                            opacity: 1,
                            transition: { duration: 0.3 },
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.92 }}
                        >
                          {mutationPending ? (
                            <svg
                              className="w-10 h-10 animate-spin text-white"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              />
                            </svg>
                          ) : alreadySentInterest ? (
                            <div className="relative">
                              <HeartOff className="w-10 h-10 fill-primary text-primary" />
                            </div>
                          ) : (
                            <Heart className="w-10 h-10 text-white" />
                          )}
                        </motion.span>
                      </motion.button>
                    ))}
                </AnimatePresence>
                {canInteract && interestStatusData?.status === "mutual" && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full shadow font-semibold">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Matched
                  </div>
                )}
                {/* Heart pop animation overlay */}
                <AnimatePresence>
                  {showHeartPop && (
                    <motion.div
                      key="heart-pop"
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      variants={heartPopVariants}
                      initial="initial"
                      animate="animate"
                      exit="initial"
                    >
                      <Heart className="w-24 h-24 text-primary" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Shortlist action moved to bottom of card */}
              {!isOwnProfile && (
                <div className="flex justify-center mt-6">
                  <ProfileActions toUserId={String(userId)} />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
