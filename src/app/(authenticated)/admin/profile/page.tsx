"use client";

import React, { useState } from "react";
import { useAuthContext } from "@/components/AuthProvider";
import {
  fetchAdminProfiles,
  updateAdminProfile,
  deleteAdminProfile,
  banAdminProfile,
} from "@/lib/profile/adminProfileApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Profile as AdminProfile } from "@/types/profile";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import ProfileCard, {
  ProfileEditFormState,
} from "@/components/admin/ProfileCard";
const AdminProfilePage = () => {
  const { token } = useAuthContext();
  const {
    data: profiles,
    isLoading: loading,
    error,
    refetch: loadProfiles,
  } = useQuery({
    queryKey: ["adminProfiles", token],
    queryFn: () =>
      fetchAdminProfiles({ token: token ?? "", search: "", page: 1 }),
    enabled: !!token,
    select: (data: { profiles: AdminProfile[]; total: number }) => {
      console.log("data:", data);
      return data.profiles;
    },
  });
  console.log("profiles:", profiles);
  // Local state for editing, form, and deletion
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProfileEditFormState>({});
  const setDeleteId = () => {};

  // Handler: Start editing a profile
  const onStartEdit = (profile: AdminProfile) => {
    setEditingId(profile._id);
    setEditForm({ ...profile });
  };

  // Handler: Edit form field change
  const onEditFormChange = (updates: Partial<ProfileEditFormState>) => {
    setEditForm((prev) => ({ ...prev, ...updates }));
  };

  // Handler: Save profile edits
  const onSaveEdit = async (id: string) => {
    if (!token) return;
    const allowedMaritalStatus = ["single", "divorced", "widowed"];
    const {
      maritalStatus,
      partnerPreferenceAgeMin,
      partnerPreferenceAgeMax,
      ...rest
    } = editForm;
    const updates: Partial<AdminProfile> = { ...rest };
    if (
      typeof maritalStatus === "string" &&
      allowedMaritalStatus.includes(maritalStatus)
    ) {
      updates.maritalStatus = maritalStatus as
        | "single"
        | "divorced"
        | "widowed";
    }
    if (
      partnerPreferenceAgeMin !== undefined &&
      !isNaN(Number(partnerPreferenceAgeMin))
    ) {
      updates.partnerPreferenceAgeMin = Number(partnerPreferenceAgeMin);
    }
    if (
      partnerPreferenceAgeMax !== undefined &&
      !isNaN(Number(partnerPreferenceAgeMax))
    ) {
      updates.partnerPreferenceAgeMax = Number(partnerPreferenceAgeMax);
    }
    await updateAdminProfile({ token, id, updates });
    setEditingId(null);
    setEditForm({});
    loadProfiles();
  };

  // Handler: Cancel editing
  const onCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Handler: Delete profile
  const onDelete = async (id: string) => {
    if (!token) return;
    await deleteAdminProfile({ token, id });
    setDeleteId();
    loadProfiles();
  };

  // Handler: Ban/unban profile
  const onToggleBan = async (id: string, banned: boolean) => {
    if (!token) return;
    await banAdminProfile({ token, id, banned: !banned });
    loadProfiles();
  };

  // Handler: Update profile images (optional, for image management)
  const adminUpdateProfile = async ({
    id,
    updates,
  }: {
    id: string;
    updates: { profileImageIds: string[] };
  }) => {
    if (!token) return;
    return updateAdminProfile({ token, id, updates });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="animate-spin mr-2" />
        Loading...
      </div>
    );

  if (error)
    return (
      <div className="max-w-md mx-auto mt-8">
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              {error instanceof Error ? error.message : "An error occurred."}
            </DialogDescription>
          </DialogContent>
        </Dialog>
      </div>
    );

  if (!loading && token && !profiles) {
    return (
      <div className="flex items-center justify-center h-40">
        <Button onClick={() => loadProfiles()}>Load Admin Profiles</Button>
      </div>
    );
  }

  return (
    <Card className="my-14 mx-auto">
      <CardHeader>
        <CardTitle>Admin Profiles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {profiles && Array.isArray(profiles) && profiles.length > 0 ? (
            profiles.map((profile) => (
              <ProfileCard
                key={profile._id}
                profile={profile}
                editingId={editingId}
                editForm={editForm}
                onStartEdit={onStartEdit}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onDelete={onDelete}
                onToggleBan={onToggleBan}
                setDeleteId={setDeleteId}
                onEditFormChange={onEditFormChange}
                adminUpdateProfile={adminUpdateProfile}
              />
            ))
          ) : (
            <div className="col-span-full text-center text-muted-foreground">
              No admin profiles found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminProfilePage;
