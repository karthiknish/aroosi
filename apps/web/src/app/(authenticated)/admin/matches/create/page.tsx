"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { adminProfilesAPI } from "@/lib/api/admin/profiles";
import { adminMatchesAPI } from "@/lib/api/admin/matches";
import type { Profile } from "@aroosi/shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";
import Link from "next/link";
import { Search, Users, ArrowLeft, Heart, XCircle, CheckCircle2 } from "lucide-react";

// Minimal subset of profile fields we display/select
interface SearchResult extends Pick<Profile, "_id" | "fullName" | "email" | "city" | "dateOfBirth"> {
  userId?: string;
  imageUrl?: string | null;
}

function ageFromDob(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

export default function AdminCreateMatchPage() {
  // Initialize admin auth context (cookie based session on server APIs)
  useAuthContext();

  // Search + selection state
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [leftResults, setLeftResults] = useState<SearchResult[]>([]);
  const [rightResults, setRightResults] = useState<SearchResult[]>([]);
  const [leftLoading, setLeftLoading] = useState(false);
  const [rightLoading, setRightLoading] = useState(false);
  const [leftSelected, setLeftSelected] = useState<SearchResult | null>(null);
  const [rightSelected, setRightSelected] = useState<SearchResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  // Performs server fetch + client filter + image hydrate
  const performSearch = useCallback(
    async (query: string, side: "left" | "right") => {
      const q = query.trim();
      if (!q) {
        if (side === "left") setLeftResults([]); else setRightResults([]);
        return;
      }
      const setLoading = side === "left" ? setLeftLoading : setRightLoading;
      const setResults = side === "left" ? setLeftResults : setRightResults;
      setLoading(true);
      try {
        const { profiles } = await adminProfilesAPI.list({
          search: q,
          page: 1,
          pageSize: 12,
        });
        // Client-side filter fallback (name/email/city contains q)
        const filtered = (profiles || []).filter((p: any) => {
          const hay = `${p.fullName || ""} ${p.email || ""} ${p.city || ""}`.toLowerCase();
            return hay.includes(q.toLowerCase());
        });
        const augmented: SearchResult[] = await Promise.all(
          filtered.slice(0, 12).map(async (p: any) => {
            let imageUrl: string | null = null;
            try {
              const imgs = await adminProfilesAPI.getImages(p._id);
              if (Array.isArray(imgs) && imgs.length) imageUrl = (imgs[0] as any).url as any;
            } catch {
              // ignore individual failures
            }
            return {
              _id: p._id,
              userId: p.userId || p._id,
              fullName: p.fullName,
              email: p.email,
              city: p.city,
              dateOfBirth: p.dateOfBirth,
              imageUrl,
            } as SearchResult;
          })
        );
        setResults(augmented);
      } catch (e) {
        showErrorToast(null, (e as Error).message || "Search failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounce search inputs
  useEffect(() => {
    const t = setTimeout(() => void performSearch(leftSearch, "left"), 300);
    return () => clearTimeout(t);
  }, [leftSearch, performSearch]);
  useEffect(() => {
    const t = setTimeout(() => void performSearch(rightSearch, "right"), 300);
    return () => clearTimeout(t);
  }, [rightSearch, performSearch]);

  const canCreate =
    !!leftSelected &&
    !!rightSelected &&
    leftSelected._id !== rightSelected._id &&
    !creating;

  const onCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const res = await adminMatchesAPI.create(leftSelected!._id, rightSelected!._id);
      if (res?.success === false) throw new Error(res.error || "Failed to create match");
      showSuccessToast("Match created successfully");
      setCreated(true);
    } catch (e) {
      showErrorToast(null, (e as Error).message || "Failed to create match");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setLeftSelected(null);
    setRightSelected(null);
    setLeftSearch("");
    setRightSearch("");
    setCreated(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/matches">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7 text-pink-500" /> Create Manual Match
        </h1>
      </div>

      <p className="text-muted-foreground mb-6 max-w-3xl">
        Select two distinct profiles to force-create a mutual match. This will
        upsert accepted interests in both directions and add a match document if
        one doesn&apos;t already exist.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Left selector */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Profile A</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!leftSelected && (
              <div className="flex items-center gap-2 bg-white border rounded px-3 py-2 shadow-sm">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  className="flex-1 outline-none bg-transparent text-sm"
                  value={leftSearch}
                  onChange={(e) => setLeftSearch(e.target.value)}
                />
              </div>
            )}
            {leftLoading && !leftSelected && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded" />
                ))}
              </div>
            )}
            {!leftLoading && !leftSelected && leftResults.length > 0 && (
              <ul className="flex flex-col gap-2 max-h-64 overflow-auto pr-1">
                {leftResults.map((p) => {
                  const age = ageFromDob(p.dateOfBirth as any);
                  return (
                    <li key={p._id} className="list-none">
                      <button
                        type="button"
                        onClick={() => setLeftSelected(p)}
                        className="w-full text-left p-3 border rounded hover:bg-gray-50 flex items-center gap-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                        aria-label={`Select profile ${p.fullName || p.email || p._id}`}
                      >
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium truncate">
                            {p.fullName || "(No name)"}
                          </span>
                          <span className="text-xs text-gray-500 truncate">
                            {p.email || "(No email)"}
                          </span>
                          <span className="text-[11px] text-gray-400 truncate">
                            {age ? `${age} • ` : ""}
                            {p.city || ""}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {leftSelected && (
              <div className="p-4 border rounded bg-gray-50 flex flex-col gap-2 relative">
                <button
                  className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
                  onClick={() => setLeftSelected(null)}
                  title="Clear selection"
                >
                  <XCircle className="w-4 h-4" />
                </button>
                <div className="font-semibold text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" /> {leftSelected.fullName || "(No name)"}
                </div>
                <div className="text-xs text-gray-500 break-all">{leftSelected.email || "(No email)"}</div>
                <div className="text-[11px] text-gray-400">{leftSelected.city || ""}</div>
                <Link
                  href={`/admin/profile/${leftSelected._id}`}
                  className="text-xs text-primary underline mt-1 w-fit"
                >
                  View profile
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right selector */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Profile B</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!rightSelected && (
              <div className="flex items-center gap-2 bg-white border rounded px-3 py-2 shadow-sm">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  className="flex-1 outline-none bg-transparent text-sm"
                  value={rightSearch}
                  onChange={(e) => setRightSearch(e.target.value)}
                />
              </div>
            )}
            {rightLoading && !rightSelected && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded" />
                ))}
              </div>
            )}
            {!rightLoading && !rightSelected && rightResults.length > 0 && (
              <ul className="flex flex-col gap-2 max-h-64 overflow-auto pr-1">
                {rightResults.map((p) => {
                  const age = ageFromDob(p.dateOfBirth as any);
                  return (
                    <li key={p._id} className="list-none">
                      <button
                        type="button"
                        onClick={() => setRightSelected(p)}
                        className="w-full text-left p-3 border rounded hover:bg-gray-50 flex items-center gap-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                        aria-label={`Select profile ${p.fullName || p.email || p._id}`}
                      >
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium truncate">
                            {p.fullName || "(No name)"}
                          </span>
                          <span className="text-xs text-gray-500 truncate">
                            {p.email || "(No email)"}
                          </span>
                          <span className="text-[11px] text-gray-400 truncate">
                            {age ? `${age} • ` : ""}
                            {p.city || ""}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {rightSelected && (
              <div className="p-4 border rounded bg-gray-50 flex flex-col gap-2 relative">
                <button
                  className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
                  onClick={() => setRightSelected(null)}
                  title="Clear selection"
                >
                  <XCircle className="w-4 h-4" />
                </button>
                <div className="font-semibold text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" /> {rightSelected.fullName || "(No name)"}
                </div>
                <div className="text-xs text-gray-500 break-all">{rightSelected.email || "(No email)"}</div>
                <div className="text-[11px] text-gray-400">{rightSelected.city || ""}</div>
                <Link
                  href={`/admin/profile/${rightSelected._id}`}
                  className="text-xs text-primary underline mt-1 w-fit"
                >
                  View profile
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button
          className="gap-2"
          disabled={!canCreate}
          onClick={onCreate}
        >
          <Heart className="w-4 h-4" /> {creating ? "Creating..." : "Create Match"}
        </Button>
        <Button variant="outline" onClick={resetForm} disabled={creating}>
          Reset
        </Button>
        <Link href="/admin/matches">
          <Button variant="ghost">Back to Matches</Button>
        </Link>
      </div>

      {created && leftSelected && rightSelected && (
        <div className="mt-8 p-5 border rounded-lg bg-green-50 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <CheckCircle2 className="w-5 h-5" /> Manual match created between
            <span className="font-semibold">{leftSelected.fullName || leftSelected._id}</span>
            and
            <span className="font-semibold">{rightSelected.fullName || rightSelected._id}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href={`/admin/profile/${leftSelected._id}`}
              className="underline text-green-700"
            >
              View {leftSelected.fullName?.split(" ")[0] || "Profile A"}
            </Link>
            <Link
              href={`/admin/profile/${rightSelected._id}`}
              className="underline text-green-700"
            >
              View {rightSelected.fullName?.split(" ")[0] || "Profile B"}
            </Link>
            <Link href="/admin/matches" className="underline text-green-700">
              Go to Matches Overview
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
