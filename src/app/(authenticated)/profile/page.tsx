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
      return result.success ? (result.data as Profile) : undefined;
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
        return result.success && Array.isArray(result.data)
          ? (result.data as ImageType[])
          : [];
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
      <div className="min-h-screen flex items-center justify-center bg-muted">
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
      <div className="min-h-screen flex items-center justify-center bg-muted">
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
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileView
            profileData={profile}
            images={images}
            isLoadingImages={imagesLoading}
            onDelete={handleDeleteProfile}
          />
          <div className="flex justify-end mt-8">
            <Button
              variant="destructive"
              onClick={handleDeleteProfile}
              disabled={deleteProfileMutation.status === "pending"}
            >
              {deleteProfileMutation.status === "pending"
                ? "Deleting..."
                : "Delete Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>
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
