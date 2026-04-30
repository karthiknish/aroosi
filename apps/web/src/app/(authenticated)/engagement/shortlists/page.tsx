"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchShortlists,
  toggleShortlist,
  fetchNote,
  setNote,
  type ShortlistEntry,
} from "@/lib/engagementUtil";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { handleApiOutcome, handleError } from "@/lib/utils/errorHandling";
import { ErrorState } from "@/components/ui/error-state";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  Empty,
  EmptyDescription,
  EmptyIcon,
  EmptyTitle,
} from "@/components/ui/empty";
import { Bookmark } from "lucide-react";

export default function MyShortlistsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-shortlists"],
    queryFn: () => fetchShortlists(),
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const entries: ShortlistEntry[] = data || [];

  useEffect(() => {
    let mounted = true;
    (async () => {
      const shortlistEntries = data || [];
      const updates: Record<string, string> = {};
      for (const e of shortlistEntries) {
        try {
          const n = await fetchNote(e.userId);
          if (n?.note) updates[e.userId] = n.note;
        } catch {}
      }
      if (mounted) setNotes((prev) => ({ ...prev, ...updates }));
    })();
    return () => {
      mounted = false;
    };
  }, [data]);

  const onRemove = async (userId: string) => {
    try {
      const res = await toggleShortlist(userId);
      if (res.removed) {
        handleApiOutcome({ success: true, message: "Removed from shortlist" });
        void refetch();
      }
    } catch (error) {
      handleError(
        error,
        { scope: "MyShortlistsPage", action: "remove_from_shortlist" },
        {
          customUserMessage:
            error instanceof Error ? error.message : "Failed to remove",
        }
      );
    }
  };

  const onSaveNote = async (userId: string) => {
    try {
      const text = notes[userId] || "";
      const ok = await setNote(userId, text);
      if (ok) {
        handleApiOutcome({ success: true, message: "Note saved" });
        return;
      }

      handleApiOutcome({ success: false, error: "Failed to save note" });
    } catch (error) {
      handleError(
        error,
        { scope: "MyShortlistsPage", action: "save_shortlist_note" },
        {
          customUserMessage:
            error instanceof Error ? error.message : "Failed to save note",
        }
      );
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading your shortlists..." fullScreen={false} />;
  }
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <ErrorState
          message="Failed to load your shortlists. Please try again."
          onRetry={() => void refetch()}
          className="w-full max-w-md rounded-2xl border border-dashed border-neutral/20 bg-base p-6"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-light pt-24 pb-12 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-4">
          <h1 className="text-xl font-semibold mb-4">My Shortlists</h1>
          {entries.length === 0 ? (
            <Empty className="min-h-[280px] border-neutral/15 bg-base-light/70">
              <EmptyIcon icon={Bookmark} />
              <EmptyTitle>No shortlists yet</EmptyTitle>
              <EmptyDescription>
                Save profiles here so you can compare them later and keep private notes.
              </EmptyDescription>
              <Button asChild>
                <Link href="/search">Find Profiles</Link>
              </Button>
            </Empty>
          ) : (
            <ul className="space-y-4">
              {entries.map((e) => (
                <li key={e.userId} className="border rounded p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral/10">
                        {Array.isArray(e.profileImageUrls) &&
                        e.profileImageUrls[0] ? (
                          <Image
                            src={e.profileImageUrls[0]}
                            alt="avatar"
                            width={40}
                            height={40}
                            className="w-10 h-10 object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          <Link
                            href={`/profile/${e.userId}`}
                            className="hover:underline"
                          >
                            {e.fullName || e.userId}
                          </Link>
                        </div>
                        <div className="text-xs text-neutral-light">
                          {new Date(e.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRemove(e.userId)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Textarea
                      value={notes[e.userId] || ""}
                      onChange={(ev) =>
                        setNotes((prev) => ({
                          ...prev,
                          [e.userId]: ev.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Add a private note"
                    />
                    <div className="mt-2">
                      <Button size="sm" onClick={() => onSaveNote(e.userId)}>
                        Save Note
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


