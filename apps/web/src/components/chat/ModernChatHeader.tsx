"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Shield, Search, Sparkles, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

import { planDisplayName } from "@/lib/utils/plan";
import { isPremium } from "@/lib/utils/subscriptionPlan";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import ProfileView from "@/components/profile/ProfileView";

type ModernChatHeaderProps = {
  matchUserName?: string;
  matchUserAvatarUrl?: string;
  matchProfile?: any;
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
  matchProfile,
  subscriptionPlan,
  connectionStatus,
  lastSeenAt,
  onReport,
  onToggleSearch,
  className = "",
}: ModernChatHeaderProps) {
  const isOnline = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting";

  const lastSeenLabel = (() => {
    if (isOnline) return "Online now";
    if (isConnecting) return "Connecting...";
    if (!lastSeenAt || lastSeenAt === 0) return "Offline";

    const d = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Active just now";
    if (diffMinutes < 60) return `Active ${diffMinutes}m ago`;
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    if (diffDays < 7) return `Active ${diffDays}d ago`;

    return `Active ${d.toLocaleDateString([], { month: "short", day: "numeric" })}`;
  })();

  // Status indicator styling
  const statusDotClass = cn(
    "h-3 w-3 rounded-full transition-all duration-300",
    isOnline && "bg-success shadow-lg shadow-success/40",
    isConnecting && "bg-warning shadow-lg shadow-warning/40 animate-pulse",
    !isOnline && !isConnecting && "bg-neutral/30"
  );

  return (
    <div className={cn("px-4 py-3.5 sm:px-5", className)}>
      <div className="flex items-center justify-between relative z-10 gap-3">
        {/* Left section - Back button + User info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Back button - elegant square */}
          <Link href="/matches" className="flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              className="h-10 w-10 rounded-xl bg-neutral/5 hover:bg-neutral/10 border border-neutral/20 flex items-center justify-center transition-colors duration-200 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-neutral" />
            </motion.div>
          </Link>

          <Drawer>
            <DrawerTrigger asChild>
              <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity">
                {/* Avatar with refined status indicator */}
                <div className="relative flex-shrink-0">
                  <Avatar className="h-11 w-11 ring-2 ring-white shadow-lg">
                    {matchUserAvatarUrl ? (
                      <AvatarImage
                        src={matchUserAvatarUrl}
                        alt={matchUserName || "User"}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/10 to-warning/5 text-primary">
                      {matchUserName ? matchUserName[0]?.toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Animated status dot */}
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-0.5 -right-0.5 ring-[2.5px] ring-white rounded-full"
                  >
                    <div className={statusDotClass}>
                      {isOnline && (
                        <motion.div
                          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full bg-success"
                        />
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Name and status text */}
                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[15px] leading-tight truncate text-neutral tracking-tight">
                      {matchUserName || "User"}
                    </span>
                    
                    {/* Premium badge - elegant inline design */}
                    {isPremium(subscriptionPlan) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-warning/5 to-warning/10 border border-warning/20"
                      >
                        <Sparkles className="w-3 h-3 text-warning" />
                        <span className="text-[10px] font-semibold text-warning uppercase tracking-wider">
                          {planDisplayName(subscriptionPlan)}
                        </span>
                      </motion.div>
                    )}
                  </div>
                  
                  <span className={cn(
                    "text-xs font-medium tracking-wide transition-colors",
                    isOnline ? "text-success" : "text-neutral-light"
                  )}>
                    {lastSeenLabel}
                  </span>
                </div>
              </div>
            </DrawerTrigger>
            <DrawerContent className="h-[85vh]">
              <DrawerHeader className="border-b border-neutral/10 pb-4">
                <DrawerTitle className="text-center font-serif text-2xl">
                  {matchUserName}&apos;s Profile
                </DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto flex-1">
                {matchProfile ? (
                  <ProfileView 
                    profileData={matchProfile} 
                    className="py-4"
                  />
                ) : (
                  <div className="p-8 text-center text-neutral-light">
                    Loading profile details...
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Right section - Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onToggleSearch && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 rounded-xl bg-neutral/5 hover:bg-neutral/10 border border-neutral/20 text-neutral-light hover:text-neutral transition-all duration-200"
                onClick={onToggleSearch}
                title="Search messages"
                aria-label="Search messages"
              >
                <Search className="w-4.5 h-4.5" />
              </Button>
            </motion.div>
          )}
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 rounded-xl bg-neutral/5 hover:bg-primary/10 border border-neutral/20 text-neutral-light hover:text-primary hover:border-primary/20 transition-all duration-200"
              onClick={onReport}
              title="Report or block user"
              aria-label="Report user"
            >
              <Shield className="w-4.5 h-4.5" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}