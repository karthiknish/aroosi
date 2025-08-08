"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye,
  MapPin,
  UserCircle,
  Heart,
  Phone,
  GraduationCap,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useAuthContext } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { SpotlightIcon } from "@/components/ui/spotlight-badge";
import { updateSpotlightBadge } from "@/lib/utils/spotlightBadgeApi";

// Define types for images and matches
interface ImageType {
  storageId: string;
  url?: string | null;
  [key: string]: unknown;
}
interface MatchType {
  [key: string]: unknown;
}

export default function AdminProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isLoaded: authIsLoaded, isSignedIn, isAdmin, isAuthenticated } = useAuthContext();

  // All hooks must be called unconditionally
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{
    storageId: string;
    isMain: boolean;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirect if not admin or not loaded yet
  useEffect(() => {
    if (authIsLoaded && (!isSignedIn || !isAdmin)) {
      router.push("/");
    }
  }, [authIsLoaded, isSignedIn, isAdmin, router]);

  // React Query for profile with caching
  const {
    data: profile,
    isLoading: loadingProfile,
    isError: profileError,
    error: profileErrObj,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["adminProfile", id],
    queryFn: async () => {
      const cacheKey = `adminProfile_${id}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      if (cachedData && cacheTimestamp) {
        const cacheAge = now - parseInt(cacheTimestamp, 10);
        if (cacheAge < 5 * 60 * 1000) {
          return JSON.parse(cachedData);
        }
      }
      const { getJson } = await import("@/lib/http/client");
      const data = await getJson<any>(`/api/admin/profiles/${id}?nocache=true`, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "max-age=300, stale-while-revalidate=60",
          "x-client-check": "admin-profile",
        },
        cache: "no-store",
        next: { revalidate: 300 } as any,
      });
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      return data;
    },
    // Strict guard: only run after auth is hydrated and admin is authenticated
    enabled: !!id && authIsLoaded && isAuthenticated && isSignedIn && isAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  const userId = profile?.userId;
  const { data: images = [] } = useQuery<ImageType[]>({
    queryKey: ["adminProfileImages", userId],
    queryFn: async () => {
      if (!userId) return [];
      const cacheKey = `adminProfileImages_${userId}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      if (cachedData && cacheTimestamp) {
        const cacheAge = now - parseInt(cacheTimestamp, 10);
        if (cacheAge < 5 * 60 * 1000) {
          return JSON.parse(cachedData);
        }
      }
      const { getJson } = await import("@/lib/http/client");
      const payload = await getJson<any>(
        `/api/profile-detail/${userId}/images?nocache=true`,
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "max-age=300, stale-while-revalidate=60",
            "x-client-check": "admin-profile-images",
          },
          cache: "no-store",
          next: { revalidate: 300 } as any,
        }
      );
      const data = (payload?.userProfileImages ?? []) as ImageType[];
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      return data;
    },
    enabled: !!userId && authIsLoaded && isAuthenticated && isSignedIn && isAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: matches = [] } = useQuery<MatchType[]>({
    queryKey: ["adminProfileMatches", id],
    queryFn: async () => {
      const cacheKey = `adminProfileMatches_${id}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
      const now = Date.now();
      if (cachedData && cacheTimestamp) {
        const cacheAge = now - parseInt(cacheTimestamp, 10);
        if (cacheAge < 5 * 60 * 1000) {
          return JSON.parse(cachedData);
        }
      }
      const { getJson } = await import("@/lib/http/client");
      const data = await getJson<MatchType[]>(
        `/api/admin/profiles/${id}/matches?nocache=true`,
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "max-age=300, stale-while-revalidate=60",
            "x-client-check": "admin-profile-matches",
          },
          cache: "no-store",
          next: { revalidate: 300 } as any,
        }
      );
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      return data;
    },
    enabled: !!id && authIsLoaded && isAuthenticated && isSignedIn && isAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  const { orderedImages: orderedImagesRaw } = React.useMemo(() => {
    const defaultReturn = { orderedImages: [] as ImageType[] };
    if (!profile) return defaultReturn;
    const validImages: ImageType[] = Array.isArray(images) ? images : [];
    if (validImages.length === 0) return defaultReturn;
    const map: Record<string, ImageType> = Object.fromEntries(
      validImages.map((img) => [String(img.storageId), img]),
    );
    const all = [...validImages];
    let ordered: ImageType[] = [];
    const profileImageIds = Array.isArray(profile.profileImageIds)
      ? profile.profileImageIds
      : [];
    const hasProfileImageIds = profileImageIds.length > 0;
    if (hasProfileImageIds) {
      ordered = profileImageIds.map((id: string) => map[id]).filter(Boolean);
    }
    if (!hasProfileImageIds || ordered.length === 0) {
      ordered = all;
    }
    return {
      orderedImages: Array.isArray(ordered) ? ordered : [],
    };
  }, [images, profile]);

  const orderedImages: ImageType[] = Array.isArray(orderedImagesRaw)
    ? orderedImagesRaw
    : [];
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  // Loading state
  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // Error state for main profile fetch
  if (profileError) {
    return (
      <ErrorState
        message={
          profileErrObj instanceof Error
            ? profileErrObj.message
            : "Failed to load profile."
        }
        onRetry={() => refetchProfile()}
        className="min-h-screen"
      />
    );
  }

  if (!profile) {
    return <EmptyState message="Profile not found." className="min-h-screen" />;
  }

  const handleDeleteImage = async () => {
    if (!profile?.userId || !imageToDelete) return;
    const { storageId } = imageToDelete;

    try {
      setIsDeleting(true);
      const { deleteJson } = await import("@/lib/http/client");
      const deleteRes = await deleteJson<{ success?: boolean }>(`/api/profile-images`, {
        headers: { "Content-Type": "application/json", "x-client-check": "admin-delete-image" },
        body: { userId: profile.userId, imageId: storageId } as any,
      } as any);

      if (deleteRes && (deleteRes as any).success !== false) {
        showSuccessToast("Image deleted successfully");
        setImageToDelete(null);
        setIsDeleteModalOpen(false);
      } else {
        console.error("Error deleting image");
        showErrorToast(null, "Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      showErrorToast(null, "Failed to delete image");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (storageId: string, isMain: boolean = false) => {
    setImageToDelete({ storageId, isMain });
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setImageToDelete(null);
  };

  const handlePrev = () => {
    setCurrentImageIdx((prev) =>
      prev === 0 ? orderedImages.length - 1 : prev - 1,
    );
  };
  const handleNext = () => {
    setCurrentImageIdx((prev) =>
      prev === orderedImages.length - 1 ? 0 : prev + 1,
    );
  };

  const renderDeleteConfirmation = () => {
    if (!imageToDelete) return null;

    return (
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteImage}
        isLoading={isDeleting}
        title="Delete Image"
        description="Are you sure you want to delete this image?"
      />
    );
  };

  const handleToggleSpotlightBadge = async (id: string) => {
    if (!profile?._id) return;
    try {
      await updateSpotlightBadge(
        id,
        {
          hasSpotlightBadge: !profile.hasSpotlightBadge,
          durationDays: 30,
        },
        undefined,
      );

      showSuccessToast(
        profile.hasSpotlightBadge
          ? "Spotlight badge removed."
          : "Spotlight badge granted for 30 days.",
      );

      // Refresh profile data
      void refetchProfile();
    } catch (error) {
      showErrorToast(
        null,
        error instanceof Error
          ? error.message
          : "Failed to update spotlight badge",
      );
    }
  };

  const matchesSection =
    matches.length === 0 ? (
      <EmptyState message="No matches found." />
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {matches.map((m: Record<string, unknown>, idx: number) => {
          const profileImageIds = Array.isArray(m.profileImageIds)
            ? m.profileImageIds
            : [];
          const matchImageUrl =
            profileImageIds.length > 0
              ? `/api/storage/${String(profileImageIds[0])}`
              : null;
          const fullName =
            typeof m.fullName === "string" ? m.fullName : "Unnamed";
          const city = typeof m.city === "string" ? m.city : "-";
          const id =
            typeof m._id === "string" || typeof m._id === "number"
              ? m._id
              : idx;
          return (
            <div
              key={id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border hover:shadow transition"
            >
              {matchImageUrl ? (
                <img
                  src={matchImageUrl}
                  alt={fullName}
                  className="w-16 h-16 rounded-full object-cover border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border">
                  <UserCircle className="w-10 h-10 text-gray-300" />
                </div>
              )}
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{fullName}</div>
                <div className="text-sm text-gray-500">{city}</div>
              </div>
              <Link
                href={`/admin/profile/${id}`}
                className="text-pink-600 hover:text-pink-800 font-semibold text-xs flex items-center gap-1"
              >
                <Eye className="w-4 h-4" /> View
              </Link>
            </div>
          );
        })}
      </div>
    );

  return (
    <div className="max-w-3xl  mx-auto py-10 px-2">
      {/* Profile Images Slider Section */}
      <Card className="mb-8 mt-8">
        <CardContent>
          {Array.isArray(orderedImages) && orderedImages.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="relative w-64 h-64 flex items-center justify-center">
                {/* Only show arrows if more than one image */}
                {Array.isArray(orderedImages) && orderedImages.length > 1 && (
                  <button
                    onClick={handlePrev}
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-pink-100 transition z-10"
                    aria-label="Previous image"
                    type="button"
                  >
                    <ChevronLeft className="w-6 h-6 text-pink-600" />
                  </button>
                )}

                <div className="w-full mt-8 h-full flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden relative group">
                  <div className="w-full h-full flex items-center justify-center">
                    <Image
                      src={
                        (orderedImages[currentImageIdx]?.url ?? undefined) ||
                        (orderedImages[currentImageIdx]?.storageId
                          ? `/api/storage/${orderedImages[currentImageIdx].storageId}`
                          : "https://hds.hel.fi/images/foundation/visual-assets/placeholders/user-image-l@3x.png")
                      }
                      alt={typeof profile?.fullName === "string"
                        ? `${profile.fullName} profile photo ${currentImageIdx + 1}`
                        : `Profile photo ${currentImageIdx + 1}`}
                      width={256}
                      height={256}
                      className="max-h-full  max-w-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (orderedImages[currentImageIdx]?.storageId) {
                          target.src = `/api/storage/${orderedImages[currentImageIdx].storageId}`;
                        } else {
                          target.src =
                            "https://hds.hel.fi/images/foundation/visual-assets/placeholders/user-image-l@3x.png";
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      if (orderedImages[currentImageIdx]?.storageId) {
                        openDeleteModal(
                          orderedImages[currentImageIdx].storageId,
                          currentImageIdx === 0
                        );
                      }
                      return false;
                    }}
                    onMouseDown={(e) => {
                      // Prevent focus change which might trigger blur on other elements
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Only show arrows if more than one image */}
                {Array.isArray(orderedImages) && orderedImages.length > 1 && (
                  <button
                    onClick={handleNext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-pink-100 transition z-10"
                    aria-label="Next image"
                    type="button"
                  >
                    <ChevronRight className="w-6 h-6 text-pink-600" />
                  </button>
                )}

                <div className="absolute bottom-2 right-2 bg-white/80 text-xs px-2 py-0.5 rounded shadow">
                  {currentImageIdx + 1} / {orderedImages.length}
                </div>
              </div>

              {/* Thumbnail navigation */}
              <div className="flex flex-col gap-4 mt-8">
                {/* Dots for mobile */}
                {Array.isArray(orderedImages) && orderedImages.length > 1 && (
                  <div className="flex gap-2 justify-center">
                    {orderedImages.map((_, idx) => (
                      <button
                        key={idx}
                        className={`w-3 h-3 rounded-full border-2 ${
                          idx === currentImageIdx
                            ? "bg-pink-600 border-pink-600"
                            : "bg-gray-200 border-gray-300"
                        }`}
                        onClick={() => setCurrentImageIdx(idx)}
                        aria-label={`Go to image ${idx + 1}`}
                        type="button"
                      />
                    ))}
                  </div>
                )}

                {/* Image grid */}
                {Array.isArray(orderedImages) && orderedImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {orderedImages.map((img, idx) => (
                      <div
                        key={String(img.storageId) || idx}
                        className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                          idx === currentImageIdx
                            ? "border-pink-500 ring-2 ring-pink-200"
                            : "border-transparent hover:border-gray-300"
                        }`}
                        onClick={() => setCurrentImageIdx(idx)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Select image ${idx + 1}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setCurrentImageIdx(idx);
                          }
                        }}
                      >
                        <Image
                          src={
                            (img.url ?? undefined) ||
                            `/api/storage/${img.storageId}`
                          }
                          alt={
                            typeof profile?.fullName === "string"
                              ? `${profile.fullName} profile photo ${idx + 1}`
                              : `Profile photo ${idx + 1}`
                          }
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://hds.hel.fi/images/foundation/visual-assets/placeholders/user-image-l@3x.png";
                          }}
                        />
                        {idx === 0 && (
                          <div className="absolute top-1 left-1 bg-pink-500 text-white text-xs px-1 rounded">
                            Main
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            openDeleteModal(img.storageId, idx === 0);
                            return false;
                          }}
                          onMouseDown={(e) => {
                            // Prevent focus change which might trigger blur on other elements
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No profile images available
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8 shadow-xl">
        <CardContent className="pt-8 pb-10 px-6 flex flex-col items-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {typeof profile?.fullName === "string"
              ? profile.fullName
              : "Unnamed"}
          </div>
          <div className="text-md text-gray-600 flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" />{" "}
            {typeof profile?.city === "string" ? profile.city : "-"}
          </div>
          <div className="flex flex-wrap gap-4 justify-center mb-4">
            <div className="flex items-center gap-1 text-gray-500">
              <Heart className="w-4 h-4" />{" "}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <GraduationCap className="w-4 h-4" />{" "}
              {typeof profile?.education === "string" ? profile.education : "-"}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Briefcase className="w-4 h-4" />{" "}
              {typeof profile?.occupation === "string"
                ? profile.occupation
                : "-"}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Phone className="w-4 h-4" />{" "}
              {typeof profile?.phoneNumber === "string"
                ? profile.phoneNumber
                : "-"}
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-2">
            Profile ID: {typeof profile?._id === "string" ? profile._id : "-"}
          </div>
        </CardContent>
      </Card>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex gap-2">
              {/* Add spotlight badge management */}
              <Button
                variant={profile?.hasSpotlightBadge ? "default" : "outline"}
                onClick={() => handleToggleSpotlightBadge(String(profile?._id))}
                className="flex items-center gap-1"
              >
                <SpotlightIcon className="w-4 h-4" />
                {profile?.hasSpotlightBadge
                  ? "Remove Spotlight"
                  : "Add Spotlight"}
              </Button>
            </div>

            {/* Show spotlight badge expiration if active */}
            {profile?.hasSpotlightBadge && profile?.spotlightBadgeExpiresAt && (
              <div className="text-sm text-gray-600 flex items-center gap-1">
                <SpotlightIcon className="w-3 h-3" />
                Spotlight expires:{" "}
                {new Date(profile.spotlightBadgeExpiresAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <span className="font-semibold">Date of Birth:</span>{" "}
              {typeof profile?.dateOfBirth === "string"
                ? profile.dateOfBirth
                : "-"}
            </div>
            <div>
              <span className="font-semibold">Gender:</span>{" "}
              {typeof profile?.gender === "string" ? profile.gender : "-"}
            </div>
            <div>
              <span className="font-semibold">Postcode:</span>{" "}
              {typeof profile?.country === "string" ? profile.country : "-"}
            </div>
            <div>
              <span className="font-semibold">Height:</span>{" "}
              {typeof profile?.height === "string" ? profile.height : "-"}
            </div>
            <div>
              <span className="font-semibold">Marital Status:</span>{" "}
              {typeof profile?.maritalStatus === "string"
                ? profile.maritalStatus
                : "-"}
            </div>
            <div>
              <span className="font-semibold">Annual Income:</span>{" "}
              {typeof profile?.annualIncome === "string" ||
              typeof profile?.annualIncome === "number"
                ? profile.annualIncome
                : "-"}
            </div>
            <div>
              <span className="font-semibold">Diet:</span>{" "}
              {typeof profile?.diet === "string" ? profile.diet : "-"}
            </div>
            <div>
              <span className="font-semibold">Smoking:</span>{" "}
              {typeof profile?.smoking === "string" ? profile.smoking : "-"}
            </div>
            <div>
              <span className="font-semibold">Drinking:</span>{" "}
              {typeof profile?.drinking === "string" ? profile.drinking : "-"}
            </div>
            <div>
              <span className="font-semibold">Physical Status:</span>{" "}
              {typeof profile?.physicalStatus === "string"
                ? profile.physicalStatus
                : "-"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">About Me:</span>{" "}
              <span className="text-gray-700">
                {typeof profile?.aboutMe === "string" ? profile.aboutMe : "-"}
              </span>
            </div>
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <span className="font-semibold">Partner Preference Age:</span>{" "}
              {typeof profile?.partnerPreferenceAgeMin === "number" ||
              typeof profile?.partnerPreferenceAgeMin === "string"
                ? profile.partnerPreferenceAgeMin
                : "-"}{" "}
              -{" "}
              {typeof profile?.partnerPreferenceAgeMax === "number" ||
              typeof profile?.partnerPreferenceAgeMax === "string"
                ? profile.partnerPreferenceAgeMax
                : "-"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">Partner Preference City:</span>{" "}
              {Array.isArray(profile?.partnerPreferenceCity)
                ? profile.partnerPreferenceCity.join(", ")
                : "-"}
            </div>
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <span className="font-semibold">Banned:</span>{" "}
              {profile?.banned ? "Yes" : "No"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">Created At:</span>{" "}
              {profile?.createdAt
                ? new Date(String(profile.createdAt)).toLocaleString()
                : "-"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">Updated At:</span>{" "}
              {profile?.updatedAt
                ? new Date(String(profile.updatedAt)).toLocaleString()
                : "-"}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
        </CardHeader>
        <CardContent>{matchesSection}</CardContent>
      </Card>
      {renderDeleteConfirmation()}
    </div>
  );
}
