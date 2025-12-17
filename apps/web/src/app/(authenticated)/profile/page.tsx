"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
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
  const {
    isLoading: authLoading,
    isLoaded,
    isAuthenticated,
    user,
    profile: authProfile,
  } = useAuthContext();
  const userId =
    user?.uid ||
    (authProfile as any)?._id ||
    (authProfile as any)?.userId ||
    "";
  const router = useRouter();

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery<
    Profile | undefined
  >({
    queryKey: ["profile"],
    queryFn: async () => {
      const result = await getCurrentUserWithProfile(userId);
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
      if (!profile?.userId) return;
      await deleteUserProfile(profile.userId);
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
    <>
      <div className="flex overflow-y-hidden items-center justify-center w-full bg-base-light">
        <div className="w-full space-y-6 py-6">
          <ProfileView
            profileData={profile}
            images={images}
            isLoadingImages={imagesLoading}
            onDelete={handleDeleteProfile}
          />

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="bg-base-light p-0 sm:max-w-md overflow-hidden rounded-xl border shadow-lg">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.6}
                      stroke="currentColor"
                      className="h-7 w-7 text-danger"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21.75H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <DialogTitle className="text-xl font-semibold text-danger">
                      Delete your profile?
                    </DialogTitle>
                    <p className="text-sm text-neutral-light leading-relaxed">
                      This will permanently remove your profile, photos,
                      matches, messages and preferences. You will not be able
                      to recover this data once deleted.
                    </p>
                    <ul className="mt-2 list-disc list-inside text-xs text-neutral-light space-y-1">
                      <li>Photos & messages are permanently erased</li>
                      <li>Conversations & matches will be lost</li>
                      <li>Data can’t be recovered later</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 pt-4 bg-base-dark/10 border-t flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={cancelDeleteProfile}
                  disabled={deleteProfileMutation.status === "pending"}
                  className="bg-base-light"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteProfile}
                  disabled={deleteProfileMutation.status === "pending"}
                  className="shadow-sm"
                >
                  {deleteProfileMutation.status === "pending"
                    ? "Deleting..."
                    : "Delete Permanently"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
