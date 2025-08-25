"use client";

import React, { useState, useMemo } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
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
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

// Minimal local types for TS safety
type AdminProfile = {
  _id: string;
  userId?: string;
  fullName?: string;
  city?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  banned?: boolean;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: number;
};

type ImageType = { _id: string; url: string | null };

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Banned", value: "banned" },
] as const;

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
  // Cookie-auth; ensure auth context is initialized (no token usage)
  useAuthContext();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "banned">("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBanId, setConfirmBanId] = useState<string | null>(null);
  // view modal removed; using dedicated route /admin/profile/[id]
  const router = useRouter();

  // Server-driven params (internal only; no UI controls yet)
  const [page, setPage] = useState<number>(1);
  const [pageSize, _setPageSize] = useState<number>(12);
  const [sortBy] = useState<"createdAt" | "banned" | "subscriptionPlan">(
    "createdAt"
  );
  const [sortDir] = useState<"asc" | "desc">("desc");
  const [bannedFilter] = useState<"all" | "true" | "false">("all");
  const [planFilter] = useState<"all" | "free" | "premium" | "premiumPlus">(
    "all"
  );

  const {
    data,
    isLoading: loading,
    error,
    refetch: loadProfiles,
  } = useQuery({
    queryKey: [
      "adminProfilesWithImages",
      page,
      pageSize,
      sortBy,
      sortDir,
      bannedFilter,
      planFilter,
      // Note: search/status remain client-side for now
    ],
    queryFn: async () => {
      // Server reads HttpOnly cookies for admin auth
      const { profiles, total } = await fetchAdminProfiles({
        search: "", // server-side search not used yet
        page,
        pageSize,
        sortBy,
        sortDir,
        banned: bannedFilter,
        plan: planFilter,
      } as any);

      const profilesForImages = profiles.map((p: AdminProfile) => ({
        _id: p._id,
        userId: p.userId || p._id,
      }));

      const profileImages = await fetchAllAdminProfileImages({
        profiles: profilesForImages,
      });

      return { profiles, profileImages, total, page, pageSize };
    },
    enabled: true,
    retry: 2,
    staleTime: 20000,
  });

  const profiles: AdminProfile[] = React.useMemo(
    () => (data?.profiles as AdminProfile[]) || [],
    [data]
  );
  const profileImages: Record<string, ImageType[]> =
    (data?.profileImages as Record<string, ImageType[]>) || {};

  const total: number = (data?.total as number) || 0;
  const serverPage: number = (data?.page as number) || page;
  const serverPageSize: number = (data?.pageSize as number) || pageSize;
  const totalPages = Math.max(
    1,
    Math.ceil((total || 0) / (serverPageSize || 1))
  );

  // Debug logging removed to satisfy no-console lint

  // Client-side filtering: search + status only (minimal)
  const filteredProfiles: AdminProfile[] = useMemo((): AdminProfile[] => {
    let filtered = profiles;

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p: AdminProfile) =>
          (p.fullName || "").toLowerCase().includes(s) ||
          (p.city || "").toLowerCase().includes(s) ||
          (p.phoneNumber || "").toLowerCase().includes(s)
      );
    }
    if (status === "active")
      filtered = filtered.filter((p: AdminProfile) => !p.banned);
    if (status === "banned")
      filtered = filtered.filter((p: AdminProfile) => !!p.banned);

    return filtered;
  }, [profiles, search, status]);

  // Handlers
  const onDelete = async (id: string) => {
    await deleteAdminProfile({ id });
    setConfirmDeleteId(null);
    void loadProfiles();
    showSuccessToast("Profile deleted");
  };

  const onToggleBan = async (id: string, isBanned: boolean) => {
    const result = await setProfileBannedStatus(id, !isBanned);
    setConfirmBanId(null);
    if (!result.success) {
      showErrorToast(result.error, "Failed to update ban status");
      return;
    }
    void loadProfiles();
    showSuccessToast(isBanned ? "Profile unbanned" : "Profile banned");
  };

  // Loading state
  if (loading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header Skeleton */}
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-5 w-96 max-w-full" />
              </div>
              <Skeleton className="h-12 w-48" />
            </div>
          </div>

          {/* Search Controls Skeleton */}
          <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Pagination Skeleton */}
          <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-md border p-4 flex flex-col gap-3 min-h-[320px]"
              >
                <Skeleton className="h-20 w-20 rounded-xl mx-auto mb-2" />
                <div className="text-center space-y-2 flex-1">
                  <Skeleton className="h-6 w-32 mx-auto" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>
                <div className="flex justify-center gap-1 mt-auto">
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="border-t border-gray-100 pt-2">
                  <div className="flex justify-center gap-1">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <ErrorState
              message={(error as Error)?.message || "An error occurred."}
              onRetry={() => loadProfiles()}
              className="min-h-[40vh]"
            />
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Profile Management
              </h1>
              <p className="text-gray-600 max-w-2xl">
                View, search, edit, ban, or delete user profiles. Use the search
                and filter options to quickly find profiles. Click a card for
                more details or actions.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link href="/admin/profile/create">
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Search & Status Controls */}
        <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, city, or phone..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-3">
              <label
                htmlFor="profile-status-select"
                className="text-sm font-medium text-gray-700"
              >
                Status:
              </label>
              <select
                id="profile-status-select"
                className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "all" | "active" | "banned")
                }
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground">
                {filteredProfiles.length} of {profiles.length} profiles
              </span>
            </div>
          </div>
        </div>

        {/* Pagination and Stats Bar */}
        <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>
                Page {serverPage} of {totalPages}
              </span>
              <span>•</span>
              <span>{serverPageSize} per page</span>
              <span>•</span>
              <span className="font-medium text-foreground">
                {total} total profiles
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || serverPage <= 1}
                className="min-w-[70px]"
              >
                Previous
              </Button>
              <div className="px-3 py-1 text-sm border rounded">
                {serverPage}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={loading || serverPage >= totalPages}
                className="min-w-[70px]"
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Profiles Grid or Empty State */}
        {filteredProfiles.length === 0 ? (
          <div className="bg-white rounded-lg border shadow-sm p-12">
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <UserX className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No profiles found
                </h3>
                <p className="text-gray-500 max-w-md">
                  {search.trim() || status !== "all"
                    ? "No profiles match your current search criteria. Try adjusting your filters."
                    : "No profiles have been created yet."}
                </p>
              </div>
              <div className="flex gap-3">
                {(search.trim() || status !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setStatus("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
                <Button variant="outline" onClick={() => loadProfiles()}>
                  Refresh
                </Button>
                <Link href="/admin/profile/create">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Profile
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProfiles.map((profile: AdminProfile) => (
              <div
                key={profile._id}
                className="bg-white rounded-xl shadow-md border hover:shadow-lg transition-all duration-200 group relative overflow-hidden"
              >
                {/* Edit Button */}
                <button
                  type="button"
                  className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-sm hover:bg-white hover:shadow-md transition-all opacity-0 group-hover:opacity-100"
                  title="Edit Profile"
                  onClick={() =>
                    router.push(`/admin/profile/edit?id=${profile._id}`)
                  }
                >
                  <Pencil className="w-4 h-4 text-gray-600" />
                </button>

                <div className="p-4 flex flex-col h-full">
                  {/* Profile Image */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-100 mx-auto mb-4 bg-gray-50 flex items-center justify-center">
                    {profileImages[profile._id] === undefined ? (
                      <Skeleton className="w-full h-full rounded-xl" />
                    ) : profileImages[profile._id].length > 0 ? (
                      <Image
                        src={
                          profileImages[profile._id][0].url ||
                          "/images/placeholder.png"
                        }
                        alt={profile.fullName || "Profile image"}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserX className="w-8 h-8 text-gray-300" />
                    )}
                  </div>

                  {/* Profile Info */}
                  <div className="text-center mb-4 flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 truncate mb-1">
                      {profile.fullName || "Unknown User"}
                    </h3>
                    <p className="text-sm text-gray-500 truncate mb-1">
                      {profile.city || "Location not set"}
                    </p>
                    <p className="text-xs text-gray-400">
                      Age: {getAge(profile.dateOfBirth)}
                    </p>
                  </div>

                  {/* Status & Subscription */}
                  <div className="flex flex-col gap-2 mb-4">
                    {/* Status Badge */}
                    <div className="flex justify-center">
                      {profile.banned ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <Ban className="w-3 h-3" />
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>

                    {/* Subscription Info */}
                    {profile.subscriptionPlan && (
                      <div className="text-center">
                        <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                          {profile.subscriptionPlan}
                        </span>
                        {typeof profile.subscriptionExpiresAt === "number" && (
                          <div className="text-xs text-gray-400 mt-1">
                            {(() => {
                              const ms =
                                profile.subscriptionExpiresAt! * 1 - Date.now();
                              if (ms <= 0) return "Expired";
                              const days = Math.floor(ms / 86400000);
                              if (days >= 1) return `${days}d remaining`;
                              const hours = Math.floor(ms / 3600000);
                              if (hours >= 1) return `${hours}h remaining`;
                              const minutes = Math.max(
                                1,
                                Math.floor(ms / 60000)
                              );
                              return `${minutes}m remaining`;
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-center gap-1 pt-2 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="View Details"
                      onClick={() =>
                        router.push(`/admin/profile/${profile._id}`)
                      }
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      title={profile.banned ? "Unban User" : "Ban User"}
                      onClick={() => setConfirmBanId(profile._id)}
                      className={
                        profile.banned
                          ? "text-green-600 hover:text-green-700"
                          : "text-red-600 hover:text-red-700"
                      }
                    >
                      <Ban className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      title="Delete Profile"
                      onClick={() => setConfirmDeleteId(profile._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Modal removed in favor of dedicated /admin/profile/[id] page */}

        {/* Confirm Delete Dialog */}
        {confirmDeleteId && (
          <Dialog
            open={!!confirmDeleteId}
            onOpenChange={() => setConfirmDeleteId(null)}
          >
            <DialogContent className="bg-white p-0 sm:max-w-md overflow-hidden rounded-xl border shadow-lg">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.6}
                      stroke="currentColor"
                      className="h-7 w-7 text-red-600"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21.75H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <DialogTitle className="text-xl font-semibold text-red-700">
                      Delete profile?
                    </DialogTitle>
                    <DialogDescription className="text-sm text-neutral-600 leading-relaxed">
                      This will permanently remove the user profile, their
                      photos, matches and messages. This action cannot be
                      undone.
                    </DialogDescription>
                    <ul className="mt-2 list-disc list-inside text-xs text-neutral-500 space-y-1">
                      <li>User data & content removed</li>
                      <li>Cannot be restored later</li>
                      <li>Use ban instead if you may reverse later</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 pt-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDeleteId(null)}
                  className="bg-white"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onDelete(confirmDeleteId)}
                  className="shadow-sm"
                >
                  Delete Permanently
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
            <DialogContent className="bg-white">
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
                        ?.banned
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
    </div>
  );
}
