"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toggleShortlist, fetchNote, setNote } from "@/lib/engagementUtil";
import { toast } from "sonner";

export function ProfileActions({ toUserId }: { toUserId: string }) {
  const [note, setNoteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isShortlisted, setIsShortlisted] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const existing = await fetchNote(toUserId);
        if (!mounted) return;
        setNoteText(existing?.note ?? "");
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toUserId]);

  const onToggleShortlist = async () => {
    setLoading(true);
    try {
      const res = await toggleShortlist(toUserId);
      if (res.added) {
        setIsShortlisted(true);
        toast.success("Added to shortlist");
      } else if (res.removed) {
        setIsShortlisted(false);
        toast.success("Removed from shortlist");
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to update shortlist";
      if (msg.toLowerCase().includes("shortlist_limit") || msg.toLowerCase().includes("limit")) {
        toast.error("Shortlist limit reached for your plan. Upgrade to add more.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const onSaveNote = async () => {
    setLoading(true);
    try {
      const res = await setNote(toUserId, note);
      if (res?.success) toast.success("Note saved");
    } catch (e: any) {
      const msg = e?.message || "Failed to save note";
      if (msg.toLowerCase().includes("notes_limit") || msg.toLowerCase().includes("limit")) {
        toast.error("Notes limit reached for your plan. Upgrade to add more.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleShortlist}
          disabled={loading}
        >
          {isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="privateNote" className="text-sm text-gray-600">
          Private note
        </label>
        <Textarea
          id="privateNote"
          value={note}
          onChange={(e) => setNoteText(e.target.value)}
          rows={3}
          placeholder="Add a private note about this profile"
        />
        <div>
          <Button size="sm" onClick={onSaveNote} disabled={loading}>
            Save Note
          </Button>
        </div>
      </div>
    </div>
  );
}


