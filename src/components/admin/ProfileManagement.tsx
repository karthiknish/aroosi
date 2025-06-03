"use client";

import { useState, useCallback } from "react";
import { useAuthContext } from "../AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import ProfileCard from "./ProfileCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAdminProfiles,
  fetchAdminProfileImages,
  updateAdminProfile,
  deleteAdminProfile,
  banAdminProfile,
  fetchAllAdminProfileImages,
} from "@/lib/profile/adminProfileApi";
import type { ProfileEditFormState } from "@/types/profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Id } from "@/../convex/_generated/dataModel";
import { Profile } from "@/types/profile";
import { useRouter } from "next/navigation";

// Local ProfileImage type for admin usage
type AdminProfileImage = {
  _id: string;
  storageId: string;
  url: string | null;
  fileName: string;
  uploadedAt: number;
  banned?: boolean;
};

interface ProfilesResponse {
  profiles: Profile[];
  total: number;
}

export default function ProfileManagement() {
  const { token } = useAuthContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProfileEditFormState>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [profileImages, setProfileImages] = useState<
    Record<string, AdminProfileImage[]>
  >({});
  const router = useRouter();

  const fetchAllProfileImages = useCallback(
    async (profiles: Profile[]) => {
      if (!token) return;
      const newImages = await fetchAllAdminProfileImages(token, profiles);
      setProfileImages(newImages);
    },
    [token]
  );

  const { data: profilesData, isLoading } = useQuery<ProfilesResponse>({
    queryKey: ["adminProfiles", token, search, page],
    queryFn: async () => {
      if (!token) return { profiles: [], total: 0 };
      const data = await fetchAdminProfiles(token, search, page);
      if (Array.isArray(data.profiles)) {
        fetchAllProfileImages(data.profiles);
      }
      return data;
    },
    enabled: !!token,
  });

  const profiles = profilesData?.profiles || [];
  const total = profilesData?.total || 0;

  // Update profile using API
  const saveEdit = async (id: string) => {
    try {
      const allowedFields = [
        "aboutMe",
        "annualIncome",
        "banned",
        "caste",
        "dateOfBirth",
        "diet",
        "drinking",
        "education",
        "fullName",
        "gender",
        "height",
        "hiddenFromSearch",
        "isProfileComplete",
        "maritalStatus",
        "motherTongue",
        "occupation",
        "partnerPreferenceAgeMax",
        "partnerPreferenceAgeMin",
        "partnerPreferenceReligion",
        "partnerPreferenceUkCity",
        "phoneNumber",
        "physicalStatus",
        "profileImageIds",
        "religion",
        "smoking",
        "ukCity",
        "ukPostcode",
      ];
      const updates = Object.fromEntries(
        Object.entries(editForm).filter(([key]) => allowedFields.includes(key))
      );
      const updatedProfile = await updateAdminProfile(token!, id, updates);
      // Refetch image URLs for this profile
      if (updatedProfile.userId) {
        try {
          const data = await fetchAdminProfileImages(
            token!,
            updatedProfile.userId
          );
          setProfileImages((prev) => ({
            ...prev,
            [updatedProfile._id]: Array.isArray(data.userProfileImages)
              ? data.userProfileImages
              : [],
          }));
        } catch {}
      }
      setEditingId(null);
      setShowSuccessModal(true);
    } catch {
      toast.error("Failed to save profile.");
    }
  };

  // Admin update profile for image upload
  const adminUpdateProfile = async ({
    id,
    updates,
  }: {
    id: string;
    updates: { profileImageIds: string[] };
  }) => {
    const updatedProfile = await updateAdminProfile(token!, id, updates);
    // Update local images state for this profile
    if (updatedProfile.userId) {
      try {
        const data = await fetchAdminProfileImages(
          token!,
          updatedProfile.userId
        );
        setProfileImages((prev) => ({
          ...prev,
          [updatedProfile._id]: Array.isArray(data.userProfileImages)
            ? data.userProfileImages
            : [],
        }));
      } catch {}
    }
    // Update editForm.profileImageIds if currently editing this profile
    setEditForm((prev) =>
      prev && prev.profileImageIds && prev.profileImageIds.length
        ? { ...prev, profileImageIds: updates.profileImageIds }
        : prev
    );
    return updatedProfile;
  };

  // Delete profile using API
  const handleDelete = async (id: string) => {
    try {
      await deleteAdminProfile(token!, id);
      setDeleteId(null);
      // Refetch profiles after delete
      try {
        const data = await fetchAdminProfiles(token!, search, page);
        setProfileImages(
          data.profiles.reduce(
            (acc: Record<string, AdminProfileImage[]>, profile: Profile) => ({
              ...acc,
              [profile._id]: (profile.profileImageIds || []).map(
                (id: string) => ({
                  _id: id,
                  storageId: "",
                  url: null,
                  fileName: "",
                  uploadedAt: 0,
                })
              ),
            }),
            {} as Record<string, AdminProfileImage[]>
          )
        );
      } catch {
        setProfileImages({});
      }
      setShowSuccessModal(true);
    } catch {
      toast.error("Failed to delete profile");
    }
  };

  // When starting to edit, pull all editable fields from the profile
  const startEdit = (profile: Profile) => {
    setEditingId(profile._id as string);
    setEditForm({
      aboutMe: profile.aboutMe || "",
      annualIncome: profile.annualIncome || "",
      banned: profile.banned || false,
      caste: profile.caste || "",
      dateOfBirth: profile.dateOfBirth || "",
      diet: profile.diet || "",
      drinking: profile.drinking || "",
      education: profile.education || "",
      fullName: profile.fullName || "",
      gender: profile.gender || "",
      height: profile.height || "",
      maritalStatus: profile.maritalStatus || "",
      motherTongue: profile.motherTongue || "",
      occupation: profile.occupation || "",
      partnerPreferenceAgeMin: profile.partnerPreferenceAgeMin || "",
      partnerPreferenceAgeMax: profile.partnerPreferenceAgeMax || "",
      partnerPreferenceReligion: profile.partnerPreferenceReligion || [],
      partnerPreferenceUkCity: profile.partnerPreferenceUkCity || [],
      phoneNumber: profile.phoneNumber || "",
      physicalStatus: profile.physicalStatus || "",
      profileImageIds: profile.profileImageIds || [],
      religion: profile.religion || "",
      smoking: profile.smoking || "",
      ukCity: profile.ukCity || "",
      ukPostcode: profile.ukPostcode || "",
      preferredGender: profile.preferredGender || "",
      isProfileComplete: profile.isProfileComplete || false,
    } as ProfileEditFormState);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Add handler to update editForm from child components
  const handleEditFormChange = (updates: Partial<ProfileEditFormState>) => {
    setEditForm((prev) => ({ ...prev, ...updates }));
  };

  // Ban/unban logic
  const handleToggleBan = async (id: Id<"profiles">, banned: boolean) => {
    if (!token) return;
    try {
      await banAdminProfile(token, id, !banned);
      // Update local state for immediate UI feedback
      setProfileImages((prev) => {
        const newImages = { ...prev };
        if (newImages[id]) {
          newImages[id] = newImages[id].map((img) => ({
            ...img,
            banned: !banned,
          }));
        }
        return newImages;
      });
      toast.success(`Profile ${banned ? "unbanned" : "banned"} successfully`);
    } catch {
      toast.error("Failed to update profile status");
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Profile Management</h2>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
        <Input
          placeholder="Search by name, city, religion, email, phone..."
          value={search}
          onChange={handleSearch}
          className="max-w-xs bg-white"
        />
        <div className="flex-1" />
        <Button
          variant="default"
          onClick={() => router.push("/admin/profile/create")}
          className="bg-pink-600 hover:bg-pink-700"
        >
          Create Profile
        </Button>
        <div className="text-sm text-gray-500">
          Showing {profiles.length} of {total} profiles
        </div>
      </div>
      <div className="grid gap-6 min-h-[120px]">
        {isLoading ? (
          <div className="grid gap-6 min-h-[120px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 p-4 bg-white rounded-2xl shadow animate-pulse"
              >
                <Skeleton className="w-full h-16 rounded-xl" />
                <Skeleton className="h-6 w-2/3 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
                <Skeleton className="h-4 w-1/3 rounded" />
              </div>
            ))}
          </div>
        ) : (
          profiles.filter(Boolean).map((profile: Profile) => {
            const safeProfile = {
              ...profile,
              createdAt:
                typeof profile.createdAt === "number"
                  ? new Date(profile.createdAt).toISOString()
                  : profile.createdAt,
              updatedAt:
                typeof profile.updatedAt === "number"
                  ? new Date(profile.updatedAt).toISOString()
                  : profile.updatedAt,
            };
            return (
              <ProfileCard
                key={profile._id as string}
                profile={safeProfile}
                editingId={editingId}
                editForm={editForm}
                onStartEdit={startEdit}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onDelete={handleDelete}
                onToggleBan={handleToggleBan}
                setDeleteId={setDeleteId}
                onEditFormChange={handleEditFormChange}
                images={profileImages[profile._id as string] || []}
                adminUpdateProfile={adminUpdateProfile}
              />
            );
          })
        )}
      </div>
      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </Button>
        <div className="text-sm text-gray-600">
          Page {page + 1} of {Math.max(1, Math.ceil(total / 10))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setPage((p) => (p + 1 < Math.ceil(total / 10) ? p + 1 : p))
          }
          disabled={page + 1 >= Math.ceil(total / 10)}
        >
          Next
        </Button>
      </div>
      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete this profile? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId! as string)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {showSuccessModal && (
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Profile updated successfully!</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowSuccessModal(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
