"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUser, useClerk } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Loader2, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProfileForm from "@/components/profile/ProfileForm";
import ProfileView from "@/components/profile/ProfileView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConvexError } from "convex/values";
import { getProfileFormSchema, ProfileFormValues } from "./profileFormSchema";

const requiredFields = [
  "fullName",
  "dateOfBirth",
  "gender",
  "ukCity",
  "aboutMe",
  // "phoneNumber", // Uncomment if required
  // "diet", "smoking", "drinking", "physicalStatus", // Uncomment if required
] as const;
type RequiredFields = (typeof requiredFields)[number];

export default function ProfilePage() {
  const { user: clerkUser, isSignedIn } = useUser();
  const currentUserProfileData = useQuery(
    api.users.getCurrentUserWithProfile,
    !isSignedIn ? "skip" : {}
  );
  const updateProfileMutation = useMutation(api.users.updateProfile);
  const storageUpload = useAction(api.storage.generateUploadUrl);
  const deleteUserMutation = useMutation(api.users.deleteUser);
  const router = useRouter();
  const { signOut } = useClerk();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Determine if onboarding (profile is incomplete or doesn't exist yet)
  const isOnboarding =
    currentUserProfileData === null ||
    currentUserProfileData?.profile === null ||
    currentUserProfileData?.profile?.isProfileComplete === false;

  // Unified submit handler
  const handleProfileSubmit = async (values: any) => {
    setLoading(true);
    setServerError(null);
    try {
      // Only send allowed fields to Convex
      const allowedFields = [
        "fullName",
        "dateOfBirth",
        "gender",
        "ukCity",
        "ukPostcode",
        "religion",
        "caste",
        "motherTongue",
        "height",
        "maritalStatus",
        "education",
        "occupation",
        "annualIncome",
        "aboutMe",
        "partnerPreferenceAgeMin",
        "partnerPreferenceAgeMax",
        "partnerPreferenceReligion",
        "partnerPreferenceUkCity",
        "preferredGender",
        "profileImageIds",
        // New lifestyle/contact fields
        "phoneNumber",
        "diet",
        "smoking",
        "drinking",
        "physicalStatus",
      ];
      const filtered = Object.fromEntries(
        Object.entries(values).filter(([key]) => allowedFields.includes(key))
      );
      await updateProfileMutation(filtered);
      setIsEditing(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      if (error instanceof ConvexError) {
        setServerError(
          "Something went wrong while saving your profile. Please try again."
        );
      } else {
        setServerError(error.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setShowSuccessModal(false); // Reset modal when entering edit mode
    setIsEditing(true);
  };

  // Handle loading and signed-out states
  if (!isSignedIn && typeof window !== "undefined") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <UserCircle className="w-20 h-20 text-gray-400 mb-4" />
        <p className="text-xl text-gray-700 mb-4">
          Please sign in to manage your profile.
        </p>
        <Link href="/sign-in" passHref>
          <Button className="bg-pink-600 hover:bg-pink-700">
            Go to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  if (currentUserProfileData === undefined && isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-pink-600" />
      </div>
    );
  }

  const userConvexData = currentUserProfileData;
  const profileData = currentUserProfileData?.profile;

  // Conditionally render form or view
  if (isEditing || isOnboarding) {
    return (
      <ProfileForm
        mode={isOnboarding ? "create" : "edit"}
        initialValues={profileData}
        onSubmit={handleProfileSubmit}
        clerkUser={clerkUser}
        loading={loading}
        serverError={serverError}
        onEditDone={() => setIsEditing(false)}
        userConvexData={userConvexData}
      />
    );
  }
  return (
    <>
      <ProfileView
        profileData={profileData}
        clerkUser={clerkUser}
        userConvexData={userConvexData}
        onEdit={handleEdit}
        onDelete={() => setShowDeleteModal(true)}
        deleting={deleting}
      />
      {showSuccessModal && (
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Profile updated successfully!</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button
                className="bg-pink-600 hover:bg-pink-700 text-white"
                onClick={() => setShowSuccessModal(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
