"use client";

import React, { useEffect, useState } from "react";

import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useParams } from "next/navigation";
import { UserCircle, HeartIcon, HeartOffIcon } from "lucide-react";
import { Id } from "@convex/_generated/dataModel";
import Image from "next/image";
import Head from "next/head";
import { ProfileDetailView, DisplaySection } from "./profileDetailHelpers";
import { Skeleton } from "@/components/ui/skeleton";

// --- Motion imports ---
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { User } from "@clerk/nextjs/server";
import { Profile } from "@/types/profile";
type Interest = { toUserId: Id<"users"> };

export default function ProfileDetailPage() {
  const params = useParams();
  const { isSignedIn } = useAuth();
  const { getToken } = useAuth();

  const [localCurrentUserImageOrder, setLocalCurrentUserImageOrder] = useState<
    string[]
  >([]);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [interestSent, setInterestSent] = useState<boolean>(false);

  // State for text/profile data
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [isMutualInterest, setIsMutualInterest] = useState<boolean>(false);
  const [sentInterest, setSentInterest] = useState<Interest[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // State for images
  const [userProfileImages, setUserProfileImages] = useState<
    {
      url: string;
      storageId: string;
    }[]
  >([]);
  const [userImages, setUserImages] = useState<Record<string, string>>({});
  const [currentUserProfileImagesData, setCurrentUserProfileImagesData] =
    useState<{ url: string; storageId: string }[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  const id = params?.id as string;
  const userId = id as Id<"users">;

  // Fetch text/profile data
  const refetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/profile-detail/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCurrentUser(data.currentUser);
      setProfileData(data.profileData || null);
      setIsBlocked(data.isBlocked);
      setIsMutualInterest(data.isMutualInterest);
      setSentInterest(data.sentInterest || []);
    } catch (e: unknown) {
      console.error(e);
      setCurrentUser(null);
      setProfileData(null);
      setIsBlocked(false);
      setIsMutualInterest(false);
      setSentInterest([]);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    refetchProfile();
    console.log("refetched profile", loadingImages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, id]);

  // Fetch images only after profile data is loaded and valid
  useEffect(() => {
    if (loadingProfile || !profileData) return;
    async function fetchImages() {
      setLoadingImages(true);
      try {
        const token = await getToken();
        const res = await fetch(`/api/profile-detail/${userId}/images`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUserProfileImages(data.userProfileImages || []);
        setUserImages(data.userImages || {});
        setCurrentUserProfileImagesData(
          data.currentUserProfileImagesData || []
        );
      } catch (e: unknown) {
        console.error(e);
        setUserProfileImages([]);
        setUserImages({});
        setCurrentUserProfileImagesData([]);
      } finally {
        setLoadingImages(false);
      }
    }
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProfile, profileData, id]);

  // Derived values
  const currentUserId = currentUser?.id;
  const isOwnProfile = Boolean(
    currentUserId && userId && currentUserId === userId
  );

  useEffect(() => {
    if (isOwnProfile && currentUserProfileImagesData) {
      const initialOrder = currentUserProfileImagesData
        .filter((img) => img && img.storageId)
        .map((img) => img.storageId);
      setLocalCurrentUserImageOrder(initialOrder);
    } else if (!isOwnProfile && profileData?.profileImageIds) {
      setLocalCurrentUserImageOrder(profileData.profileImageIds);
    }
  }, [
    isOwnProfile,
    currentUserProfileImagesData,
    profileData?.profileImageIds,
  ]);

  // Loading states
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
    ? currentUserProfileImagesData || []
    : userProfileImages || [];

  if (imagesToDisplay && Array.isArray(imagesToDisplay)) {
    for (const img of imagesToDisplay) {
      if (img?.url && img?.storageId) {
        storageIdToUrlMap[img.storageId] = img.url;
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

  const alreadySentInterest =
    Array.isArray(sentInterest) && sentInterest.length > 0
      ? sentInterest.some((i: unknown) => {
          if (typeof i === "object" && i !== null && "toUserId" in i) {
            return (i as Interest).toUserId === userId;
          }
          return false;
        })
      : false;

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
        <AnimatePresence>
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
                  <DisplaySection title="Cultural & Religious Background">
                    <ProfileDetailView
                      label="Religion"
                      value={profile.religion}
                    />
                    <ProfileDetailView
                      label="Mother Tongue"
                      value={profile.motherTongue}
                    />
                    <ProfileDetailView
                      label="Marital Status"
                      value={profile.maritalStatus}
                    />
                  </DisplaySection>
                  <DisplaySection title="Education & Career">
                    <ProfileDetailView
                      label="Education"
                      value={profile.education}
                    />
                    <ProfileDetailView
                      label="Occupation"
                      value={profile.occupation}
                    />
                    <ProfileDetailView label="Height" value={profile.height} />
                  </DisplaySection>
                  <DisplaySection title="Location (UK)">
                    <ProfileDetailView label="City" value={profile.ukCity} />
                  </DisplaySection>
                  <DisplaySection title="About Me">
                    <ProfileDetailView
                      label="Bio"
                      value={profile.aboutMe}
                      isTextArea
                    />
                  </DisplaySection>
                </motion.div>
                <div className="flex justify-center gap-8 mt-8 mb-2">
                  <AnimatePresence>
                    {!isOwnProfile &&
                      !isBlocked &&
                      !isMutualInterest &&
                      !interestSent && (
                        <motion.button
                          key="express-interest"
                          className="flex items-center justify-center rounded-full bg-pink-600 hover:bg-pink-700 text-white p-4 shadow-lg transition-colors"
                          variants={buttonVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          whileTap="tap"
                          onClick={async () => {
                            if (!currentUserId || !userId) return;
                            setInterestSent(true);
                            setInterestError(null);
                            try {
                              const token = await getToken();
                              const res = await fetch(
                                "/api/interests/express",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    fromUserId: currentUserId,
                                    toUserId: userId,
                                  }),
                                }
                              );
                              if (!res.ok) {
                                const err = await res.json();
                                if (
                                  err?.error &&
                                  err.error.includes("already sent")
                                ) {
                                  toast.success("Interest already sent!");
                                  await refetchProfile();
                                  return;
                                }
                                setInterestSent(false);
                                setInterestError(
                                  err?.error || "Failed to send interest"
                                );
                                toast.error(
                                  err?.error || "Failed to send interest"
                                );
                                return;
                              }
                              toast.success("Interest sent!");
                              await refetchProfile();
                            } catch (e: unknown) {
                              console.error(e);
                              setInterestSent(false);
                              setInterestError(
                                (e as Error).message ||
                                  "Failed to send interest"
                              );
                              toast.error(
                                (e as Error).message ||
                                  "Failed to send interest"
                              );
                            }
                          }}
                          title="Express Interest"
                          aria-label="Express Interest"
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
                            <HeartIcon className="w-10 h-10" />
                          </motion.span>
                        </motion.button>
                      )}
                    {!isOwnProfile &&
                      !isBlocked &&
                      !isMutualInterest &&
                      interestSent && (
                        <motion.button
                          key="withdraw-interest"
                          className="flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-pink-600 p-4 border border-gray-300 shadow-lg transition-colors"
                          variants={buttonVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          whileTap="tap"
                          onClick={async () => {
                            if (!currentUserId || !userId) return;
                            setInterestSent(false);
                            setInterestError(null);
                            try {
                              const token = await getToken();
                              const res = await fetch("/api/interests/remove", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  fromUserId: currentUserId,
                                  toUserId: userId,
                                }),
                              });
                              if (!res.ok) {
                                const err = await res.json();
                                setInterestSent(true);
                                setInterestError(
                                  err?.error || "Failed to remove interest"
                                );
                                toast.error(
                                  err?.error || "Failed to remove interest"
                                );
                                return;
                              }
                              toast.success("Interest withdrawn.");
                              await refetchProfile();
                            } catch (e: unknown) {
                              setInterestSent(true);
                              setInterestError(
                                (e as Error).message ||
                                  "Failed to remove interest"
                              );
                              toast.error(
                                (e as Error).message ||
                                  "Failed to remove interest"
                              );
                            }
                          }}
                          title="Withdraw Interest"
                          aria-label="Withdraw Interest"
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
                            <HeartOffIcon className="w-10 h-10" />
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
        </AnimatePresence>
      </div>
    </>
  );
}