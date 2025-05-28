"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Camera,
  UserCircle,
  Edit3,
  MapPin,
  Calendar,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  Heart,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ProfileImageReorder } from "../ProfileImageReorder";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Profile } from "@/types/profile";
import { Skeleton } from "@/components/ui/skeleton";

// Helper for displaying profile details
const ProfileDetailView: React.FC<{
  label: string;
  value?: string | null | number;
  isTextArea?: boolean;
  isSubtle?: boolean;
  icon?: React.ReactNode;
}> = ({ label, value, isTextArea, isSubtle, icon }) => {
  const displayValue =
    value === null || value === undefined || value === "" ? "-" : String(value);
  const textClass = isSubtle
    ? "text-sm text-gray-500"
    : "text-md text-gray-800";
  return (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
        {icon}
        {label}
      </dt>
      {isTextArea ? (
        <dd
          className={`mt-1 sm:mt-0 sm:col-span-2 ${textClass} whitespace-pre-wrap`}
        >
          {displayValue}
        </dd>
      ) : (
        <dd className={`mt-1 sm:mt-0 sm:col-span-2 ${textClass}`}>
          {displayValue}
        </dd>
      )}
    </div>
  );
};

const DisplaySection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  noBorder?: boolean;
  fullWidth?: boolean;
}> = ({ title, children, icon, noBorder, fullWidth }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`space-y-1 pt-6 pb-8 ${!noBorder && "border-b border-gray-100"} first:border-t-0 first:pt-0 ${fullWidth ? "w-full" : ""}`}
  >
    <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center gap-2">
      {icon}
      {title}
    </h2>
    {children}
  </motion.div>
);

