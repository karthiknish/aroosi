"use client";

import { useState, useEffect, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToken } from "@/components/TokenProvider";
import { toast } from "sonner";
import ProfileCard, { type ProfileEditFormState } from "./ProfileCard";
import type { Profile } from "@/types/profile";
import { Skeleton } from "@/components/ui/skeleton";

// Local ProfileImage type for admin usage
type ProfileImage = {
  _id: string;
  storageId: string;
  url: string | null;
  fileName: string;
  uploadedAt: number;
};

export default function ProfileManagement() {
  const token = useToken();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProfileEditFormState>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // Map of profileId to image URLs
  const [profileImages, setProfileImages] = useState<
    Record<string, ProfileImage[]>
  >({});
  const fetchAllProfileImages = useCallback(
    async (profiles: Profile[]) => {
      if (!token) return;
      const newImages: Record<string, ProfileImage[]> = {};
      await Promise.all(
        profiles.map(async (profile) => {
          if (!profile.userId) return;
          try {
            const res = await fetch(
              `/api/profile-detail/${profile.userId}/images`,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.userProfileImages)) {
                newImages[profile._id as string] = data.userProfileImages;
              }
            }
          } catch {}
        })
      );
      setProfileImages(newImages);
    },
    [token]
  );
  // Fetch paginated/searchable profiles from API
  useEffect(() => {
    if (!token) {
      // Don't attempt to fetch if token is not available yet
      return;
    }
    async function fetchProfiles() {
      setLoading(true);
      const headers: Record<string, string> = {};
      headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        `/api/admin/profiles?search=${encodeURIComponent(search)}&page=${page}&pageSize=10`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
        setTotal(data.total || 0);
        // Fetch image URLs for all profiles
        if (Array.isArray(data.profiles)) {
          fetchAllProfileImages(data.profiles);
        }
      } else {
        setProfiles([]);
        setTotal(0);
      }
      setLoading(false);
    }
    fetchProfiles();
  }, [
    search,
    page,
    token,
    setProfiles,
    setTotal,
    setLoading,
    fetchAllProfileImages,
  ]);

  // Fetch image URLs for all profiles

  // Update profile using API
  const saveEdit = async (id: string) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      // Omit _id and id from editForm before sending
      const updates = { ...editForm } as Record<string, unknown>;
      delete updates._id;
      delete updates.id;
      const res = await fetch(`/api/admin/profiles/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ id, updates }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      const updatedProfile = await res.json();
      setProfiles((prev) =>
        prev.map((p) => (p._id === updatedProfile._id ? updatedProfile : p))
      );
      // Refetch image URLs for this profile
      if (updatedProfile.userId) {
        try {
          const res = await fetch(
            `/api/profile-detail/${updatedProfile.userId}/images`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            setProfileImages((prev) => ({
              ...prev,
              [updatedProfile._id]: Array.isArray(data.userProfileImages)
                ? data.userProfileImages
                : [],
            }));
          }
        } catch {}
      }
      setEditingId(null);
      setShowSuccessModal(true);
    } catch {
      toast.error("Failed to save profile.");
    }
  };

  // Delete profile using API
  const handleDelete = async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/profiles/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to delete profile");
      setDeleteId(null);
      // Refetch profiles after delete
      const headers2: Record<string, string> = {};
      if (token) headers2["Authorization"] = `Bearer ${token}`;
      const refetchRes = await fetch(
        `/api/admin/profiles?search=${encodeURIComponent(search)}&page=${page}&pageSize=10`,
        { headers: headers2 }
      );
      if (refetchRes.ok) {
        const data = await refetchRes.json();
        setProfiles(data.profiles || []);
        setTotal(data.total || 0);
      }
      setShowSuccessModal(true);
    } catch {
      // handle error
    }
  };

  // When starting to edit, pull all editable fields from the profile
  const startEdit = (profile: Profile) => {
    setEditingId(profile._id as string);
    const rest = { ...profile } as Record<string, unknown>;
    delete rest._id;
    setEditForm({
      ...rest,
      fullName: profile.fullName || "",
      ukCity: profile.ukCity || "",
      gender: profile.gender || "",
      dateOfBirth: profile.dateOfBirth || "",
      religion: profile.religion || "",
      caste: profile.caste || "",
      motherTongue: profile.motherTongue || "",
      height: profile.height || "",
      maritalStatus: profile.maritalStatus || "",
      education: profile.education || "",
      occupation: profile.occupation || "",
      annualIncome: profile.annualIncome || "",
      aboutMe: profile.aboutMe || "",
      phoneNumber: profile.phoneNumber || "",
      diet: profile.diet || "",
      smoking: profile.smoking || "",
      drinking: profile.drinking || "",
      physicalStatus: profile.physicalStatus || "",
      partnerPreferenceAgeMin: profile.partnerPreferenceAgeMin || "",
      partnerPreferenceAgeMax: profile.partnerPreferenceAgeMax || "",
      partnerPreferenceReligion: profile.partnerPreferenceReligion || [],
      partnerPreferenceUkCity: profile.partnerPreferenceUkCity || [],
      profileImageIds: profile.profileImageIds || [],
      banned: profile.banned || false,
    });
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
  const toggleBan = async (id: string, banned: boolean) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/profiles/${id}/ban`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ banned: !banned }),
      });
      if (!res.ok) throw new Error("Failed to update ban status");
      // Update local state for immediate UI feedback
      setProfiles((prev) =>
        prev.map((p) => (p._id === id ? { ...p, banned: !banned } : p))
      );
      toast.success(banned ? "Profile unbanned" : "Profile banned");
    } catch {
      toast.error("Failed to update ban status");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Profile Management</h2>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
        <Input
          placeholder="Search by name, city, religion, email, phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-xs bg-white"
        />
        <div className="flex-1" />
        <div className="text-sm text-gray-500">
          Showing {profiles.length} of {total} profiles
        </div>
      </div>
      <div className="grid gap-6 min-h-[120px]">
        {loading ? (
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
                onToggleBan={toggleBan}
                setDeleteId={setDeleteId}
                onEditFormChange={handleEditFormChange}
                images={profileImages[profile._id as string] || []}
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
