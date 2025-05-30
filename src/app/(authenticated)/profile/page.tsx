"use client";

import { useUser, useAuth, useClerk } from "@clerk/nextjs"; // Ensure useClerk is imported
import { useToken } from "@/components/TokenProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query"; // Ensure useQueryClient is imported
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import ProfileForm, {
  ProfileFormValues,
} from "@/components/profile/ProfileForm";
import ProfileView from "@/components/profile/ProfileView";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription, // Import DialogDescription
  DialogTrigger, // Might not be needed if we control open state manually
  DialogClose, // For a cancel button inside the dialog
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner"; // Import toast

export default function ProfilePage() {
  const { user: clerkUser } = useUser();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk(); // Get signOut function
  const token = useToken();
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false); // New state for delete confirmation dialog
  const router = useRouter();
  const queryClient = useQueryClient(); // Get query client

  const {
    data: profileApiData,
    isLoading: loadingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ["profile", isSignedIn, token], // Removed showSuccessModal from key as it might cause unnecessary refetches
    queryFn: async () => {
      if (!token || !isSignedIn) return undefined;
      const res = await fetch("/api/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-User-Id": clerkUser?.id ?? "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      return data;
    },
    enabled: !!token && !!isSignedIn,
  });

  const userConvexData: unknown = profileApiData;
  const profileData = profileApiData
    ? toProfileType(profileApiData)
    : undefined;
  const loading = loadingProfile;

  const isOnboarding =
    !profileData || (profileData && profileData.isProfileComplete === false);

  useEffect(() => {
    if (!loadingProfile && isSignedIn && !profileApiData && !profileError) {
      // This case means the fetch was successful (no error) but returned no data (e.g., null or empty response from API)
      // This could indicate the Convex user/profile doesn't exist despite Clerk session.
      toast.error(
        "Your user profile could not be found. Please try signing in again."
      );
      signOut(() => router.push("/sign-in")); // Sign out and redirect to sign-in
    } else if (profileError) {
      // Handle explicit fetch errors, e.g. network issue or 500 from API
      // You might already have some form of error display, but this is a good place for a toast + sign out too
      toast.error(
        `Failed to load your profile: ${profileError.message}. Please try signing in again.`
      );
      signOut(() => router.push("/sign-in"));
    }
  }, [
    loadingProfile,
    isSignedIn,
    profileApiData,
    profileError,
    signOut,
    router,
  ]);

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    setServerError(null);
    try {
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
        "phoneNumber",
        "diet",
        "smoking",
        "drinking",
        "physicalStatus",
      ];
      const filtered = Object.fromEntries(
        Object.entries(values).filter(([key]) => allowedFields.includes(key))
      );
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(filtered),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to update profile");
      }
      setIsEditing(false);
      setShowSuccessModal(true);
    } catch (error: unknown) {
      if (typeof error === "object" && error && "message" in error) {
        setServerError(
          String((error as { message?: unknown }).message) ||
            "An unexpected error occurred."
        );
      } else {
        setServerError("An unexpected error occurred.");
      }
    }
  };

  const handleEdit = () => {
    setShowSuccessModal(false);
    setIsEditing(true);
  };

  const executeDeleteProfile = async () => {
    if (!profileData?._id) {
      toast.error("Profile ID not found. Cannot delete.");
      setShowDeleteConfirmDialog(false);
      return;
    }

    setDeleting(true);
    setServerError(null);
    setShowDeleteConfirmDialog(false); // Close dialog before starting delete

    try {
      const res = await fetch(`/api/profile`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        // The body might not be needed if your backend identifies the user via token for deletion
        // body: JSON.stringify({ profileId: profileData._id }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let err;
        try {
          err = JSON.parse(errText);
        } catch {
          err = { error: errText || "Failed to delete profile" };
        }
        throw new Error(err?.error || "Failed to delete profile");
      }

      toast.success("Profile deleted successfully.");

      // Invalidate queries to refetch user data
      // Using broader keys for invalidation
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });

      // Sign out from Clerk and then redirect
      await signOut(() => router.push("/"));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during deletion.";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteProfile = async () => {
    // This function will now just open the confirmation dialog
    if (!profileData?._id) {
      toast.error("Profile ID not found. Cannot initiate delete.");
      return;
    }
    setShowDeleteConfirmDialog(true);
  };

  useEffect(() => {
    // This existing useEffect handles the onboarding redirect.
    // It should ideally run AFTER the check above, or be combined.
    // For now, let's ensure it doesn't conflict if profileApiData is null.
    if (!loadingProfile && isSignedIn && profileApiData && isOnboarding) {
      router.replace("/create-profile");
    }
  }, [isOnboarding, router, loadingProfile, isSignedIn, profileApiData]);

  function toProfileType(
    data: unknown
  ): import("@/types/profile").Profile | undefined {
    const profileObj =
      data && typeof data === "object" && "profile" in data
        ? (data as Record<string, unknown>)["profile"]
        : data;
    if (!profileObj || typeof profileObj !== "object") {
      return undefined;
    }
    const result = profileObj as import("@/types/profile").Profile;

    if (!result._id || !result.userId || !result.createdAt) {
      return undefined;
    }

    return result;
  }

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

  if (loadingProfile && isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>
    );
  }

  if (isOnboarding || isEditing) {
    return (
      <>
        <ProfileForm
          mode={isOnboarding ? "create" : "edit"}
          initialValues={profileData as ProfileFormValues}
          onSubmit={handleProfileSubmit}
          loading={loading}
          serverError={serverError}
          onEditDone={() => setIsEditing(false)}
        />
      </>
    );
  }

  return (
    <>
      <ProfileView
        profileData={
          profileData || {
            _id: "" as Id<"profiles">,
            userId: "" as Id<"users">,
            clerkId: "",
            email: "",
            fullName: "",
            dateOfBirth: "",
            gender: "",
            ukCity: "",
            ukPostcode: "",
            phoneNumber: "",
            aboutMe: "",
            religion: "",
            caste: "",
            motherTongue: "",
            height: "",
            maritalStatus: "single",
            education: "",
            occupation: "",
            annualIncome: "",
            diet: "",
            smoking: "",
            drinking: "",
            physicalStatus: "",
            partnerPreferenceAgeMin: 18,
            partnerPreferenceAgeMax: 99,
            partnerPreferenceReligion: [],
            partnerPreferenceUkCity: [],
            preferredGender: "any",
            profileImageIds: [],
            isProfileComplete: false,
            hiddenFromSearch: false,
            banned: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        }
        clerkUser={clerkUser}
        userConvexData={
          userConvexData as
            | { _id?: string; _creationTime?: number }
            | null
            | undefined
        }
        onEdit={handleEdit}
        onDelete={handleDeleteProfile} // Pass the new handler
        deleting={deleting} // Pass the state
      />
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Updated!</DialogTitle>
          </DialogHeader>
          <p className="py-4">Your profile has been updated successfully.</p>
          <DialogFooter>
            <Button onClick={() => setShowSuccessModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirmDialog}
        onOpenChange={setShowDeleteConfirmDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Profile Deletion</DialogTitle>
            <DialogDescription className="py-2">
              Are you sure you want to delete your profile? This action is
              permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeDeleteProfile}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
