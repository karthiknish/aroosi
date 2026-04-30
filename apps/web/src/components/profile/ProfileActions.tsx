"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toggleShortlist, fetchShortlists } from "@/lib/engagementUtil";
import { showInfoToast } from "@/lib/ui/toast";
import { handleApiOutcome, handleError } from "@/lib/utils/errorHandling";

export function ProfileActions({ toUserId }: { toUserId: string }) {
  const [loading, setLoading] = useState(false);
  const [isShortlisted, setIsShortlisted] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchShortlists();
        const exists = list.some((e) => e.userId === toUserId);
        setIsShortlisted(exists);
      } catch {
        // Non-fatal; leave null so button label defaults to add
        // Optionally could log
      }
    })();
  }, [toUserId]);

  const onToggleShortlist = async () => {
    setLoading(true);
    try {
      const res = await toggleShortlist(toUserId);
      if (res.added) {
        setIsShortlisted(true);
        handleApiOutcome({ success: true, message: "Added to shortlist" });
      } else if (res.removed) {
        setIsShortlisted(false);
        handleApiOutcome({ success: true, message: "Removed from shortlist" });
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to update shortlist";
      if (
        msg.toLowerCase().includes("shortlist_limit") ||
        msg.toLowerCase().includes("limit")
      ) {
        handleApiOutcome({
          warning: "Shortlist limit reached for your plan. Upgrade to add more.",
        });
        showInfoToast("Upgrade your plan to add more shortlist profiles.");
      } else {
        handleError(error, {
          scope: "ProfileActions",
          action: "toggle_shortlist",
          toUserId,
        }, {
          customUserMessage: msg,
        });
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


