"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import {
  useQuery as useConvexQuery,
  useMutation as useConvexMutation,
} from "convex/react";

// Removed import { ProfileImageStack } from "@/components/ProfileImageStack";
import { Id } from "@/../convex/_generated/dataModel";
import { useDebounce } from "use-debounce";
import { useRouter } from "next/navigation";
import ProfileCard from "./ProfileCard";

// Helper for rendering a profile image or fallback

export function ProfileManagement() {
  const [editingId, setEditingId] = useState<Id<"profiles"> | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<Id<"profiles"> | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 400);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const queryClient = useQueryClient();
  const router = useRouter();
  // Fetch paginated/searchable profiles from Convex
  const { profiles = [], total = 0 } =
    useConvexQuery(api.users.adminListProfiles, {
      search: debouncedSearch,
      page,
      pageSize,
    }) || {};

  // Convex mutation for deleting a profile
  const deleteProfile = useConvexMutation(api.users.deleteProfile);

  // Update profile mutation
  const adminUpdateProfile = useConvexMutation(api.users.adminUpdateProfile);

  // When starting to edit, pull all editable fields from the profile
  const startEdit = (profile: any) => {
    setEditingId(profile._id as Id<"profiles">);
    setEditForm({
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

  // Update profile using Convex adminUpdateProfile mutation
  const saveEdit = async (id: Id<"profiles">) => {
    try {
      // Convert empty string enums to undefined
      const enumFields = [
        "gender",
        "maritalStatus",
        "diet",
        "smoking",
        "drinking",
        "physicalStatus",
      ];
      const updates = { ...editForm };
      enumFields.forEach((field) => {
        if (updates[field] === "") updates[field] = undefined;
      });
      // Convert empty string to undefined for number fields
      [
        "annualIncome",
        "partnerPreferenceAgeMin",
        "partnerPreferenceAgeMax",
      ].forEach((field) => {
        if (updates[field] === "") updates[field] = undefined;
        if (
          typeof updates[field] === "string" &&
          updates[field] !== undefined
        ) {
          const num = Number(updates[field]);
          updates[field] = isNaN(num) ? undefined : num;
        }
      });
      await adminUpdateProfile({ id, updates });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Delete logic using Convex mutation
  const handleDelete = async (id: Id<"profiles">) => {
    try {
      await deleteProfile({ id });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Profile deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete profile");
    }
  };

  // Ban/unban logic
  const toggleBan = async (id: Id<"profiles">, banned: boolean) => {
    try {
      await adminUpdateProfile({ id, updates: { banned: !banned } });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(banned ? "Profile unbanned" : "Profile banned");
    } catch (error) {
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
      <div className="grid gap-6">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile._id as string}
            profile={profile}
            editingId={editingId}
            editForm={editForm}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onDelete={handleDelete}
            onToggleBan={toggleBan}
            setDeleteId={setDeleteId}
            onImagesChanged={() =>
              queryClient.invalidateQueries({ queryKey: ["profiles"] })
            }
          />
        ))}
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
          Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setPage((p) => (p + 1 < Math.ceil(total / pageSize) ? p + 1 : p))
          }
          disabled={page + 1 >= Math.ceil(total / pageSize)}
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
                onClick={() => handleDelete(deleteId! as Id<"profiles">)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
