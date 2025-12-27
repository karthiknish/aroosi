"use client";

import React, { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { adminProfilesAPI, AdminProfile } from "@/lib/api/admin/profiles";
import {
  Plus,
  Search,
  Ban,
  CheckCircle,
  Eye,
  Trash2,
  UserX,
  Pencil,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DataTable } from "@/components/admin/DataTable";
import Link from "next/link";
import Image from "next/image";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import type { Profile, ProfileImageInfo } from "@aroosi/shared/types";

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "banned">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
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
  const [planFilter] = useState<"all" | "free" | "premium" | "premiumPlus">(
    "all"
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on status change
  useEffect(() => {
    setPage(1);
  }, [status]);

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
      status,
      planFilter,
      debouncedSearch,
    ],
    queryFn: async () => {
      // Server reads HttpOnly cookies for admin auth
      const {
        profiles,
        total,
        page: srvPage,
        pageSize: srvPageSize,
      } = await adminProfilesAPI.list({
        search: debouncedSearch,
        page,
        pageSize,
        sortBy,
        sortDir,
        banned:
          status === "all" ? "all" : status === "banned" ? "true" : "false",
        plan: planFilter,
      });

      const profilesForImages = profiles.map((p: any) => ({
        _id: p._id,
        userId: p.userId || p._id,
      }));

      const profileImages = await adminProfilesAPI.batchFetchImages(profilesForImages);

      return {
        profiles,
        profileImages,
        total,
        page: srvPage || page,
        pageSize: srvPageSize || pageSize,
      };
    },
    enabled: true,
    retry: 2,
    staleTime: 20000,
  });

  const profiles: any[] = React.useMemo(
    () => (data?.profiles as any[]) || [],
    [data]
  );
  const profileImages: Record<string, ProfileImageInfo[]> =
    (data?.profileImages as Record<string, ProfileImageInfo[]>) || {};

  const total: number = (data?.total as number) || 0;
  const serverPage: number = (data?.page as number) || page;
  const serverPageSize: number = (data?.pageSize as number) || pageSize;
  const totalPages = Math.max(
    1,
    Math.ceil((total || 0) / (serverPageSize || 1))
  );

  const columns = [
    {
      header: "User",
      cell: (profile: AdminProfile) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
            {profileImages[profile._id]?.[0]?.url ? (
              <Image
                src={profileImages[profile._id][0].url}
                alt={profile.fullName || ""}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                <UserX className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-neutral-900 truncate">{profile.fullName || "Unknown"}</div>
            <div className="text-xs text-neutral-500 truncate">{profile.city || "No location"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Age",
      cell: (profile: AdminProfile) => (
        <span className="text-sm text-neutral-600">{getAge(profile.dateOfBirth)}</span>
      ),
    },
    {
      header: "Status",
      cell: (profile: AdminProfile) => (
        profile.banned ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">
            Banned
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">
            Active
          </span>
        )
      ),
    },
    {
      header: "Plan",
      cell: (profile: AdminProfile) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">{profile.subscriptionPlan || "Free"}</span>
          {profile.subscriptionExpiresAt && (
            <span className="text-[10px] text-neutral-400">
              Expires: {new Date(profile.subscriptionExpiresAt * 1000).toLocaleDateString()}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (profile: AdminProfile) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-neutral-500 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/profile/${profile._id}`);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-neutral-500 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/profile/${profile._id}/edit`);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "h-8 w-8",
              profile.banned ? "text-emerald-600" : "text-amber-600"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmBanId(profile._id);
            }}
          >
            <Ban className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteId(profile._id);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Handlers
  const onDelete = async (id: string) => {
    await adminProfilesAPI.delete(id);
    setConfirmDeleteId(null);
    void loadProfiles();
    showSuccessToast("Profile deleted");
  };

  const onToggleBan = async (id: string, isBanned: boolean) => {
    try {
      await adminProfilesAPI.setBannedStatus(id, !isBanned);
      setConfirmBanId(null);
      void loadProfiles();
      showSuccessToast(isBanned ? "Profile unbanned" : "Profile banned");
    } catch (e: any) {
      showErrorToast(e.message || "Failed to update ban status");
    }
  };

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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Input
                  type="text"
                  placeholder="Search by name, city, or phone..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-3">
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(value) => value && setViewMode(value as "grid" | "table")}
                className="bg-neutral-100 p-1 rounded-lg border"
              >
                <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 w-8 p-0 rounded-md data-[state=on]:bg-white data-[state=on]:shadow-sm">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Table view" className="h-8 w-8 p-0 rounded-md data-[state=on]:bg-white data-[state=on]:shadow-sm">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              <label
                htmlFor="profile-status-select"
                className="text-sm font-medium text-gray-700 ml-2"
              >
                Status:
              </label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as "all" | "active" | "banned")
                }
              >
                <SelectTrigger id="profile-status-select" className="w-[120px] border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground">
                {total} profiles found
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
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={(e) => {
                      e.preventDefault();
                      if (serverPage > 1) setPage(serverPage - 1);
                    }}
                    className={cn(
                      "cursor-pointer",
                      (loading || serverPage <= 1) && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
                
                {/* Simple page numbers - can be enhanced with ellipsis logic if needed */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum = serverPage;
                  if (serverPage <= 3) pageNum = i + 1;
                  else if (serverPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = serverPage - 2 + i;
                  
                  if (pageNum <= 0 || pageNum > totalPages) return null;
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        isActive={serverPage === pageNum}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pageNum);
                        }}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {totalPages > 5 && serverPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationNext 
                    onClick={(e) => {
                      e.preventDefault();
                      if (serverPage < totalPages) setPage(serverPage + 1);
                    }}
                    className={cn(
                      "cursor-pointer",
                      (loading || serverPage >= totalPages) && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>

        {/* Profiles Grid or Empty State */}
        {loading ? (
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
        ) : profiles.length === 0 ? (
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
        ) : viewMode === "table" ? (
          <DataTable 
            columns={columns} 
            data={profiles} 
            onRowClick={(profile) => router.push(`/admin/profile/${profile._id}`)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {profiles.map((profile: AdminProfile) => (
              <div
                key={profile._id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all duration-200 group relative overflow-hidden flex flex-col"
              >
                {/* Edit Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-sm hover:bg-white hover:shadow-md transition-all opacity-0 group-hover:opacity-100 border border-neutral-100 h-8 w-8"
                  title="Edit Profile"
                  onClick={() =>
                    router.push(`/admin/profile/${profile._id}/edit`)
                  }
                >
                  <Pencil className="w-4 h-4 text-neutral-600" />
                </Button>

                <div className="p-5 flex flex-col h-full">
                  {/* Profile Image */}
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-neutral-50 mx-auto mb-4 bg-neutral-50 flex items-center justify-center shadow-inner">
                    {profileImages[profile._id] === undefined ? (
                      <Skeleton className="w-full h-full rounded-2xl" />
                    ) : profileImages[profile._id].length > 0 ? (
                      <Image
                        src={
                          profileImages[profile._id][0].url ||
                          "/images/placeholder.png"
                        }
                        alt={profile.fullName || "Profile image"}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <UserX className="w-10 h-10 text-neutral-300" />
                    )}
                  </div>

                  {/* Profile Info */}
                  <div className="text-center mb-4 flex-1">
                    <h3 className="font-bold text-lg text-neutral-900 truncate mb-0.5">
                      {profile.fullName || "Unknown User"}
                    </h3>
                    <p className="text-sm text-neutral-500 truncate mb-2">
                      {profile.city || "Location not set"}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">
                        Age: {getAge(profile.dateOfBirth)}
                      </span>
                    </div>
                  </div>

                  {/* Status & Subscription */}
                  <div className="flex flex-col gap-3 mb-5">
                    {/* Status Badge */}
                    <div className="flex justify-center">
                      {profile.banned ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                          <Ban className="w-3 h-3" />
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </div>

                    {/* Subscription Info */}
                    {profile.subscriptionPlan && (
                      <div className="text-center p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block mb-0.5">
                          Plan
                        </span>
                        <span className="text-xs font-bold text-neutral-700">
                          {profile.subscriptionPlan}
                        </span>
                        {typeof profile.subscriptionExpiresAt === "number" && (
                          <div className="text-[10px] text-neutral-500 mt-1 font-medium">
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
                  <div className="flex items-center gap-2 pt-4 border-t border-neutral-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(`/admin/profile/${profile._id}`)
                      }
                      className="flex-1 h-9 text-xs font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View
                    </Button>

                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title={profile.banned ? "Unban User" : "Ban User"}
                        onClick={() => setConfirmBanId(profile._id)}
                        className={cn(
                          "h-9 w-9",
                          profile.banned
                            ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        )}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        title="Delete Profile"
                        onClick={() => setConfirmDeleteId(profile._id)}
                        className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
                {profiles.find((p) => p._id === confirmBanId)?.banned
                  ? "Unban"
                  : "Ban"}{" "}
                Profile
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to{" "}
                {profiles.find((p) => p._id === confirmBanId)?.banned
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
                      !!profiles.find((p) => p._id === confirmBanId)?.banned
                    )
                  }
                >
                  {profiles.find((p) => p._id === confirmBanId)?.banned
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
