"use client";

import { useEffect, useState, useMemo } from "react";
import {
  fetchAdminAllMatches,
  AdminProfileMatchesResult,
  fetchAllAdminProfileImages,
  fetchAdminProfileById,
} from "@/lib/profile/adminProfileApi";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, ExternalLink, Users, Heart } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ImageType } from "@/types/image";
import type { Profile } from "@/types/profile";

function getAge(dob?: string) {
  if (!dob) return null;
  const date = new Date(dob);
  if (isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age--;
  return age;
}

export default function AdminMatchesPage() {
  // Cookie-auth; server will read HttpOnly cookies for admin APIs
  useAuthContext();
  const [matches, setMatches] = useState<AdminProfileMatchesResult>([]);
  const [profileImages, setProfileImages] = useState<
    Record<string, ImageType[]>
  >({});
  const [rootProfiles, setRootProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const matchesData = await fetchAdminAllMatches();
      setMatches(matchesData);
      // Root profile details
      const rootIds = Array.from(
        new Set(matchesData.map((m) => m.profileId).filter(Boolean))
      ) as string[];
      if (rootIds.length) {
        const fetched = await Promise.all(
          rootIds.map(async (id) => {
            try {
              const p = await fetchAdminProfileById({ id });
              return p ? [id, p] : null;
            } catch {
              return null;
            }
          })
        );
        const rp: Record<string, Profile> = {};
        fetched.forEach((entry) => {
          if (entry) {
            const [id, prof] = entry as [string, Profile];
            rp[id] = prof;
          }
        });
        setRootProfiles(rp);
      }
      // Collect all unique profile IDs for images
      const allIds = new Set<string>();
      matchesData.forEach((g) => {
        if (g.profileId) allIds.add(g.profileId as string);
        if (Array.isArray(g.matches))
          g.matches.forEach((m) => allIds.add(m._id));
      });
      if (allIds.size) {
        const minimalProfiles = Array.from(allIds).map((id) => ({
          _id: id,
          userId: id,
        }));
        const imagesData = await fetchAllAdminProfileImages({
          profiles: minimalProfiles,
        });
        setProfileImages(imagesData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  };

  // Load once on mount
  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build flattened unique match pairs (memoized)
  const matchPairs = useMemo(() => {
    const seen = new Set<string>();
    const out: {
      key: string;
      left: Profile | undefined;
      right: Profile | undefined;
    }[] = [];
    for (const group of matches) {
      const rootId = group.profileId;
      if (!rootId || !Array.isArray(group.matches)) continue;
      const rootProfile = rootProfiles[rootId];
      for (const m of group.matches) {
        if (!m?._id) continue;
        const a = String(rootId);
        const b = String(m._id);
        if (a === b) continue;
        const key = a < b ? `${a}__${b}` : `${b}__${a}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const leftFirst = a < b;
        out.push({
          key,
          left: leftFirst ? rootProfile : (m as Profile),
          right: leftFirst ? (m as Profile) : rootProfile,
        });
      }
    }
    return out;
  }, [matches, rootProfiles]);

  // total matches count
  const totalMatches = matchPairs.length;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Matches Overview</h1>
          <p className="text-muted-foreground">
            View all matches across user profiles. Total: {totalMatches} pairs
            across {matches.length} source profiles.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            Refresh Data
          </Button>
          <Link href="/admin/matches/create">
            <Button className="gap-2">
              <Heart className="w-4 h-4" />
              Create Manual Match
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} className="py-16" />
      ) : (
        <>
          {matchPairs.length === 0 ? (
            <div className="col-span-full">
              <EmptyState message="No user match pairs found." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {matchPairs.map((pair) => {
                const left = pair.left;
                const right = pair.right;
                const leftImages = left
                  ? profileImages[left._id as any] || []
                  : [];
                const rightImages = right
                  ? profileImages[right._id as any] || []
                  : [];
                const leftImageUrl = leftImages[0]?.url;
                const rightImageUrl = rightImages[0]?.url;
                const leftAge = left ? getAge(left.dateOfBirth as any) : null;
                const rightAge = right
                  ? getAge(right.dateOfBirth as any)
                  : null;
                return (
                  <Card
                    key={pair.key}
                    className="bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-neutral flex flex-wrap items-center gap-1">
                        <span className="truncate max-w-[40%]">
                          {left?.fullName || "Unnamed"}
                        </span>
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span className="truncate max-w-[40%]">
                          {right?.fullName || "Unnamed"}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <div className="flex flex-col gap-4">
                        {/* Left */}
                        <div className="flex-1 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-200 shadow-sm flex-shrink-0 bg-gray-100">
                            {leftImageUrl ? (
                              <img
                                src={leftImageUrl}
                                alt={left?.fullName || "Profile"}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <UserCircle className="w-7 h-7 text-neutral-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {left?.fullName || "Unnamed"}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {(left?.city || "").toString()}{" "}
                              {leftAge ? `• ${leftAge}` : ""}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate">
                              {left?.occupation || ""}
                            </div>
                          </div>
                          {left && (
                            <Link
                              href={`/admin/profile/${left._id}`}
                              className="ml-auto"
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </Link>
                          )}
                        </div>
                        {/* Right */}
                        <div className="flex-1 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-200 shadow-sm flex-shrink-0 bg-gray-100">
                            {rightImageUrl ? (
                              <img
                                src={rightImageUrl}
                                alt={right?.fullName || "Profile"}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <UserCircle className="w-7 h-7 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {right?.fullName || "Unnamed"}
                            </div>
                            <div className="text-xs text-neutral-500 truncate">
                              {(right?.city || "").toString()}{" "}
                              {rightAge ? `• ${rightAge}` : ""}
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate">
                              {right?.occupation || ""}
                            </div>
                          </div>
                          {right && (
                            <Link
                              href={`/admin/profile/${right._id}`}
                              className="ml-auto"
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-light">
                        <Users className="w-3 h-3" /> Pair ID:{" "}
                        {pair.key.replace(/__/g, " ↔ ")}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
