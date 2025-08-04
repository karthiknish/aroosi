"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
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
  Award,
  Building2,
} from "lucide-react";
import Head from "next/head";
import Image from "next/image";
import { Id } from "@convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuthContext } from "@/components/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserProfileImages,
  fetchUserProfile,
} from "@/lib/profile/userProfileApi";
import {
  sendInterestCookie,
  removeInterestCookie,
  getSentInterestsCookie,
} from "@/lib/interestUtils";
import { recordProfileView } from "@/lib/utils/profileApi";
import type { Profile } from "@/types/profile";
import { ErrorState } from "@/components/ui/error-state";
import { useOffline } from "@/hooks/useOffline";
import { SafetyActionButton } from "@/components/safety/SafetyActionButton";
import { BlockedUserBanner } from "@/components/safety/BlockedUserBanner";
import { useBlockStatus } from "@/hooks/useSafety";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import {
  calculateAge,
  formatHeight,
  formatCurrency,
  formatArrayToString,
  formatBoolean,
} from "@/lib/utils/profileFormatting";

type Interest = {
  id: string;
  toUserId: string;
  fromUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};

export default function ProfileDetailPage() {
  const params = useParams();
  const { token, profile: rawCurrentUserProfile } = useAuthContext();
  const currentUserProfile = rawCurrentUserProfile as {
    _id?: string;
    userId?: string;
  } | null;
  const offline = useOffline();
  const { trackUsage } = useUsageTracking(token ?? undefined);
  // Ensure a single declaration of queryClient
  const queryClient = useQueryClient();

  const id = params?.id as string;
  const userId = id as Id<"users">;

  // Fetch profile data
  const {
    data: profileData,
    isLoading: loadingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ["profileData", userId, token],
    queryFn: async () => {
      if (!token || !userId) return null;
      const result = await fetchUserProfile(token, userId);
      return result;
    },
    enabled: !!token && !!userId,
    retry: false,
  });

  // Handle nested profile object from API. If profileData?.data has a .profile key, use that, else use data directly.
  const profileRaw = profileData?.data;
  const profile: Profile | null =
    profileRaw &&
    typeof profileRaw === "object" &&
    profileRaw !== null &&
    "profile" in profileRaw
      ? (profileRaw as { profile: Profile | null }).profile
      : (profileRaw as Profile | null);

  const skipImagesQuery =
    profile?.profileImageUrls && profile.profileImageUrls.length > 0;

  const { data: userProfileImagesResponse } = useQuery({
    queryKey: ["userProfileImages", userId, token],
    queryFn: async () => {
      if (!token || !userId) return [];
      const result = await fetchUserProfileImages(token, userId);
      if (result.success && Array.isArray(result.data)) {
        return result.data.map((img: unknown) =>
          typeof img === "object" && img !== null && "url" in img
            ? (img as { url: string }).url
            : (img as string)
        );
      }
      return [];
    },
    enabled: !!token && !!userId && !skipImagesQuery,
  });

  const isOwnProfile = Boolean(
    currentUserProfile?._id && userId && currentUserProfile._id === userId
  );

  const localCurrentUserImageOrder: string[] = useMemo(() => {
    if (
      isOwnProfile &&
      typeof profile === "object" &&
      profile &&
      "profileImageIds" in profile &&
      Array.isArray((profile as { profileImageIds?: string[] }).profileImageIds)
    ) {
      return (profile as { profileImageIds?: string[] }).profileImageIds ?? [];
    }
    return [];
  }, [isOwnProfile, profile]);

  const imagesToShow: string[] = useMemo(() => {
    // Prefer profileImageUrls if present
    if (profile?.profileImageUrls && profile.profileImageUrls.length > 0) {
      return profile.profileImageUrls;
    }

    // Fallback to previously fetched images (legacy path)
    if (
      isOwnProfile &&
      localCurrentUserImageOrder.length > 0 &&
      Array.isArray(userProfileImagesResponse)
    ) {
      return localCurrentUserImageOrder
        .map((_, idx) => userProfileImagesResponse[idx])
        .filter(Boolean);
    }
    return Array.isArray(userProfileImagesResponse)
      ? userProfileImagesResponse
      : [];
  }, [
    profile?.profileImageUrls,
    isOwnProfile,
    localCurrentUserImageOrder,
    userProfileImagesResponse,
  ]);

  // Determine if image data still loading
  const imagesLoading =
    (profile &&
      (profile.profileImageUrls?.length ?? 0) > 0 &&
      imagesToShow.length === 0) ||
    (!skipImagesQuery && userProfileImagesResponse === undefined);

  const skeletonCount = profile?.profileImageUrls?.length ?? 0;

  // Use Convex user IDs for interest actions
  const fromUserId = currentUserProfile?.userId;
  const toUserId = userId;

  // --- BEGIN: Interest status (lightweight) and sent list ---
  // Lightweight interest status for the viewed user (cookie-auth)
  const {
    data: interestStatusData,
    isLoading: loadingInterestStatus,
    refetch: refetchInterestStatus,
  } = useQuery<{ status?: "none" | "pending" | "accepted" | "rejected" } | null>({
    queryKey: ["interestStatus", fromUserId, toUserId],
    queryFn: async () => {
      if (!fromUserId || !toUserId) return null;
      const res = await fetch(
        `/api/interests/status?targetUserId=${encodeURIComponent(String(toUserId))}`,
        { credentials: "include" }
      );
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      return data && typeof data === "object" ? (data as any) : null;
    },
    enabled: !!fromUserId && !!toUserId,
    staleTime: 30000,
  });

  // Full sent list (cookie-auth) for reconciliation/fallback
  const {
    data: sentInterests,
    isLoading: loadingInterests,
    refetch: refetchSentInterests,
  } = useQuery<Interest[]>({
    queryKey: ["sentInterests", fromUserId, toUserId],
    queryFn: async () => {
      if (!fromUserId) return [];
      const res = await getSentInterestsCookie();
      let payload: unknown = res;
      if (
        payload &&
        typeof payload === "object" &&
        "success" in payload &&
        "data" in payload
      ) {
        payload = (payload as { data: unknown }).data;
      }
      return Array.isArray(payload) ? payload : [];
    },
    enabled: !!fromUserId,
    retry: false,
  });

  // Local state to control the heart/interest button for instant UI feedback
  const [localInterest, setLocalInterest] = useState<null | boolean>(null);

  // Compute alreadySentInterest, allow local override for instant UI
  const alreadySentInterest = useMemo(() => {
    if (localInterest !== null) return localInterest;

    // Prefer lightweight status
    if (interestStatusData && typeof interestStatusData === "object" && "status" in interestStatusData) {
      const s = (interestStatusData as { status?: string }).status;
      if (s === "pending" || s === "accepted") return true;
      if (s === "rejected") return false;
    }

    if (!sentInterests || !Array.isArray(sentInterests)) return false;
    return sentInterests.some((interest) => {
      if (interest.toUserId !== toUserId || interest.fromUserId !== fromUserId)
        return false;
      return interest.status !== "rejected";
    });
  }, [interestStatusData, sentInterests, toUserId, fromUserId, localInterest]);
  // --- END: Add local state for interest status ---

  // Check if user is blocked
  const { data: blockStatus } = useBlockStatus(toUserId);
  const isBlocked = blockStatus?.isBlocked || false;
  const isBlockedBy = blockStatus?.isBlockedBy || false;
  const canInteract = !isBlocked && !isBlockedBy;

  let invalidIdError: string | null = null;
  if (
    toUserId &&
    typeof toUserId === "string" &&
    toUserId.startsWith("user_")
  ) {
    invalidIdError =
      "Internal error: Attempted to fetch profile with JWT user ID instead of Convex user ID.";
    showErrorToast(
      null,
      "Internal error: Attempted to fetch profile with JWT user ID instead of Convex user ID."
    );
  }

  const [currentImageIdx, setCurrentImageIdx] = useState<number>(0);
  const imagesKey = imagesToShow.join(",");

  const [interestError, setInterestError] = useState<string | null>(null);

  // Record profile view when this component mounts (only if viewing someone else's profile)
  useEffect(() => {
    if (!isOwnProfile && token && profile?._id) {
      void recordProfileView({
        token,
        profileId: profile._id as unknown as string,
      });
      // Track profile view usage
      trackUsage({
        feature: "profile_view",
        metadata: {
          targetUserId: userId,
        },
      });
    }
  }, [isOwnProfile, token, profile?._id, trackUsage, userId]);

  // Animation state for heart pop effect
  const [showHeartPop, setShowHeartPop] = useState(false);

  // --- BEGIN: Update handleInterestClick for instant UI feedback ---
  const handleInterestClick = async () => {
    if (!fromUserId || typeof fromUserId !== "string") {
      showErrorToast(null, "User ID not available");
      return;
    }
    if (!toUserId || typeof toUserId !== "string") {
      showErrorToast(null, "Target user ID not available");
      return;
    }
    if (!token || typeof token !== "string") {
      showErrorToast(null, "Token not available");
      return;
    }
    setInterestError(null);
    try {
      if (alreadySentInterest) {
        // Optimistically update UI: switch heart back immediately
        setLocalInterest(false);
        const responseData = await removeInterestCookie(toUserId);
        showSuccessToast("Interest withdrawn successfully!");

        // Invalidate and refetch related queries
        void queryClient.invalidateQueries({
          queryKey: ["interestStatus", fromUserId, toUserId],
        });
        void queryClient.invalidateQueries({
          queryKey: ["sentInterests", fromUserId, toUserId],
        });
        void queryClient.invalidateQueries({ queryKey: ["matches", "self"] });
        void queryClient.invalidateQueries({
          queryKey: ["unreadCounts", "self"],
        });
        // Invalidate and refetch related queries
        void queryClient.invalidateQueries({ queryKey: ["interestStatus", fromUserId, toUserId] });
        void queryClient.invalidateQueries({ queryKey: ["sentInterests", fromUserId, toUserId] });
        void queryClient.invalidateQueries({ queryKey: ["matches", "self"] });
        void queryClient.invalidateQueries({ queryKey: ["unreadCounts", "self"] });
        await Promise.all([refetchInterestStatus(), refetchSentInterests()]);

        setLocalInterest(null); // Let server state take over
        setShowHeartPop(false);
        return responseData;
      } else {
        // Optimistically update UI: switch heart immediately
        setLocalInterest(true);
        setShowHeartPop(true); // trigger pop animation
        const responseData = await sendInterestCookie(toUserId);
        showSuccessToast("Interest sent successfully!");

        // Track interest sent usage
        trackUsage({
          feature: "interest_sent",
          metadata: { targetUserId: toUserId },
        });

        // Invalidate and refetch related queries
        void queryClient.invalidateQueries({
          queryKey: ["interestStatus", fromUserId, toUserId],
        });
        void queryClient.invalidateQueries({
          queryKey: ["sentInterests", fromUserId, toUserId],
        });
        void queryClient.invalidateQueries({ queryKey: ["matches", "self"] });
        void queryClient.invalidateQueries({
          queryKey: ["unreadCounts", "self"],
        });
        // Invalidate and refetch related queries
        void queryClient.invalidateQueries({ queryKey: ["interestStatus", fromUserId, toUserId] });
        void queryClient.invalidateQueries({ queryKey: ["sentInterests", fromUserId, toUserId] });
        void queryClient.invalidateQueries({ queryKey: ["matches", "self"] });
        void queryClient.invalidateQueries({ queryKey: ["unreadCounts", "self"] });
        await Promise.all([refetchInterestStatus(), refetchSentInterests()]);

        setLocalInterest(null); // Let server state take over
        setTimeout(() => setShowHeartPop(false), 600);
        return responseData;
      }
    } catch (error: unknown) {
      // Rollback optimistic update on error
      setLocalInterest(null);
      const msg =
        error instanceof Error
          ? error.message
          : alreadySentInterest
            ? "Failed to remove interest"
            : "Failed to send interest";
      showErrorToast(msg);
      setInterestError(msg as string);
      throw error;
    }
  };
  // --- END: Update handleInterestClick for instant UI feedback ---

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

  if (invalidIdError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <ErrorState message={invalidIdError} />
      </div>
    );
  }

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
      <div className="relative w-full min-h-screen bg-base-light py-16 px-4 flex items-center justify-center overflow-x-hidden">
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
                      src={mainProfileImageUrl || "/placeholder.png"}
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
                        target.src = "/placeholder.png";
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
                      <UserCircle className="w-28 h-28 text-gray-300" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardHeader>
            <CardContent className="p-10 font-nunito bg-transparent">
              {/* Blocked User Banner */}
              {!isOwnProfile && (isBlocked || isBlockedBy) && (
                <BlockedUserBanner
                  isBlocked={isBlocked}
                  isBlockedBy={isBlockedBy}
                  userName={profile?.fullName}
                  className="mb-6"
                />
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
                  className="flex items-center gap-2 text-4xl font-serif font-bold text-primary mb-1"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  <UserCircle className="w-8 h-8 text-primary" />
                  {profile?.fullName ?? "-"}
                </div>
                <div className="flex items-center gap-2 text-lg text-neutral mb-1 font-nunito">
                  <MapPin className="w-5 h-5 text-accent" />
                  {profile?.city ?? "-"}, {profile?.country ?? "-"}
                </div>
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
                                target.src = "/placeholder.png";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                            <UserCircle className="w-16 h-16 text-gray-300" />
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

              <div className="flex justify-center gap-8 mt-8 mb-2 relative">
                <AnimatePresence>
                  {!isOwnProfile && canInteract && (
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
                      onClick={handleInterestClick}
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
                      disabled={loadingInterests}
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
                        {alreadySentInterest ? (
                          <div className="relative">
                            <HeartOff className="w-10 h-10 fill-primary text-primary" />
                          </div>
                        ) : (
                          <Heart className="w-10 h-10 text-white" />
                        )}
                      </motion.span>
                    </motion.button>
                  )}
                </AnimatePresence>
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
              <AnimatePresence>
                {interestError && (
                  <motion.div
                    key="interest-error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.3 },
                    }}
                    exit={{
                      opacity: 0,
                      y: 10,
                      transition: { duration: 0.2 },
                    }}
                    className="text-center text-red-600 text-sm mt-2"
                  >
                    {interestError}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
