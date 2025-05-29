"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle } from "lucide-react";
import Head from "next/head";
import Image from "next/image";
import { Id } from "@convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Heart, HeartOff } from "lucide-react";
import { useToken } from "@/components/TokenProvider";
type Interest = {
  id: string;
  toUserId: string;
  fromUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};

type ProfileData = {
  id: string;
  fullName: string;
  email?: string;
  bio?: string;
  imageUrl?: string;
  interests: Interest[];
  profileImageIds?: string[];
  motherTongue?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  height?: string;
  ukCity?: string;
  aboutMe?: string;
  religion?: string;
  createdAt?: string;
};

export default function ProfileDetailPage() {
  const params = useParams();
  const token = useToken();
  const { isLoaded, isSignedIn, userId: clerkUserId } = useAuth();

  const [localCurrentUserImageOrder, setLocalCurrentUserImageOrder] = useState<
    string[]
  >([]);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMutualInterest, setIsMutualInterest] = useState(false);
  const [sentInterest, setSentInterest] = useState<Interest[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [interestLoading, setInterestLoading] = useState(false);
  const [userProfileImages, setUserProfileImages] = useState<
    { url: string; storageId: string }[]
  >([]);
  const [userImages, setUserImages] = useState<Record<string, string>>({});
  const [convexUserId, setConvexUserId] = useState<string | null>(null);

  // Get the current user ID from Clerk
  const currentUserId = clerkUserId ? (clerkUserId as Id<"users">) : null;

  // Derived values
  const id = params?.id as string;
  const userId = id as Id<"users">;
  const isOwnProfile = Boolean(
    currentUserId && userId && currentUserId === userId
  );

  // Memoized value for checking if interest is already sent
  const alreadySentInterest = useMemo(() => {
    return Array.isArray(sentInterest) && sentInterest.length > 0
      ? sentInterest.some((i) => {
          if (typeof i === "object" && i !== null && "toUserId" in i) {
            return i.toUserId === userId;
          }
          return false;
        })
      : false;
  }, [sentInterest, userId]);

  // Fetch Convex user ID and profile data together
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!token || !isLoaded || !isSignedIn || !userId) return;

      setLoadingProfile(true);
      try {
        // Fetch user data and profile data in parallel
        const [userResponse, profileResponse] = await Promise.all([
          fetch("/api/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`/api/profile-detail/${userId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!userResponse.ok) {
          throw new Error("Failed to fetch user data");
        }

        if (!profileResponse.ok) {
          const responseData = await profileResponse.json();
          throw new Error(responseData.error || "Failed to fetch profile data");
        }

        const userData = await userResponse.json();
        const profileData = await profileResponse.json();

        if (userData?._id) {
          setConvexUserId(userData._id);
        }

        setProfileData(profileData.profileData || null);
        setIsBlocked(!!profileData.isBlocked);
        setIsMutualInterest(!!profileData.isMutualInterest);
        setSentInterest(
          Array.isArray(profileData.sentInterest)
            ? profileData.sentInterest
            : []
        );

        // Fetch images if profile data exists
        if (profileData.profileData) {
          const imagesResponse = await fetch(
            `/api/profile-detail/${userId}/images`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!imagesResponse.ok) {
            throw new Error("Failed to fetch profile images");
          }

          const imagesData = await imagesResponse.json();
          setUserProfileImages(
            Array.isArray(imagesData.userProfileImages)
              ? imagesData.userProfileImages
              : []
          );
          setUserImages(imagesData.userImages || {});
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load data";
        toast.error(errorMessage);

        // Reset states on error
        setProfileData(null);
        setIsBlocked(false);
        setIsMutualInterest(false);
        setSentInterest([]);
        setUserProfileImages([]);
        setUserImages({});
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchInitialData();
  }, [token, isLoaded, isSignedIn, userId]);

  // Remove the separate effects for profile and images
  useEffect(() => {
    if (isOwnProfile && profileData?.profileImageIds) {
      setLocalCurrentUserImageOrder(profileData.profileImageIds);
    }
  }, [isOwnProfile, profileData?.profileImageIds]);

  // Loading states for profile data
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
  if (!profileData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        Profile not found.
      </div>
    );
  }

  // Fetch text/profile data

  // Now safe to use profile data
  const profile = profileData;

  // Type-safe access to userImages (for non-own profile's main image)
  const getPublicUserImage = (
    targetUserId: Id<"users"> | string | undefined
  ): string | undefined => {
    if (!targetUserId || !userImages) return undefined;
    return (userImages as Record<string, string | undefined>)[
      targetUserId.toString()
    ];
  };

  // For own profile: build a map of storageId to URL from currentUserProfileImagesData
  // For viewed profile (not own): userProfileImages gives the images for that specific profile.
  const storageIdToUrlMap: Record<string, string> = {};
  const imagesToDisplay = isOwnProfile
    ? profile?.profileImageIds || []
    : userProfileImages || [];

  if (imagesToDisplay && Array.isArray(imagesToDisplay)) {
    for (const img of imagesToDisplay) {
      if (
        typeof img === "object" &&
        img !== null &&
        "url" in img &&
        "storageId" in img
      ) {
        storageIdToUrlMap[img.storageId as string] = img.url as string;
      }
    }
  }

  const getImageUrlFromMap = (
    storageId: string | undefined
  ): string | undefined => {
    if (!storageId || !(storageId in storageIdToUrlMap)) return undefined;
    return storageIdToUrlMap[storageId];
  };

  // Determine the source of image IDs for mapping
  const imageIdsToRender = isOwnProfile
    ? localCurrentUserImageOrder
    : profile?.profileImageIds || [];
  const mainProfileImageId =
    imageIdsToRender.length > 0 ? imageIdsToRender[0] : undefined;
  const mainProfileImageUrl = isOwnProfile
    ? getImageUrlFromMap(mainProfileImageId)
    : userId
      ? getPublicUserImage(userId)
      : undefined;

  // Log relevant state for debugging the interest button
  console.log("sentInterest", sentInterest);
  console.log("isBlocked", isBlocked);
  console.log("isMutualInterest", isMutualInterest);
  console.log("alreadySentInterest", alreadySentInterest);

  // --- Motion variants ---
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

  // Handler for sending interest
  const handleSendInterest = async () => {
    if (!convexUserId) {
      toast.error("User ID not available");
      return;
    }

    setInterestLoading(true);
    setInterestError(null);

    try {
      const response = await fetch("/api/interests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromUserId: convexUserId,
          toUserId: userId,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            responseData.details ||
            "Failed to send interest"
        );
      }

      // Update local state
      setSentInterest([
        ...sentInterest,
        {
          id: responseData.data?.id || "temp-id",
          fromUserId: convexUserId,
          toUserId: userId,
          status: "pending",
          createdAt: new Date().toISOString(),
        },
      ]);

      toast.success("Interest sent successfully!");
      return responseData;
    } catch (error) {
      console.error("Error sending interest:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send interest";
      setInterestError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setInterestLoading(false);
    }
  };

  // Handler for withdrawing interest
  const handleWithdrawInterest = async () => {
    if (!convexUserId) {
      toast.error("User ID not available");
      return;
    }

    setInterestLoading(true);
    setInterestError(null);

    try {
      const response = await fetch("/api/interests", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromUserId: convexUserId,
          toUserId: userId,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            responseData.details ||
            "Failed to withdraw interest"
        );
      }

      // Update local state
      setSentInterest(
        sentInterest.filter(
          (interest) =>
            interest.fromUserId !== convexUserId || interest.toUserId !== userId
        )
      );

      toast.success("Interest withdrawn successfully!");
      return responseData;
    } catch (error) {
      console.error("Error removing interest:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to remove interest";
      setInterestError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setInterestLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>
          {profile.fullName ? `${profile.fullName}'s Profile` : "View Profile"}{" "}
          | Aroosi
        </title>
        <meta
          name="description"
          content={`View ${profile.fullName || "user"}'s detailed profile on Aroosi, the UK's trusted Muslim matrimony platform.`}
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
                    key="main-image"
                    variants={imageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative w-full"
                    style={{ aspectRatio: "1 / 1" }}
                  >
                    <Image
                      src={mainProfileImageUrl || "/placeholder.png"}
                      alt={profile.fullName || "Profile"}
                      fill
                      className="object-cover object-center"
                      priority
                    />
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
                  className="text-4xl font-serif font-bold text-gray-900 mb-1"
                  style={{ fontFamily: "Lora, serif" }}
                >
                  {profile.fullName}
                </div>
                <div
                  className="text-lg text-gray-600 mb-1"
                  style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
                >
                  {profile.ukCity || "-"}
                </div>
                <div
                  className="text-lg text-gray-600 mb-1"
                  style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
                >
                  {profile.religion || "-"}
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  Member since:{" "}
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : "-"}
                </div>
              </motion.div>
              {imageIdsToRender && imageIdsToRender.length > 0 && (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <AnimatePresence>
                    {imageIdsToRender.map((imgId: string, idx: number) => {
                      const effectiveUrl = getImageUrlFromMap(imgId);

                      return (
                        <motion.div
                          key={imgId}
                          className="relative w-full"
                          style={{ aspectRatio: "1 / 1" }}
                          custom={idx}
                          variants={galleryImageVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                        >
                          {effectiveUrl ? (
                            <div className="relative w-full h-full">
                              <Image
                                src={effectiveUrl}
                                alt={`${profile.fullName || "Profile"}'s image ${idx + 1}`}
                                fill
                                className="object-cover rounded-lg"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                              <UserCircle className="w-16 h-16 text-gray-300" />
                            </div>
                          )}
                          {/* Image order update buttons removed */}
                        </motion.div>
                      );
                    })}
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
                  <h3 className="font-semibold mb-2">
                    Cultural & Religious Background
                  </h3>
                  <div>Religion: {profile.religion || "-"}</div>
                  <div>Mother Tongue: {profile.motherTongue || "-"}</div>
                  <div>Marital Status: {profile.maritalStatus || "-"}</div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Education & Career</h3>
                  <div>Education: {profile.education || "-"}</div>
                  <div>Occupation: {profile.occupation || "-"}</div>
                  <div>Height: {profile.height || "-"}</div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Location (UK)</h3>
                  <div>City: {profile.ukCity || "-"}</div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">About Me</h3>
                  <div>{profile.aboutMe || "-"}</div>
                </div>
              </motion.div>
              <div className="flex justify-center gap-8 mt-8 mb-2">
                <AnimatePresence>
                  {!isOwnProfile && !isBlocked && !isMutualInterest && (
                    <motion.button
                      key={
                        alreadySentInterest
                          ? "withdraw-interest"
                          : "express-interest"
                      }
                      className={`flex items-center justify-center rounded-full p-4 shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 ${alreadySentInterest ? "bg-gray-200 hover:bg-gray-300 text-pink-600 border border-gray-300" : "bg-pink-600 hover:bg-pink-700 text-white"}`}
                      variants={buttonVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      whileTap="tap"
                      onClick={
                        alreadySentInterest
                          ? handleWithdrawInterest
                          : handleSendInterest
                      }
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
                      disabled={interestLoading}
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