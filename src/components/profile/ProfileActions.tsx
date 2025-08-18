"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toggleShortlist, fetchShortlists } from "@/lib/engagementUtil";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";

export function ProfileActions({ toUserId }: { toUserId: string }) {
  const [loading, setLoading] = useState(false);
  const [isShortlisted, setIsShortlisted] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await fetchShortlists();
        const exists = list.some((e) => e.userId === toUserId);
        setIsShortlisted(exists);
      } catch (e) {
        // Non-fatal; leave null so button label defaults to add
        // Optionally could log
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
        showSuccessToast("Added to shortlist");
      } else if (res.removed) {
        setIsShortlisted(false);
        showSuccessToast("Removed from shortlist");
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to update shortlist";
      if (
        msg.toLowerCase().includes("shortlist_limit") ||
        msg.toLowerCase().includes("limit")
      ) {
        showErrorToast(
          "Shortlist limit reached for your plan. Upgrade to add more."
        );
      } else {
        showErrorToast(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex">
      <Button
        size="sm"
        variant="outline"
        onClick={onToggleShortlist}
        disabled={loading}
      >
        {isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
      </Button>
    </div>
  );
}


