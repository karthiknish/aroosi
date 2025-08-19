"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Shield, Dot, Circle } from "lucide-react";
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
  className?: string;
};

export default function ModernChatHeader({
  matchUserName = "",
  matchUserAvatarUrl = "",
  subscriptionPlan,
  connectionStatus,
  lastSeenAt,
  onReport,
  className = "",
}: ModernChatHeaderProps) {
  const lastSeenLabel = (() => {
    if (connectionStatus === "connected") return "Online";
    if (!lastSeenAt) return "Offline";
    const d = new Date(lastSeenAt);
    return `Last seen ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  })();
  return (
    // Use a warmer gradient (secondary -> accent) to improve contrast and match updated UI
    <div
      className={`bg-primary text-white px-4 py-3 rounded-t-2xl ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
              {matchUserAvatarUrl ? (
                <AvatarImage
                  src={matchUserAvatarUrl}
                  alt={matchUserName || "User"}
                />
              ) : (
                <AvatarFallback>
                  {matchUserName ? matchUserName[0] : "U"}
                </AvatarFallback>
              )}
            </Avatar>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                connectionStatus === "connected"
                  ? "bg-green-400"
                  : connectionStatus === "connecting"
                    ? "bg-yellow-400"
                    : "bg-gray-400"
              }`}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-base leading-tight truncate max-w-full">
              {matchUserName || "User"}
            </span>
            <span className="text-xs text-white/80 capitalize truncate">
              {lastSeenLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPremium(subscriptionPlan) && (
            <div className="text-xs bg-white/15 backdrop-blur px-2 py-0.5 rounded-full flex items-center gap-1 max-w-[10rem] truncate">
              <Crown className="w-3 h-3" />
              <span className="truncate">
                {planDisplayName(subscriptionPlan)}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={onReport}
            title="Report user"
          >
            <Shield className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}