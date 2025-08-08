import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchShortlists, toggleShortlist, fetchNote, setNote, ShortlistEntry } from "@/lib/engagementUtil";
import Image from "next/image";
import Link from "next/link";
import { useQuery as useRQ } from "@tanstack/react-query";
import { enrichProfiles } from "@/lib/engagementUtil";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function MyShortlistsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-shortlists"],
    queryFn: () => fetchShortlists(),
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const entries: ShortlistEntry[] = data || [];
  const userIds = entries.map((e) => e.userId);
  const { data: enriched } = useRQ({
    queryKey: ["shortlist-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [] as Array<{ userId: string; fullName?: string | null; city?: string | null; imageUrl?: string | null }>;
      try {
        return await enrichProfiles(userIds);
      } catch {
        return [] as any[];
      }
    },
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const updates: Record<string, string> = {};
      for (const e of entries) {
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
  }, [entries.length]);

  const onRemove = async (userId: string) => {
    try {
      const res = await toggleShortlist(userId);
      if (res.removed) {
        toast.success("Removed from shortlist");
        void refetch();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove");
    }
  };

  const onSaveNote = async (userId: string) => {
    try {
      const text = notes[userId] || "";
      const res = await setNote(userId, text);
      if (res.success) toast.success("Note saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save note");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">Loading…</div>
    );
  }
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-4">
          <h1 className="text-xl font-semibold mb-4">My Shortlists</h1>
          {entries.length === 0 ? (
            <div className="text-sm text-gray-600">No shortlists yet.</div>
          ) : (
            <ul className="space-y-4">
              {entries.map((e) => (
                <li key={e.userId} className="border rounded p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                        {enriched?.find((p: any) => p.userId === e.userId)?.imageUrl ? (
                          <Image src={enriched.find((p: any) => p.userId === e.userId)!.imageUrl!} alt="avatar" width={40} height={40} className="w-10 h-10 object-cover" />
                        ) : null}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          <Link href={`/profile/${e.userId}`} className="hover:underline">{e.fullName || e.userId}</Link>
                        </div>
                        <div className="text-xs text-gray-500">{new Date(e.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => onRemove(e.userId)}>Remove</Button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Textarea
                      value={notes[e.userId] || ""}
                      onChange={(ev) => setNotes((prev) => ({ ...prev, [e.userId]: ev.target.value }))}
                      rows={3}
                      placeholder="Add a private note"
                    />
                    <div className="mt-2">
                      <Button size="sm" onClick={() => onSaveNote(e.userId)}>Save Note</Button>
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


