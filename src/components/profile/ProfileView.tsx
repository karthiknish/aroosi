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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { Id } from "@/../convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { motion } from "framer-motion";
import { ProfileImageReorder } from "../ProfileImageReorder";
import { Profile } from "@/types/profile";

interface ImageData {
  _id: Id<"_storage">;
  url: string;
}

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
  profileData: any;
  clerkUser: any;
  userConvexData: any;
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
  const { user } = useUser();
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

  const handleReorder = (newOrder: string[]) => {
    // Optionally, implement reordering logic if you want to persist order
    // For now, do nothing or show a toast
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

  // Render images row
  const imagesRow =
    orderedImages.length > 0 ? (
      <div className="flex flex-row gap-2 mb-6">
        {orderedImages.map((img) => (
          <img
            key={img._id}
            src={img.url}
            alt="Profile image"
            className="w-20 h-20 rounded-lg object-cover border"
          />
        ))}
      </div>
    ) : null;

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
                      images={imagesArray}
                      userId={userConvexData._id as Id<"users">}
                      onReorder={handleReorder}
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
