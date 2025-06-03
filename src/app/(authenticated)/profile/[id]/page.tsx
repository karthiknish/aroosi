"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
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
  Languages,
  Church,
  Users,
  Info,
  Calendar,
} from "lucide-react";
import Head from "next/head";
import Image from "next/image";
import { Id } from "@convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuthContext } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import {
  fetchUserProfileImages,
  fetchUserProfile,
} from "@/lib/profile/userProfileApi";
import Link from "next/link";
import {
  sendInterest,
  removeInterest,
  getSentInterests,
} from "@/lib/interestUtils";
import type { Profile } from "@/types/profile";

// Helper: theme color for toast
const toastTheme = {
  style: {
    background: "#fce7f3", // Tailwind pink-100
    color: "#be185d", // Tailwind pink-700
    border: "1px solid #f472b6", // Tailwind pink-400
    fontWeight: 500,
  },
  iconTheme: {
    primary: "#db2777", // Tailwind pink-600
    secondary: "#fff",
  },
};

type Interest = {
  id: string;
  toUserId: string;
  fromUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};

export default function ProfileDetailPage() {
  const params = useParams();
  const { token, profile: currentUserProfile } = useAuthContext();

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

  // Fix: Use .data, not .data.profileData
  const profile: Profile | null = profileData?.data ?? null;

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
    enabled: !!token && !!userId,
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
  }, [isOwnProfile, localCurrentUserImageOrder, userProfileImagesResponse]);

  // Use currentUserProfile._id as fromUserId and userId from params as toUserId
  const fromUserId = currentUserProfile?.userId;
  const toUserId = userId;

  // --- BEGIN: Add local state for interest status ---
  const {
    data: sentInterests,
    isLoading: loadingInterests,
    refetch: refetchSentInterests,
  } = useQuery<Interest[]>({
    queryKey: ["sentInterests", fromUserId, toUserId, token],
    queryFn: async () => {
      if (!token || !fromUserId) return [];
      // getSentInterests expects (token, userId), where userId is the current user's id
      // But we want to get interests sent by current user to the profile user
      // So we fetch all sent interests by current user, then filter for toUserId
      return await getSentInterests(token, fromUserId);
    },
    enabled: !!token && !!fromUserId,
    retry: false,
  });

  // Local state to control the heart/interest button for instant UI feedback
  const [localInterest, setLocalInterest] = useState<null | boolean>(null);

  // Compute alreadySentInterest, but allow local override for instant UI
  const alreadySentInterest = useMemo(() => {
    if (localInterest !== null) return localInterest;
    if (!sentInterests || !Array.isArray(sentInterests)) return false;
    return sentInterests.some(
      (interest) =>
        interest.toUserId === toUserId &&
        interest.fromUserId === fromUserId &&
        interest.status === "pending"
    );
  }, [sentInterests, toUserId, fromUserId, localInterest]);
  // --- END: Add local state for interest status ---

  let invalidIdError: string | null = null;
  if (
    toUserId &&
    typeof toUserId === "string" &&
    toUserId.startsWith("user_")
  ) {
    invalidIdError =
      "Internal error: Attempted to fetch profile with Clerk ID instead of Convex user ID.";
    toast.error(
      "Internal error: Attempted to fetch profile with Clerk ID instead of Convex user ID.",
      toastTheme
    );
  }

  const [currentImageIdx, setCurrentImageIdx] = useState<number>(0);
  const imagesKey = imagesToShow.join(",");

  const [interestError, setInterestError] = useState<string | null>(null);

  if (invalidIdError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-red-600 text-lg font-semibold">
          {invalidIdError}
        </div>
      </div>
    );
  }

  // Fix: Show skeleton while loading, and only show "Profile Not Found" if not loading and error or missing data
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

  if (
    !loadingProfile &&
    (profileError || profile === null || profile === undefined)
  ) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="shadow-2xl rounded-2xl overflow-hidden max-w-lg w-full">
          <CardHeader className="p-0">
            <div
              className="w-full flex items-center justify-center bg-gray-100"
              style={{ aspectRatio: "1 / 1" }}
            >
              <UserCircle className="w-28 h-28 text-gray-300" />
            </div>
          </CardHeader>
          <CardContent className="p-10 flex flex-col items-center">
            <div className="text-2xl font-bold text-gray-800 mb-2">
              Profile Not Found
            </div>
            <div className="text-gray-600 mb-4 text-center">
              Sorry, we couldn&apos;t find the profile you were looking for.
              <br />
              It may have been removed, or the link is incorrect.
            </div>
            <Link
              href="/"
              className="mt-2 px-6 py-2 bg-pink-600 text-white rounded-full hover:bg-pink-700 transition-colors"
            >
              Go back to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, type: "spring" },
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
      transition: { delay: 0.1 + i * 0.07, duration: 0.35, type: "spring" },
    }),
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
  };

  const buttonVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
    tap: { scale: 0.92 },
  };

  // --- BEGIN: Update handleInterestClick for instant UI feedback ---
  const handleInterestClick = async () => {
    if (!fromUserId || typeof fromUserId !== "string") {
      toast.error("User ID not available", toastTheme);
      return;
    }
    if (!toUserId || typeof toUserId !== "string") {
      toast.error("Target user ID not available", toastTheme);
      return;
    }
    if (!token || typeof token !== "string") {
      toast.error("Token not available", toastTheme);
      return;
    }
    setInterestError(null);
    try {
      if (alreadySentInterest) {
        // Optimistically update UI: switch heart back immediately
        setLocalInterest(false);
        const responseData = await removeInterest(token, fromUserId, toUserId);
        toast.success("Interest withdrawn successfully!", toastTheme);
        await refetchSentInterests();
        setLocalInterest(null); // Let server state take over
        return responseData;
      } else {
        // Optimistically update UI: switch heart immediately
        setLocalInterest(true);
        const responseData = await sendInterest(token, fromUserId, toUserId);
        toast.success("Interest sent successfully!", toastTheme);
        await refetchSentInterests();
        setLocalInterest(null); // Let server state take over
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
      toast.error(msg, toastTheme);
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
        <span className="text-pink-500">{icon}</span>
        <span className="font-medium">{label}:</span>
        <span className="text-gray-800">{value ?? "-"}</span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>
          {profile?.fullName ? `${profile.fullName}'s Profile` : "View Profile"}{" "}
          | Aroosi
        </title>
        <meta
          name="description"
          content={`View ${profile?.fullName || "user"}'s detailed profile on Aroosi, the UK's trusted Muslim matrimony platform.`}
        />
        {/* ... other meta tags ... */}
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 via-rose-50 to-white py-16 px-4">
        <motion.div
          key="profile-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="max-w-3xl w-full mx-auto"
        >
          <Card className="shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="p-0">
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
            <CardContent className="p-10">
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
                  className="flex items-center gap-2 text-4xl font-serif font-bold text-gray-900 mb-1"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  <UserCircle className="w-8 h-8 text-pink-500" />
                  {profile?.fullName ?? "-"}
                </div>
                <div
                  className="flex items-center gap-2 text-lg text-gray-600 mb-1"
                  style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
                >
                  <MapPin className="w-5 h-5 text-pink-400" />
                  {profile?.ukCity ?? "-"}
                </div>
                <div
                  className="flex items-center gap-2 text-lg text-gray-600 mb-1"
                  style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
                >
                  <Church className="w-5 h-5 text-pink-400" />
                  {profile?.religion ?? "-"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Calendar className="w-4 h-4 text-pink-300" />
                  <span>Member since:</span>
                  <span>
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </motion.div>
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.25, duration: 0.5 },
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Church className="w-5 h-5 text-pink-400" />
                    Cultural & Religious Background
                  </h3>
                  <IconRow
                    icon={<Church className="w-4 h-4" />}
                    label="Religion"
                    value={profile?.religion ?? "-"}
                  />
                  <IconRow
                    icon={<Languages className="w-4 h-4" />}
                    label="Mother Tongue"
                    value={profile?.motherTongue ?? "-"}
                  />
                  <IconRow
                    icon={<Users className="w-4 h-4" />}
                    label="Marital Status"
                    value={profile?.maritalStatus ?? "-"}
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-pink-400" />
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
                  <IconRow
                    icon={<Ruler className="w-4 h-4" />}
                    label="Height"
                    value={profile?.height ?? "-"}
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-pink-400" />
                    Location (UK)
                  </h3>
                  <IconRow
                    icon={<MapPin className="w-4 h-4" />}
                    label="City"
                    value={profile?.ukCity ?? "-"}
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Info className="w-5 h-5 text-pink-400" />
                    About Me
                  </h3>
                  <div className="flex items-start gap-2 text-gray-700">
                    <Info className="w-4 h-4 mt-0.5 text-pink-400" />
                    <span>{profile?.aboutMe ?? "-"}</span>
                  </div>
                </div>
              </motion.div>
              <div className="flex justify-center gap-8 mt-8 mb-2">
                <AnimatePresence>
                  {!isOwnProfile && (
                    <motion.button
                      key={
                        alreadySentInterest
                          ? "withdraw-interest"
                          : "express-interest"
                      }
                      className={`flex items-center justify-center rounded-full p-4 shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 ${
                        alreadySentInterest
                          ? "bg-gray-200 hover:bg-gray-300 text-pink-600 border border-gray-300"
                          : "bg-pink-600 hover:bg-pink-700 text-white"
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
                            <HeartOff className="w-10 h-10 fill-pink-600 text-pink-600" />
                          </div>
                        ) : (
                          <Heart className="w-10 h-10" />
                        )}
                      </motion.span>
                    </motion.button>
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