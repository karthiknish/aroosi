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
import { useUser } from "@clerk/nextjs";
import { Id } from "@/../convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { motion } from "framer-motion";
import { ProfileImageReorder } from "../ProfileImageReorder";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Profile } from "@/types/profile";

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
  clerkUser: any;
  userConvexData: { _id?: string; _creationTime?: number } | null | undefined;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({
  profileData,
  clerkUser,
  userConvexData,
  onEdit,
  onDelete,
  deleting,
}) => {
  const images = useQuery(
    api.images.getProfileImages,
    userConvexData?._id &&
      typeof userConvexData._id === "string" &&
      userConvexData._id.length > 0
      ? { userId: userConvexData._id }
      : "skip"
  );
  const imagesArray = (images || []).map((img) => ({
    ...img,
    url: img.url || "",
  }));
  const updateOrder = useMutation(api.users.updateProfileImageOrder);

  const handleReorder = async (newOrder: any[]) => {
    if (!userConvexData?._id) return;
    let imageIds: string[] = [];
    if (typeof newOrder[0] === "string") {
      imageIds = newOrder as string[];
    } else if (typeof newOrder[0] === "object" && newOrder[0]._id) {
      imageIds = newOrder.map((img: any) => img._id);
    }
    try {
      await updateOrder({
        userId: userConvexData._id,
        imageIds: imageIds as Id<"_storage">[],
      });
      toast.success("Image order updated");
    } catch (error) {
      toast.error("Failed to update image order");
    }
  };

  console.log("images", images);
  console.log("imagesArray", imagesArray);

  // Determine ordered images based on profileData.profileImageIds if available
  let orderedImages: { url: string; _id: Id<"_storage"> }[] = [];
  if (
    profileData?.profileImageIds &&
    Array.isArray(profileData.profileImageIds) &&
    profileData.profileImageIds.length > 0
  ) {
    // Map storage IDs to image objects from imagesArray, and use storageId as _id
    orderedImages = profileData.profileImageIds
      .map((storageId: Id<"_storage">) => {
        const img = imagesArray.find((img) => img.storageId === storageId);
        if (img) {
          return { url: img.url, _id: storageId };
        }
        return null;
      })
      .filter(Boolean) as { url: string; _id: Id<"_storage"> }[];
  } else {
    // fallback: use imagesArray, but use storageId as _id if available
    orderedImages = imagesArray.map((img) => ({
      url: img.url,
      _id: img.storageId as Id<"_storage">,
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
                    label="Email (Verified)"
                    value={clerkUser?.primaryEmailAddress?.emailAddress}
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
                      userId={userConvexData._id as Id<"users">}
                      onReorder={handleReorder}
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
                  {imagesArray.length === 0 && <div>No images found</div>}
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
                    value={profileData.dateOfBirth}
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
              <div className="text-center py-10">
                <UserCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <p className="text-lg text-gray-600 mb-2">
                  Your Aroosi profile is ready to be filled out!
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Click the 'Edit Profile' button above to add your details and
                  start connecting.
                </p>
                <Button
                  onClick={onEdit}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  <Edit3 className="mr-2 h-4 w-4" /> Start Editing Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileView;
