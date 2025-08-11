"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useAuthContext } from "@/components/ClerkAuthProvider";
import { ProfileView } from "@/components/profile/ProfileView";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  fetchUserProfileImages,
  deleteUserProfile,
  getCurrentUserWithProfile,
} from "@/lib/profile/userProfileApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import type { Profile } from "@/types/profile";
import { ErrorState } from "@/components/ui/error-state";

type ImageType = {
  _id: string;
  url: string;
  storageId: string;
  fileName?: string;
  uploadedAt?: number;
};

const ProfilePage: React.FC = (): React.ReactElement => {
  const { isLoading: authLoading, isLoaded, isAuthenticated } = useAuthContext();
  const router = useRouter();

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery<
    Profile | undefined
  >({
    queryKey: ["profile"],
    queryFn: async () => {
      const result = await getCurrentUserWithProfile();
      if (!result.success || !result.data) return undefined;

      // Unwrap potential nested envelopes { success: true, data: {...} }
      let envelope: unknown = result.data;
      if (
        envelope &&
        typeof envelope === "object" &&
        "success" in envelope &&
        "data" in envelope
      ) {
        envelope = (envelope as { data: unknown }).data;
      }

      const profileObj =
        envelope &&
        typeof envelope === "object" &&
        envelope !== null &&
        "profile" in envelope
          ? (envelope as { profile: Profile | null }).profile
          : (envelope as Profile | null);

      return profileObj ?? undefined;
    },
    // Token-based client auto-attaches Authorization; only run after auth hydration
    enabled: isLoaded && isAuthenticated,
  });

  // Fetch images
  const { data: images = [], isLoading: imagesLoading } = useQuery<ImageType[]>(
    {
      queryKey: ["profileImages", profile?.userId],
      queryFn: async () => {
        if (!profile?.userId) return [];
        const result = await fetchUserProfileImages(profile.userId);
        if (
          !result.success ||
          result.data === undefined ||
          result.data === null
        ) {
          return [];
        }

        // Unwrap one extra envelope if present
        let payload: unknown = result.data;
        if (
          payload &&
          typeof payload === "object" &&
          "success" in payload &&
          "data" in payload
        ) {
          payload = (payload as { data: unknown }).data;
        }

        if (Array.isArray(payload)) {
          return payload as ImageType[];
        }

        if (
          payload &&
          typeof payload === "object" &&
          payload !== null &&
          "images" in payload &&
          Array.isArray((payload as { images: unknown }).images)
        ) {
          return (payload as { images: ImageType[] }).images;
        }

        return [];
      },
      // Token-based client auto-attaches Authorization; only run after auth hydration
      enabled: isLoaded && isAuthenticated && !!profile?.userId,
    }
  );

  // Handler to delete profile
  const deleteProfileMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!profile?._id) return;
      await deleteUserProfile();
    },
    onSuccess: () => {
      router.push("/");
    },
  });

  const [showDeleteDialog, setShowDeleteDialog] =
    React.useState<boolean>(false);

  const handleDeleteProfile = React.useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const confirmDeleteProfile = () => {
    deleteProfileMutation.mutate();
    setShowDeleteDialog(false);
  };

  const cancelDeleteProfile = () => {
    setShowDeleteDialog(false);
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center w-full bg-base-light min-h-screen">
        <Skeleton className="w-full max-w-md h-64" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center w-full bg-base-light min-h-screen">
        <ErrorState
          message="Profile not found."
          onRetry={() => router.refresh()}
        />
      </div>
    );
  }

  return (
    <div className="flex overflow-y-hidden items-center justify-center w-full bg-pink-50">
      <div className="w-full space-y-6 py-6">
        <ProfileView
          profileData={profile}
          images={images}
          isLoadingImages={imagesLoading}
          onDelete={handleDeleteProfile}
        />

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Profile</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete your profile? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end space-x-2">
              <Button
                asChild
                variant="outline"
                onClick={cancelDeleteProfile}
                disabled={deleteProfileMutation.status === "pending"}
              >
                <DialogClose asChild>
                  <span>Cancel</span>
                </DialogClose>
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteProfile}
                disabled={deleteProfileMutation.status === "pending"}
              >
                {deleteProfileMutation.status === "pending"
                  ? "Deleting..."
                  : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ProfilePage;
