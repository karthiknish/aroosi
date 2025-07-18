"use client";

import React, { useState, useMemo } from "react";
import { useAuthContext } from "@/components/AuthProvider";
import {
  fetchAdminProfiles,
  deleteAdminProfile,
  setProfileBannedStatus,
  fetchAllAdminProfileImages,
} from "@/lib/profile/adminProfileApi";
import {
  Plus,
  Search,
  Ban,
  CheckCircle,
  Eye,
  Trash2,
  UserX,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { showSuccessToast } from "@/lib/ui/toast";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Banned", value: "banned" },
];

function getAge(dateOfBirth?: string) {
  if (!dateOfBirth) return "-";
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return "-";
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) years--;
  return years;
}

export default function AdminProfilePage() {
  const { token } = useAuthContext();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBanId, setConfirmBanId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const router = useRouter();

  const {
    data,
    isLoading: loading,
    error,
    refetch: loadProfiles,
  } = useQuery({
    queryKey: ["adminProfilesWithImages"],
    queryFn: async () => {
      if (!token) {
        throw new Error("No authentication token available");
      }
      const { profiles } = await fetchAdminProfiles({
        token,
        search: "",
        page: 1,
      });
      const profilesForImages = profiles.map((p) => ({
        _id: p._id,
        userId: p.userId || p._id,
      }));
      const profileImages = await fetchAllAdminProfileImages({
        token,
        profiles: profilesForImages,
      });
      return { profiles, profileImages };
    },
    enabled: !!token,
    retry: 2,
    staleTime: 30000, // 30 seconds
  });

  const profiles = data?.profiles || [];
  const profileImages = data?.profileImages || {};

  // Debug logging
  console.log("Admin Profile Page State:", {
    token: !!token,
    loading,
    error: error?.message,
    profileCount: profiles.length,
    hasData: !!data,
  });

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    let filtered = profiles;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.fullName?.toLowerCase().includes(s) ||
          p.city?.toLowerCase().includes(s) ||
          p.phoneNumber?.toLowerCase().includes(s),
      );
    }
    if (status === "active") filtered = filtered.filter((p) => !p.banned);
    if (status === "banned") filtered = filtered.filter((p) => p.banned);
    return filtered;
  }, [profiles, search, status]);

  // Handlers
  const onDelete = async (id: string) => {
    if (!token) return;
    await deleteAdminProfile({ token, id });
    setConfirmDeleteId(null);
    void loadProfiles();
    showSuccessToast("Profile deleted");
  };
  const onToggleBan = async (id: string, banned: boolean) => {
    if (!token) return;
    await setProfileBannedStatus(token, id, !banned);
    setConfirmBanId(null);
    void loadProfiles();
    showSuccessToast(banned ? "Profile unbanned" : "Profile banned");
  };

  // Loading state
  if (loading)
    return (
      <div className="max-w-7xl mx-auto py-10 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
          <Skeleton className="h-12 w-48" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Skeleton className="h-10 w-full sm:w-80 mb-2" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow p-6 flex flex-col gap-4"
            >
              <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
              <Skeleton className="h-6 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto mb-2" />
              <Skeleton className="h-4 w-40 mx-auto mb-2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "An error occurred."}
        onRetry={() => loadProfiles()}
        className="min-h-[60vh]"
      />
    );

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Profile Management</h1>
          <p className="text-muted-foreground max-w-2xl">
            View, search, edit, ban, or delete user profiles. Use the search and
            filter options to quickly find profiles. Click a card for more
            details or actions.
          </p>
        </div>
        <Link href="/admin/profile/create">
          <Button size="lg" className="gap-2">
            <Plus className="w-5 h-5" /> Create New Profile
          </Button>
        </Link>
      </div>
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-lg border px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, city, or phone..."
            className="flex-1 outline-none bg-white text-base text-foreground"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <select
            className="border rounded px-2 py-1 text-base text-foreground bg-white"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="text-foreground"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Profile Grid */}
      {filteredProfiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-4 py-8">
          <div className="text-gray-500">
            No profiles match your search/filter.
          </div>
          {!loading && (
            <Button variant="outline" onClick={() => loadProfiles()}>
              Refresh
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProfiles.map((profile) => (
            <div
              key={profile._id}
              className="bg-white rounded-xl shadow-md border p-4 flex flex-col gap-3 hover:shadow-lg transition group relative"
            >
              {/* Profile image */}
              <div className="w-20 h-20 rounded-lg overflow-hidden border mx-auto mb-2 bg-gray-50 flex items-center justify-center">
                {profileImages[profile._id] &&
                profileImages[profile._id].length > 0 &&
                profileImages[profile._id][0].url ? (
                  <Image
                    src={profileImages[profile._id][0].url}
                    alt={profile.fullName || "Profile image"}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserX className="w-10 h-10 text-gray-300" />
                )}
              </div>
              {/* Name, city, age */}
              <div className="text-center">
                <div className="font-semibold text-lg truncate">
                  {profile.fullName}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {profile.city}
                </div>
                <div className="text-xs text-gray-400">
                  Age: {getAge(profile.dateOfBirth)}
                </div>
              </div>
              {/* Status badge */}
              <div className="flex flex-col items-center gap-1 mb-1">
                <div className="flex justify-center gap-2">
                  {profile.banned ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                      <Ban className="w-3 h-3" /> Banned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-pink-100 text-pink-700">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
              </div>
              {/* Actions */}
              <div className="flex justify-center gap-2 mt-2">
                <Button
                  size="icon"
                  variant="ghost"
                  title="View"
                  onClick={() => setViewId(profile._id)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title={profile.banned ? "Unban" : "Ban"}
                  onClick={() => setConfirmBanId(profile._id)}
                >
                  <Ban className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Delete"
                  onClick={() => setConfirmDeleteId(profile._id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <button
                type="button"
                className="absolute top-2 right-2 bg-white rounded-full p-2 shadow hover:bg-gray-100 transition"
                title="Edit Profile"
                onClick={() =>
                  router.push(`/admin/profile/edit?id=${profile._id}`)
                }
              >
                <Pencil className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* View Modal */}
      {viewId && (
        <Dialog open={!!viewId} onOpenChange={() => setViewId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogTitle>Profile Details</DialogTitle>
            {/* ProfileCard component content */}
          </DialogContent>
        </Dialog>
      )}
      {/* Confirm Delete Dialog */}
      {confirmDeleteId && (
        <Dialog
          open={!!confirmDeleteId}
          onOpenChange={() => setConfirmDeleteId(null)}
        >
          <DialogContent>
            <DialogTitle>Delete Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this profile? This action cannot
              be undone.
            </DialogDescription>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => onDelete(confirmDeleteId)}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Confirm Ban Dialog */}
      {confirmBanId && (
        <Dialog
          open={!!confirmBanId}
          onOpenChange={() => setConfirmBanId(null)}
        >
          <DialogContent>
            <DialogTitle>
              {filteredProfiles.find((p) => p._id === confirmBanId)?.banned
                ? "Unban"
                : "Ban"}{" "}
              Profile
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {filteredProfiles.find((p) => p._id === confirmBanId)?.banned
                ? "unban"
                : "ban"}{" "}
              this profile?
            </DialogDescription>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setConfirmBanId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  onToggleBan(
                    confirmBanId,
                    !!filteredProfiles.find((p) => p._id === confirmBanId)
                      ?.banned,
                  )
                }
              >
                {filteredProfiles.find((p) => p._id === confirmBanId)?.banned
                  ? "Unban"
                  : "Ban"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
