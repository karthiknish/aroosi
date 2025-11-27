"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Shield, Dot, Circle, Search } from "lucide-react";
import { ConnectionStatus } from "@/components/ui/MessageFeedback";

import { planDisplayName } from "@/lib/utils/plan";
import { isPremium } from "@/lib/utils/subscriptionPlan";

type ModernChatHeaderProps = {
  matchUserName?: string;
  matchUserAvatarUrl?: string;
  subscriptionPlan?: "free" | "premium" | "premiumPlus" | string;
  connectionStatus: "connected" | "connecting" | "disconnected";
  lastSeenAt?: number;
  onReport: () => void;
  onToggleSearch?: () => void;
  className?: string;
};

export default function ModernChatHeader({
  matchUserName = "",
  matchUserAvatarUrl = "",
  subscriptionPlan,
  connectionStatus,
  lastSeenAt,
  onReport,
  onToggleSearch,
  className = "",
}: ModernChatHeaderProps) {
  const lastSeenLabel = (() => {
    // Use presence-based logic for more accurate online status
    if (connectionStatus === "connected") return "Online";
    if (!lastSeenAt || lastSeenAt === 0) return "Offline";

    // If we have a lastSeen timestamp, show when they were last online
    const d = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Last seen just now";
    if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    if (diffDays < 7) return `Last seen ${diffDays}d ago`;

    return `Last seen ${d.toLocaleDateString([], { month: "short", day: "numeric" })}`;
  })();
  return (
    <div
      className={`bg-white px-4 py-3 border-b border-slate-100 ${className}`}
    >
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <Avatar className="h-10 w-10 border border-slate-100">
              {matchUserAvatarUrl ? (
                <AvatarImage
                  src={matchUserAvatarUrl}
                  alt={matchUserName || "User"}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="text-sm font-medium bg-slate-100 text-slate-600">
                {matchUserName ? matchUserName[0]?.toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            {/* Enhanced status indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white rounded-full">
              {connectionStatus === "connected" ? (
                <div className="h-3 w-3 rounded-full bg-green-500" />
              ) : connectionStatus === "connecting" ? (
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
              ) : (
                <div className="h-3 w-3 rounded-full bg-slate-300" />
              )}
            </div>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold text-[15px] leading-tight truncate text-slate-900">
              {matchUserName || "User"}
            </span>
            <span className="text-xs text-slate-500 truncate">
              {lastSeenLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {isPremium(subscriptionPlan) && (
            <div className="hidden sm:flex text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full items-center gap-1 mr-2">
              <Crown className="w-3 h-3 text-amber-500" />
              <span className="font-medium truncate max-w-[6rem]">
                {planDisplayName(subscriptionPlan)}
              </span>
            </div>
          )}
          {onToggleSearch && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full h-9 w-9 p-0"
              onClick={onToggleSearch}
              title="Search messages"
              aria-label="Search messages"
            >
              <Search className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full h-9 w-9 p-0"
            onClick={onReport}
            title="Report or block user"
            aria-label="Report user"
          >
            <Shield className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}