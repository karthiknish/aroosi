"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useAuthContext } from "@/components/AuthProvider";
import { ProfileView } from "@/components/profile/ProfileView";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type ImageType = {
  _id: string;
  url: string;
  storageId: string;
  fileName?: string;
  uploadedAt?: number;
};

const ProfilePage: React.FC = (): React.ReactElement => {
  const { isLoading: authLoading, token } = useAuthContext();
  const router = useRouter();

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery<
    Profile | undefined
  >({
    queryKey: ["profile", token],
    queryFn: async () => {
      if (!token) return undefined;
      const result = await getCurrentUserWithProfile(token);
      console.log("result", result);
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
    enabled: !!token,
  });

  // Fetch images
  const { data: images = [], isLoading: imagesLoading } = useQuery<ImageType[]>(
    {
      queryKey: ["profileImages", token, profile?.userId],
      queryFn: async () => {
        if (!token || !profile?.userId) return [];
        const result = await fetchUserProfileImages(token, profile.userId);
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
      enabled: !!token && !!profile?.userId,
    }
  );

  // Handler to delete profile
  const deleteProfileMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!token || !profile?._id) return;
      await deleteUserProfile(token);
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
      <div className="flex items-center justify-center w-full bg-base-light">
        <Card className="w-full max-w-md p-8">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-8 w-1/2 mb-2" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center w-full bg-base-light">
        <Card className="w-full max-w-md p-8">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full bg-base-light">
      <ProfileView
        className="mt-16"
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
              variant="outline"
              onClick={cancelDeleteProfile}
              disabled={deleteProfileMutation.status === "pending"}
              asChild
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
  );
};

export default ProfilePage;