export interface ProfileViewProps {
  profileData: Profile;
  clerkUser: unknown;
  userConvexData: { _id?: string; _creationTime?: number } | null | undefined;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({
  profileData,
  userConvexData,
  onEdit,
  onDelete,
  deleting,
}) => {
  const { getToken } = useAuth();
  const [images, setImages] = React.useState<
    { url: string; storageId: string; _id: string }[]
  >([]);
  const [loadingImages, setLoadingImages] = React.useState(true);
  // Local image order state for instant UI feedback
  const [imageOrder, setImageOrder] = React.useState<string[]>(
    profileData?.profileImageIds && Array.isArray(profileData.profileImageIds)
      ? [...profileData.profileImageIds]
      : []
  );
  // Keep imageOrder in sync with profileData.profileImageIds
  React.useEffect(() => {
    if (
      profileData?.profileImageIds &&
      Array.isArray(profileData.profileImageIds)
    ) {
      setImageOrder([...profileData.profileImageIds]);
    } else {
      setImageOrder([]);
    }
  }, [profileData?.profileImageIds]);

  React.useEffect(() => {
    async function fetchImages() {
      setLoadingImages(true);
      if (!userConvexData?._id) return;
      const token = await getToken({ template: "convex" });
      if (!token) return;
      const res = await fetch(
        `/api/profile-detail/${userConvexData._id}/images`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        // Normalize images: always use storageId as _id
        type ApiImage = { storageId: string; url: string };
        const normalized = (data.userProfileImages || []).map(
          (img: ApiImage) => ({
            _id: img.storageId,
            storageId: img.storageId,
            url: img.url,
          })
        );
        setImages(normalized);
      } else {
        setImages([]);
      }
      setLoadingImages(false);
    }
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userConvexData?._id]);

  const handleReorder = async (newOrder: unknown[]) => {
    if (!userConvexData?._id) return;
    let imageIds: string[] = [];
    if (Array.isArray(newOrder) && typeof newOrder[0] === "string") {
      imageIds = newOrder as string[];
    } else if (
      Array.isArray(newOrder) &&
      typeof newOrder[0] === "object" &&
      newOrder[0] !== null &&
      "_id" in (newOrder[0] as object)
    ) {
      imageIds = (newOrder as { _id: string }[]).map((img) => img._id);
    }
    // Optimistically update local order
    setImageOrder(imageIds);
    try {
      setLoadingImages(true);
      const token = await getToken({ template: "convex" });
      if (!token) throw new Error("No token");
      const res = await fetch(`/api/images/order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: userConvexData._id, imageIds }),
      });
      if (!res.ok) throw new Error("Failed to update image order");
      // Update local images state to reflect new order
      setImages((prev) => {
        if (!prev) return prev;
        const imageMap = new Map(prev.map((img) => [img._id, img]));
        return imageIds.map((id) => imageMap.get(id)).filter(Boolean) as {
          url: string;
          storageId: string;
          _id: string;
        }[];
      });
      toast.dismiss();
      toast.success("Image order updated");
    } catch (error) {
      toast.dismiss();
      console.error("Error updating image order", error);
      toast.error("Failed to update image order");
    } finally {
      setLoadingImages(false);
    }
  };

  console.log("images", images);

  // Determine ordered images based on local imageOrder if available
  let orderedImages: { url: string; storageId: string; _id: string }[] = [];
  if (imageOrder && imageOrder.length > 0) {
    orderedImages = imageOrder
      .map((storageId) => {
        const img = images.find((img) => img.storageId === storageId);
        if (img) {
          return { url: img.url, storageId, _id: storageId };
        }
        return null;
      })
      .filter(Boolean) as { url: string; storageId: string; _id: string }[];
  } else {
    orderedImages = images.map((img) => ({
      url: img.url,
      storageId: img.storageId,
      _id: img.storageId,
    }));
  }

  // Modal state for image preview
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalIndex, setModalIndex] = React.useState(0);

  const handleImageClick = (idx: number) => {
    setModalIndex(idx);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white pt-24 sm:pt-28 md:pt-32 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="border-b pb-4 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-800">
                My Profile
              </CardTitle>
              <CardDescription className="text-gray-600">
                View and manage your information.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onEdit}
                variant="outline"
                className="border-pink-500 text-pink-600 hover:bg-pink-50 hover:text-pink-700"
              >
                <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
              <Button
                onClick={onDelete}
                variant="destructive"
                disabled={deleting}
              >
                Delete Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            {profileData ? (
              <>
                <DisplaySection
                  title="Account Information"
                  icon={<Mail className="h-5 w-5" />}
                >
                  <ProfileDetailView
                    label="Email"
                    value={profileData.email}
                    icon={<Mail className="h-4 w-4" />}
                  />
                  <ProfileDetailView
                    label="Joined Aroosi"
                    value={
                      userConvexData?._creationTime
                        ? new Date(
                            userConvexData._creationTime
                          ).toLocaleDateString()
                        : "-"
                    }
                    icon={<Calendar className="h-4 w-4" />}
                  />
                </DisplaySection>
                <DisplaySection
                  title="Profile Images"
                  icon={<Camera className="h-5 w-5" />}
                  noBorder
                  fullWidth
                >
                  {userConvexData?._id && (
                    <ProfileImageReorder
                      images={orderedImages}
                      userId={userConvexData._id}
                      onReorder={handleReorder}
                      loading={loadingImages}
                      renderAction={(_, idx) => (
                        <img
                          src={orderedImages[idx].url}
                          alt=""
                          style={{
                            width: 100,
                            height: 100,
                            objectFit: "cover",
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                          onClick={() => handleImageClick(idx)}
                        />
                      )}
                    />
                  )}
                </DisplaySection>

                <DisplaySection
                  title="Basic Information"
                  icon={<UserCircle className="h-5 w-5" />}
                >
                  <ProfileDetailView
                    label="Full Name"
                    value={profileData.fullName}
                  />
                  <ProfileDetailView
                    label="Date of Birth"
                    value={
                      profileData.dateOfBirth
                        ? new Date(profileData.dateOfBirth).toLocaleDateString(
                            "en-GB"
                          )
                        : "-"
                    }
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  <ProfileDetailView
                    label="Gender"
                    value={profileData.gender}
                  />
                  <ProfileDetailView
                    label="Height"
                    value={profileData.height}
                  />
                  <ProfileDetailView
                    label="Phone Number"
                    value={profileData.phoneNumber}
                    icon={<Phone className="h-4 w-4" />}
                  />
                </DisplaySection>

                <DisplaySection
                  title="Location (UK) & Lifestyle"
                  icon={<MapPin className="h-5 w-5" />}
                >
                  <ProfileDetailView label="City" value={profileData.ukCity} />
                  <ProfileDetailView
                    label="Postcode"
                    value={profileData.ukPostcode}
                  />
                  <ProfileDetailView label="Diet" value={profileData.diet} />
                  <ProfileDetailView
                    label="Smoking"
                    value={profileData.smoking}
                  />
                  <ProfileDetailView
                    label="Drinking"
                    value={profileData.drinking}
                  />
                  <ProfileDetailView
                    label="Physical Status"
                    value={profileData.physicalStatus}
                  />
                </DisplaySection>

                <DisplaySection
                  title="Cultural & Religious Background"
                  icon={<Heart className="h-5 w-5" />}
                >
                  <ProfileDetailView
                    label="Religion"
                    value={profileData.religion}
                  />
                  <ProfileDetailView
                    label="Sect/Caste"
                    value={profileData.caste}
                  />
                  <ProfileDetailView
                    label="Mother Tongue"
                    value={profileData.motherTongue}
                  />
                  <ProfileDetailView
                    label="Marital Status"
                    value={profileData.maritalStatus}
                  />
                </DisplaySection>

                <DisplaySection
                  title="Education & Career"
                  icon={<GraduationCap className="h-5 w-5" />}
                >
                  <ProfileDetailView
                    label="Education"
                    value={profileData.education}
                  />
                  <ProfileDetailView
                    label="Occupation"
                    value={profileData.occupation}
                    icon={<Briefcase className="h-4 w-4" />}
                  />
                  <ProfileDetailView
                    label="Annual Income"
                    value={profileData.annualIncome}
                  />
                </DisplaySection>

                <DisplaySection
                  title="About Me"
                  icon={<Info className="h-5 w-5" />}
                >
                  <ProfileDetailView
                    label="Bio"
                    value={profileData.aboutMe}
                    isTextArea
                  />
                </DisplaySection>

                <DisplaySection
                  title="Partner Preferences"
                  icon={<Heart className="h-5 w-5" />}
                >
                  <ProfileDetailView
                    label="Min Preferred Partner Age"
                    value={profileData.partnerPreferenceAgeMin?.toString()}
                  />
                  <ProfileDetailView
                    label="Max Preferred Partner Age"
                    value={profileData.partnerPreferenceAgeMax?.toString()}
                  />
                  <ProfileDetailView
                    label="Preferred Partner Religion(s)"
                    value={
                      Array.isArray(profileData.partnerPreferenceReligion) &&
                      profileData.partnerPreferenceReligion.length > 0
                        ? profileData.partnerPreferenceReligion.join(", ")
                        : "-"
                    }
                  />
                  <ProfileDetailView
                    label="Preferred Partner UK City/Cities"
                    value={
                      Array.isArray(profileData.partnerPreferenceUkCity) &&
                      profileData.partnerPreferenceUkCity.length > 0
                        ? profileData.partnerPreferenceUkCity.join(", ")
                        : "-"
                    }
                  />
                </DisplaySection>

                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                  <DialogContent className="max-w-2xl flex flex-col items-center justify-center bg-black/90 p-0">
                    <div className="relative w-full flex items-center justify-center min-h-[400px]">
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 shadow-lg z-10"
                        onClick={() =>
                          setModalIndex(
                            (modalIndex - 1 + orderedImages.length) %
                              orderedImages.length
                          )
                        }
                        aria-label="Previous image"
                        disabled={orderedImages.length <= 1}
                        style={{ opacity: orderedImages.length > 1 ? 1 : 0.5 }}
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <img
                        src={orderedImages[modalIndex]?.url}
                        alt="Profile large preview"
                        className="w-full h-[70vh] rounded-lg object-cover bg-black"
                        style={{ margin: "0 auto" }}
                      />
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 shadow-lg z-10"
                        onClick={() =>
                          setModalIndex((modalIndex + 1) % orderedImages.length)
                        }
                        aria-label="Next image"
                        disabled={orderedImages.length <= 1}
                        style={{ opacity: orderedImages.length > 1 ? 1 : 0.5 }}
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="text-white text-center py-2 w-full bg-black/60 rounded-b-lg">
                      {modalIndex + 1} / {orderedImages.length}
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div className="space-y-6">
                {/* Header skeleton */}
                <div className="flex flex-row items-center gap-4">
                  <Skeleton className="h-10 w-40 rounded" />
                  <Skeleton className="h-8 w-24 rounded" />
                </div>
                {/* Profile image skeleton */}
                <div className="flex flex-row gap-4 items-center">
                  <Skeleton className="h-32 w-32 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-1/2 rounded" />
                    <Skeleton className="h-4 w-1/3 rounded" />
                  </div>
                </div>
                {/* Info blocks skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Skeleton className="h-24 w-full rounded" />
                  <Skeleton className="h-24 w-full rounded" />
                  <Skeleton className="h-24 w-full rounded" />
                  <Skeleton className="h-24 w-full rounded" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileView;
