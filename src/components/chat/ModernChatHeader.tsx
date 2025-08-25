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
    if (connectionStatus === "connected") return "Online";
    if (!lastSeenAt) return "Offline";
    const d = new Date(lastSeenAt);
    return `Last seen ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  })();
  return (
    <div
      className={`bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-white px-3 sm:px-5 py-3 sm:py-4 rounded-t-2xl shadow-sm relative overflow-hidden ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
      }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <Avatar className="h-9 w-9 sm:h-11 sm:w-11 border-2 border-white/80 shadow-lg ring-2 ring-white/20 transition-all duration-200 hover:scale-105">
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
              <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-white/20 to-white/10">
                {matchUserName ? matchUserName[0]?.toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            {/* Enhanced status indicator with animation */}
            <div className="absolute -bottom-0.5 -right-0.5">
              {connectionStatus === "connected" ? (
                <div className="relative">
                  <div className="h-4 w-4 rounded-full bg-green-400 border-2 border-white shadow-sm animate-pulse" />
                  <div className="absolute inset-0 h-4 w-4 rounded-full bg-green-400 animate-ping opacity-75" />
                </div>
              ) : connectionStatus === "connecting" ? (
                <div className="h-4 w-4 rounded-full bg-yellow-400 border-2 border-white shadow-sm">
                  <div className="h-full w-full rounded-full bg-yellow-400 animate-spin opacity-50" />
                </div>
              ) : (
                <div className="h-4 w-4 rounded-full bg-gray-400 border-2 border-white shadow-sm" />
              )}
            </div>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-bold text-base sm:text-lg leading-tight truncate max-w-full text-white drop-shadow-sm">
              {matchUserName || "User"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-white/90 truncate">
                {lastSeenLabel}
              </span>
              {connectionStatus === "connected" && (
                <span className="text-xs bg-green-500/20 text-green-100 px-2 py-0.5 rounded-full border border-green-400/30">
                  Online
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isPremium(subscriptionPlan) && (
            <div className="text-xs bg-gradient-to-r from-amber-400/20 to-yellow-400/20 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-white/95 font-medium truncate max-w-[8rem]">
                {planDisplayName(subscriptionPlan)}
              </span>
            </div>
          )}
          {onToggleSearch && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:bg-white/20 hover:text-white transition-all duration-200 rounded-full h-9 w-9 p-0 shadow-sm"
              onClick={onToggleSearch}
              title="Search messages"
              aria-label="Search messages"
            >
              <Search className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-white/90 hover:bg-white/20 hover:text-white transition-all duration-200 rounded-full h-9 w-9 p-0 shadow-sm"
            onClick={onReport}
            title="Report or block user"
            aria-label="Report user"
          >
            <Shield className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}