"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import {
  useQuery as useConvexQuery,
  useMutation as useConvexMutation,
} from "convex/react";

import { Id } from "@/../convex/_generated/dataModel";
import { useDebounce } from "use-debounce";
import ProfileCard, { type ProfileEditFormState } from "./ProfileCard";
import type { Profile } from "@/types/profile";
import { Loader2 } from "lucide-react";

// Helper for rendering a profile image or fallback

export function ProfileManagement() {
  const [editingId, setEditingId] = useState<Id<"profiles"> | null>(null);
  const [editForm, setEditForm] = useState<ProfileEditFormState>({});
  const [deleteId, setDeleteId] = useState<Id<"profiles"> | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 400);
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // Fetch paginated/searchable profiles from Convex
  const { profiles = [], total = 0 } =
    useConvexQuery(api.users.adminListProfiles, {
      search: debouncedSearch,
      page,
      pageSize: 10,
    }) || {};

  // Convex mutation for deleting a profile
  const deleteProfile = useConvexMutation(api.users.deleteProfile);

  // Update profile mutation
  const adminUpdateProfile = useConvexMutation(api.users.adminUpdateProfile);

  // When starting to edit, pull all editable fields from the profile
  const startEdit = (profile: Profile) => {
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
      type AdminProfileUpdate = {
        banned?: boolean;
        fullName?: string;
        dateOfBirth?: string;
        gender?: "male" | "female" | "other";
        ukCity?: string;
        religion?: string;
        caste?: string;
        motherTongue?: string;
        height?: string;
        maritalStatus?: "single" | "divorced" | "widowed" | "annulled";
        education?: string;
        occupation?: string;
        annualIncome?: number;
        aboutMe?: string;
        phoneNumber?: string;
        diet?:
          | "vegetarian"
          | "non-vegetarian"
          | "vegan"
          | "eggetarian"
          | "other";
        smoking?: "no" | "occasionally" | "yes";
        drinking?: "no" | "occasionally" | "yes";
        physicalStatus?: "normal" | "differently-abled" | "other";
        partnerPreferenceAgeMin?: number;
        partnerPreferenceAgeMax?: number;
        partnerPreferenceReligion?: string[];
        partnerPreferenceUkCity?: string[];
        profileImageIds?: Id<"_storage">[];
      };
      const ef = editForm;
      const updates: AdminProfileUpdate = {
        banned: ef.banned,
        fullName: ef.fullName || undefined,
        dateOfBirth: ef.dateOfBirth || undefined,
        gender:
          ef.gender && ["male", "female", "other"].includes(ef.gender)
            ? (ef.gender as "male" | "female" | "other")
            : undefined,
        ukCity: ef.ukCity || undefined,
        religion: ef.religion || undefined,
        caste: ef.caste || undefined,
        motherTongue: ef.motherTongue || undefined,
        height: ef.height || undefined,
        maritalStatus:
          ef.maritalStatus &&
          ["single", "divorced", "widowed", "annulled"].includes(
            ef.maritalStatus
          )
            ? (ef.maritalStatus as
                | "single"
                | "divorced"
                | "widowed"
                | "annulled")
            : undefined,
        education: ef.education || undefined,
        occupation: ef.occupation || undefined,
        annualIncome:
          ef.annualIncome === "" || ef.annualIncome === undefined
            ? undefined
            : typeof ef.annualIncome === "string"
              ? isNaN(Number(ef.annualIncome))
                ? undefined
                : Number(ef.annualIncome)
              : ef.annualIncome,
        aboutMe: ef.aboutMe || undefined,
        phoneNumber: ef.phoneNumber || undefined,
        diet:
          ef.diet &&
          [
            "vegetarian",
            "non-vegetarian",
            "vegan",
            "eggetarian",
            "other",
          ].includes(ef.diet)
            ? (ef.diet as
                | "vegetarian"
                | "non-vegetarian"
                | "vegan"
                | "eggetarian"
                | "other")
            : undefined,
        smoking:
          ef.smoking && ["no", "occasionally", "yes"].includes(ef.smoking)
            ? (ef.smoking as "no" | "occasionally" | "yes")
            : undefined,
        drinking:
          ef.drinking && ["no", "occasionally", "yes"].includes(ef.drinking)
            ? (ef.drinking as "no" | "occasionally" | "yes")
            : undefined,
        physicalStatus:
          ef.physicalStatus &&
          ["normal", "differently-abled", "other"].includes(ef.physicalStatus)
            ? (ef.physicalStatus as "normal" | "differently-abled" | "other")
            : undefined,
        partnerPreferenceAgeMin:
          ef.partnerPreferenceAgeMin === "" ||
          ef.partnerPreferenceAgeMin === undefined
            ? undefined
            : typeof ef.partnerPreferenceAgeMin === "string"
              ? isNaN(Number(ef.partnerPreferenceAgeMin))
                ? undefined
                : Number(ef.partnerPreferenceAgeMin)
              : ef.partnerPreferenceAgeMin,
        partnerPreferenceAgeMax:
          ef.partnerPreferenceAgeMax === "" ||
          ef.partnerPreferenceAgeMax === undefined
            ? undefined
            : typeof ef.partnerPreferenceAgeMax === "string"
              ? isNaN(Number(ef.partnerPreferenceAgeMax))
                ? undefined
                : Number(ef.partnerPreferenceAgeMax)
              : ef.partnerPreferenceAgeMax,
        partnerPreferenceReligion: ((): string[] | undefined => {
          const val = ef.partnerPreferenceReligion;
          if (
            typeof val === "string" &&
            val !== undefined &&
            val !== null &&
            val !== ""
          ) {
            return (val as string)
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
          } else if (Array.isArray(val)) {
            return val;
          }
          return undefined;
        })(),
        partnerPreferenceUkCity: ((): string[] | undefined => {
          const val = ef.partnerPreferenceUkCity;
          if (
            typeof val === "string" &&
            val !== undefined &&
            val !== null &&
            val !== ""
          ) {
            return (val as string)
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
          } else if (Array.isArray(val)) {
            return val;
          }
          return undefined;
        })(),
        profileImageIds: Array.isArray(ef.profileImageIds)
          ? (ef.profileImageIds.filter(Boolean) as Id<"_storage">[])
          : undefined,
      };
      await adminUpdateProfile({ id, updates });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setShowSuccessModal(true);
    } catch {
      // Error handling is done via toast in other places; no need for unused variable
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
    } catch {
      toast.error("Failed to delete profile");
    }
  };

  // Ban/unban logic
  const toggleBan = async (id: Id<"profiles">, banned: boolean) => {
    try {
      await adminUpdateProfile({ id, updates: { banned: !banned } });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
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
        {profiles === undefined ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
            <span className="ml-3 text-pink-600 text-lg font-medium">
              Loading profiles...
            </span>
          </div>
        ) : (
          profiles.filter(Boolean).map((profile) => {
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
                onClick={() => handleDelete(deleteId! as Id<"profiles">)}
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
