"use client";

import { cn } from "@/lib/utils";
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
  Pencil,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { adminProfilesAPI } from "@/lib/api/admin/profiles";
import { adminMatchesAPI } from "@/lib/api/admin/matches";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorState } from "@/components/ui/error-state";
import { Empty, EmptyIcon, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { SpotlightIcon } from "@/components/ui/spotlight-badge";
import { Ban, Users as UsersIcon } from "lucide-react";

import type { Profile, ProfileImageInfo } from "@aroosi/shared/types";
interface MatchType {
  [key: string]: unknown;
}

export default function AdminProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    isLoaded: authIsLoaded,
    isSignedIn,
    isAdmin,
    isAuthenticated,
  } = useAuthContext();

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
      router.push("/search");
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
      const data = await adminProfilesAPI.get(String(id));
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

  // Many user docs use _id equal to userId; fall back safely when userId absent
  const userId =
    profile?.userId || (profile?._id ? String(profile._id) : undefined);
  const { data: images = [] } = useQuery<ProfileImageInfo[]>({
    queryKey: ["profileImages", userId, "admin"],
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
      const data = await adminProfilesAPI.getImages(String(userId));
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      sessionStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      return data;
    },
    enabled:
      !!userId && authIsLoaded && isAuthenticated && isSignedIn && isAdmin,
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
      const data = await adminMatchesAPI.getProfileMatches(String(id));
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
    const defaultReturn = { orderedImages: [] as ProfileImageInfo[] };
    if (!profile) return defaultReturn;
    const validImages: ProfileImageInfo[] = Array.isArray(images) ? images : [];
    if (validImages.length === 0) return defaultReturn;
    const map: Record<string, ProfileImageInfo> = Object.fromEntries(
      validImages.map((img) => [String(img.storageId), img])
    );
    const all = [...validImages];
    let ordered: ProfileImageInfo[] = [];
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

  const orderedImages: ProfileImageInfo[] = Array.isArray(orderedImagesRaw)
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
    return (
      <Empty className="min-h-screen">
        <EmptyIcon icon={Ban} />
        <EmptyTitle>Profile not found</EmptyTitle>
        <EmptyDescription>
          The profile you are looking for does not exist or has been deleted.
        </EmptyDescription>
      </Empty>
    );
  }

  const handleDeleteImage = async () => {
    if (!profile?.userId || !imageToDelete) return;
    const { storageId } = imageToDelete;

    try {
      setIsDeleting(true);
      if (!profile?.userId) throw new Error("Missing userId for deletion");
      await adminProfilesAPI.deleteImage(profile.userId, storageId);
      showSuccessToast("Image deleted successfully");
      setImageToDelete(null);
      setIsDeleteModalOpen(false);
      void refetchProfile();
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error : null,
        "Failed to delete image"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (storageId: string, isMain: boolean = false) => {
    setImageToDelete({ storageId, isMain });
    setIsDeleteModalOpen(true);
  };

  const handlePrev = () => {
    setCurrentImageIdx((prev) =>
      prev === 0 ? orderedImages.length - 1 : prev - 1
    );
  };
  const handleNext = () => {
    setCurrentImageIdx((prev) =>
      prev === orderedImages.length - 1 ? 0 : prev + 1
    );
  };

  const renderDeleteConfirmation = () => {
    if (!imageToDelete) return null;

    return (
      <AlertDialog
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) setImageToDelete(null);
        }}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteImage();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  const handleToggleSpotlightBadge = async (id: string) => {
    if (!profile?._id) return;
    try {
      await adminProfilesAPI.updateSpotlight(id, {
        hasSpotlightBadge: !profile.hasSpotlightBadge,
        durationDays: 30,
      });

      showSuccessToast(
        profile.hasSpotlightBadge
          ? "Spotlight badge removed."
          : "Spotlight badge granted for 30 days."
      );

      // Refresh profile data
      void refetchProfile();
    } catch (error) {
      showErrorToast(
        null,
        error instanceof Error
          ? error.message
          : "Failed to update spotlight badge"
      );
    }
  };

  const matchesSection =
    matches.length === 0 ? (
      <Empty>
        <EmptyIcon icon={UsersIcon} />
        <EmptyTitle>No matches found</EmptyTitle>
        <EmptyDescription>
          This user doesn&apos;t have any matches yet.
        </EmptyDescription>
      </Empty>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {matches.map((m: Record<string, unknown>, idx: number) => {
          const profileImageIds = Array.isArray(m.profileImageIds)
            ? m.profileImageIds
            : [];
          // Use pre-normalized url from profileImageUrls array if aligned; otherwise build canonical GCS URL
          let matchImageUrl: string | null = null;
          if (profileImageIds.length > 0) {
            const firstId = String(profileImageIds[0]);
            const urls = Array.isArray((m as any).profileImageUrls)
              ? (m as any).profileImageUrls
              : [];
            if (urls[0] && typeof urls[0] === "string") {
              matchImageUrl = urls[0];
            } else {
              matchImageUrl = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + ".appspot.com"}/${firstId}`;
            }
          }
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
                <Image
                  src={matchImageUrl}
                  alt={fullName}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border"
                  unoptimized
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
                className="text-primary hover:text-primary/80 font-semibold text-xs flex items-center gap-1"
              >
                <Eye className="w-4 h-4" /> View
              </Link>
            </div>
          );
        })}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/profile")}
          className="gap-2 text-neutral-600 hover:text-neutral-900"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Profiles
        </Button>
      </div>

      {/* Profile Images Slider Section */}
      <Card className="mb-8 overflow-hidden border-neutral-200 shadow-sm">
        <CardContent className="p-0">
          {Array.isArray(orderedImages) && orderedImages.length > 0 ? (
            <div className="flex flex-col md:flex-row">
              {/* Main Image Display */}
              <div className="relative flex-1 bg-neutral-100 aspect-square md:aspect-auto md:h-[500px] flex items-center justify-center group">
                {/* Navigation Arrows */}
                {Array.isArray(orderedImages) && orderedImages.length > 1 && (
                  <>
                    <button
                      onClick={handlePrev}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-md hover:bg-white transition-all z-10 opacity-0 group-hover:opacity-100"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6 text-neutral-900" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-md hover:bg-white transition-all z-10 opacity-0 group-hover:opacity-100"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-6 h-6 text-neutral-900" />
                    </button>
                  </>
                )}

                <Image
                  src={
                    orderedImages[currentImageIdx]?.url ||
                    "/images/placeholder.png"
                  }
                  alt={profile.fullName || "Profile photo"}
                  fill
                  className="object-contain"
                  unoptimized
                />

                {/* Image Counter */}
                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full">
                  {currentImageIdx + 1} / {orderedImages.length}
                </div>

                {/* Delete Button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"
                  onClick={() => {
                    if (orderedImages[currentImageIdx]?.storageId) {
                      openDeleteModal(
                        orderedImages[currentImageIdx].storageId,
                        currentImageIdx === 0
                      );
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Thumbnails Sidebar (Desktop) / Bottom (Mobile) */}
              <div className="w-full md:w-32 bg-white border-t md:border-t-0 md:border-l border-neutral-100 p-4 flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto">
                {orderedImages.map((img, idx) => (
                  <button
                    key={img.storageId || idx}
                    className={cn(
                      "relative shrink-0 w-16 h-16 md:w-full md:h-24 rounded-lg overflow-hidden border-2 transition-all",
                      idx === currentImageIdx
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-neutral-200"
                    )}
                    onClick={() => setCurrentImageIdx(idx)}
                  >
                    <Image
                      src={img.url || "/images/placeholder.png"}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {idx === 0 && (
                      <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-bold px-1 rounded uppercase">
                        Main
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 bg-neutral-50">
              <UserCircle className="w-16 h-16 mb-4 opacity-20" />
              <p>No profile images available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="border-neutral-200 shadow-sm overflow-hidden">
            <div className="h-2 bg-primary" />
            <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center text-center">
              <div className="text-2xl font-bold text-neutral-900 mb-1">
                {profile.fullName || "Unnamed"}
              </div>
              <div className="text-neutral-500 flex items-center gap-1.5 mb-6">
                <MapPin className="w-4 h-4" />
                {profile.city || "Location not set"}
              </div>

              <div className="w-full space-y-4">
                <div className="flex items-center justify-between text-sm p-3 bg-neutral-50 rounded-lg">
                  <span className="text-neutral-500 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Phone
                  </span>
                  <span className="font-medium text-neutral-900">{profile.phoneNumber || "-"}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-3 bg-neutral-50 rounded-lg">
                  <span className="text-neutral-500 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" /> Education
                  </span>
                  <span className="font-medium text-neutral-900 truncate max-w-[120px]">{profile.education || "-"}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-3 bg-neutral-50 rounded-lg">
                  <span className="text-neutral-500 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Occupation
                  </span>
                  <span className="font-medium text-neutral-900 truncate max-w-[120px]">{profile.occupation || "-"}</span>
                </div>
              </div>

              <div className="mt-8 w-full pt-6 border-t border-neutral-100">
                <div className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold mb-4">
                  Admin Actions
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant={profile.hasSpotlightBadge ? "default" : "outline"}
                    onClick={() => handleToggleSpotlightBadge(String(profile._id))}
                    className="w-full justify-start gap-2"
                  >
                    <SpotlightIcon className="w-4 h-4" />
                    {profile.hasSpotlightBadge ? "Remove Spotlight" : "Grant Spotlight"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                    onClick={() => router.push(`/admin/profile/${profile._id}/edit`)}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spotlight Status */}
          {profile.hasSpotlightBadge && (
            <Card className="bg-amber-50 border-amber-100 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <SpotlightIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-amber-900">Spotlight Active</div>
                  <div className="text-xs text-amber-700">
                    Expires: {profile.spotlightBadgeExpiresAt ? new Date(profile.spotlightBadgeExpiresAt).toLocaleDateString() : "N/A"}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Details & Matches */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-neutral-200 shadow-sm">
            <CardHeader className="border-b border-neutral-100">
              <CardTitle className="text-lg font-bold">Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <DetailItem label="Date of Birth" value={profile.dateOfBirth} />
                <DetailItem label="Gender" value={profile.gender} />
                <DetailItem label="Country" value={profile.country} />
                <DetailItem label="Height" value={profile.height} />
                <DetailItem label="Marital Status" value={profile.maritalStatus} />
                <DetailItem label="Annual Income" value={profile.annualIncome} />
                <DetailItem label="Diet" value={profile.diet} />
                <DetailItem label="Smoking" value={profile.smoking} />
                <DetailItem label="Drinking" value={profile.drinking} />
                <DetailItem label="Physical Status" value={profile.physicalStatus} />
                
                <div className="md:col-span-2 pt-4 border-t border-neutral-50">
                  <div className="text-sm font-semibold text-neutral-900 mb-2">About Me</div>
                  <p className="text-sm text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                    {profile.aboutMe || "No description provided."}
                  </p>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-neutral-50">
                  <div className="text-sm font-semibold text-neutral-900 mb-4">Partner Preferences</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailItem 
                      label="Age Range" 
                      value={profile.partnerPreferenceAgeMin && profile.partnerPreferenceAgeMax 
                        ? `${profile.partnerPreferenceAgeMin} - ${profile.partnerPreferenceAgeMax} years` 
                        : "-"} 
                    />
                    <DetailItem 
                      label="Preferred Cities" 
                      value={Array.isArray(profile.partnerPreferenceCity) ? profile.partnerPreferenceCity.join(", ") : "-"} 
                    />
                  </div>
                </div>

                <div className="md:col-span-2 pt-6 border-t border-neutral-100 flex flex-wrap gap-x-8 gap-y-4">
                  <div className="text-[10px] text-neutral-400">
                    <span className="font-bold uppercase mr-2">Created:</span>
                    {profile.createdAt ? new Date(String(profile.createdAt)).toLocaleString() : "-"}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    <span className="font-bold uppercase mr-2">Updated:</span>
                    {profile.updatedAt ? new Date(String(profile.updatedAt)).toLocaleString() : "-"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-neutral-200 shadow-sm">
            <CardHeader className="border-b border-neutral-100">
              <CardTitle className="text-lg font-bold">Matches ({matches.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {matchesSection}
            </CardContent>
          </Card>
        </div>
      </div>
      {renderDeleteConfirmation()}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-medium text-neutral-900">{value || "-"}</div>
    </div>
  );
}
