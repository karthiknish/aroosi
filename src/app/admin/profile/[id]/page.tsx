"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
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
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

export default function AdminProfileDetailPage() {
  // All hooks must be called unconditionally at the top
  const { id } = useParams<{ id: string }>();
  const { isLoaded, isSignedIn } = useAuth();

  // Fetch the profile
  const profile = useQuery(api.users.getProfileById, {
    id: id as Id<"profiles">,
  });

  // Delete image mutation
  const deleteImage = useMutation(api.images.deleteProfileImage);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{
    storageId: string;
    isMain: boolean;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteImage = async () => {
    if (!profile?.userId || !imageToDelete) return;

    const { storageId } = imageToDelete;

    try {
      setIsDeleting(true);
      await deleteImage({
        userId: profile.userId as Id<"users">,
        imageId: storageId as Id<"_storage">,
      });

      // The server will handle updating the main image if needed

      toast.success("Image deleted successfully");
      setImageToDelete(null);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
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

  // Fetch images using the profile's userId - only when we have a valid user ID
  const isValidUserId =
    typeof profile?.userId === "string" && profile.userId.trim().length > 0;
  const images = useQuery(
    api.images.getProfileImages,
    isValidUserId ? { userId: profile.userId as Id<"users"> } : "skip"
  );

  // Debug logging
  React.useEffect(() => {
    if (images) {
      console.log("Fetched images:", images);
    } else if (profile?.userId) {
      console.log("No images found for user:", profile.userId);
    }
  }, [images, profile?.userId]);

  // Get matches for the profile
  const matches = useQuery(api.users.getMatchesForProfile, {
    profileId: id as Id<"profiles">,
  });

  // Process images for display
  type ImageType = {
    storageId: string;
    url?: string | null;
    [key: string]: unknown;
  };
  const { orderedImages: orderedImagesRaw } = React.useMemo(() => {
    // Default return values
    const defaultReturn = {
      orderedImages: [] as ImageType[],
    };

    if (!profile) {
      console.log("No profile available");
      return defaultReturn;
    }

    console.log("Processing images...");
    console.log("Raw images:", images);

    // Ensure we have a valid images array
    const validImages: ImageType[] = Array.isArray(images) ? images : [];
    console.log("Valid images:", validImages);

    // If no images, return early
    if (validImages.length === 0) {
      console.log("No images to display");
      return defaultReturn;
    }

    // Create a map of storageId to image
    const map: Record<string, ImageType> = Object.fromEntries(
      validImages.map((img) => [String(img.storageId), img])
    );
    console.log("Image map:", map);

    // Get all images in their original order
    const all = [...validImages];

    // Get ordered images based on profileImageIds if available
    let ordered: ImageType[] = [];
    const profileImageIds = Array.isArray(profile.profileImageIds)
      ? profile.profileImageIds
      : [];
    const hasProfileImageIds = profileImageIds.length > 0;

    if (hasProfileImageIds) {
      console.log("Using profileImageIds for ordering:", profileImageIds);
      ordered = profileImageIds.map((id) => map[String(id)]).filter(Boolean);
    }

    // If no ordered images from profileImageIds or no profileImageIds, use all images
    if (!hasProfileImageIds || ordered.length === 0) {
      console.log("Using all images in default order");
      ordered = all;
    }

    console.log("Final ordered images:", ordered);

    return {
      orderedImages: Array.isArray(ordered) ? ordered : [],
    };
  }, [images, profile]);

  const orderedImages: ImageType[] = Array.isArray(orderedImagesRaw)
    ? orderedImagesRaw
    : [];

  const [currentImageIdx, setCurrentImageIdx] = useState(0);
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

  // Now do early returns for loading/auth
  if (!isLoaded)
    return (
      <div className="min-h-screen flex items-center justify-center text-pink-600">
        Loading authentication...
      </div>
    );
  if (!isSignedIn)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        You must be signed in as an admin.
      </div>
    );
  if (profile === undefined)
    return (
      <div className="min-h-screen flex items-center justify-center text-pink-600">
        Loading profile...
      </div>
    );
  if (!profile)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Profile not found
      </div>
    );

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

  const setProfileHiddenFromSearch = useMutation(
    api.users.setProfileHiddenFromSearch
  );

  // Add toggle for hiddenFromSearch
  const handleToggleHiddenFromSearch = async () => {
    if (!profile?._id) return;
    try {
      await setProfileHiddenFromSearch({
        profileId: profile._id as Id<"profiles">,
        hidden: !profile.hiddenFromSearch,
      });
      toast.success(
        !profile.hiddenFromSearch
          ? "Profile hidden from search."
          : "Profile visible in search."
      );
    } catch {
      toast.error("Failed to update search visibility");
    }
  };

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
                    <img
                      src={
                        (orderedImages[currentImageIdx]?.url ?? undefined) ||
                        (orderedImages[currentImageIdx]?.storageId
                          ? `/api/storage/${orderedImages[currentImageIdx].storageId}`
                          : "https://hds.hel.fi/images/foundation/visual-assets/placeholders/user-image-l@3x.png")
                      }
                      alt={`Profile image ${currentImageIdx + 1}`}
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
                      >
                        <img
                          src={
                            (img.url ?? undefined) ||
                            `/api/storage/${img.storageId}`
                          }
                          alt={`Thumbnail ${idx + 1}`}
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
            {profile.fullName || "Unnamed"}
          </div>
          <div className="text-md text-gray-600 flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" /> {profile.ukCity || "-"}
          </div>
          <div className="flex flex-wrap gap-4 justify-center mb-4">
            <div className="flex items-center gap-1 text-gray-500">
              <Heart className="w-4 h-4" /> {profile.religion || "-"}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <GraduationCap className="w-4 h-4" /> {profile.education || "-"}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Briefcase className="w-4 h-4" /> {profile.occupation || "-"}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Phone className="w-4 h-4" /> {profile.phoneNumber || "-"}
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-2">
            Profile ID: {profile._id}
          </div>
        </CardContent>
      </Card>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          {/* Add toggle button for search visibility */}
          <Button
            variant={profile.hiddenFromSearch ? "secondary" : "outline"}
            className="mt-2"
            onClick={handleToggleHiddenFromSearch}
          >
            {profile.hiddenFromSearch ? "Show in Search" : "Hide from Search"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <span className="font-semibold">Date of Birth:</span>{" "}
              {profile.dateOfBirth || "-"}
            </div>
            <div>
              <span className="font-semibold">Gender:</span>{" "}
              {profile.gender || "-"}
            </div>
            <div>
              <span className="font-semibold">Postcode:</span>{" "}
              {profile.ukPostcode || "-"}
            </div>
            <div>
              <span className="font-semibold">Caste:</span>{" "}
              {profile.caste || "-"}
            </div>
            <div>
              <span className="font-semibold">Mother Tongue:</span>{" "}
              {profile.motherTongue || "-"}
            </div>
            <div>
              <span className="font-semibold">Height:</span>{" "}
              {profile.height || "-"}
            </div>
            <div>
              <span className="font-semibold">Marital Status:</span>{" "}
              {profile.maritalStatus || "-"}
            </div>
            <div>
              <span className="font-semibold">Annual Income:</span>{" "}
              {profile.annualIncome || "-"}
            </div>
            <div>
              <span className="font-semibold">Diet:</span> {profile.diet || "-"}
            </div>
            <div>
              <span className="font-semibold">Smoking:</span>{" "}
              {profile.smoking || "-"}
            </div>
            <div>
              <span className="font-semibold">Drinking:</span>{" "}
              {profile.drinking || "-"}
            </div>
            <div>
              <span className="font-semibold">Physical Status:</span>{" "}
              {profile.physicalStatus || "-"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">About Me:</span>{" "}
              <span className="text-gray-700">{profile.aboutMe || "-"}</span>
            </div>
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <span className="font-semibold">Partner Preference Age:</span>{" "}
              {profile.partnerPreferenceAgeMin || "-"} -{" "}
              {profile.partnerPreferenceAgeMax || "-"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">
                Partner Preference Religion:
              </span>{" "}
              {profile.partnerPreferenceReligion?.join(", ") || "-"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">Partner Preference UK City:</span>{" "}
              {profile.partnerPreferenceUkCity?.join(", ") || "-"}
            </div>
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <span className="font-semibold">Banned:</span>{" "}
              {profile.banned ? "Yes" : "No"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">Created At:</span>{" "}
              {profile.createdAt
                ? new Date(profile.createdAt).toLocaleString()
                : "-"}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">Updated At:</span>{" "}
              {profile.updatedAt
                ? new Date(profile.updatedAt).toLocaleString()
                : "-"}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Matches</CardTitle>
        </CardHeader>
        <CardContent>
          {matches && matches.length > 0 ? (
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
                const ukCity = typeof m.ukCity === "string" ? m.ukCity : "-";
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
                      <div className="font-semibold text-gray-900">
                        {fullName}
                      </div>
                      <div className="text-sm text-gray-500">{ukCity}</div>
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
          ) : (
            <div className="text-gray-400">No matches found.</div>
          )}
        </CardContent>
      </Card>
      {renderDeleteConfirmation()}
    </div>
  );
}
