"use client";

import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserCircle,
  MapPin,
  Search,
  MessageCircle,
  Heart,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useMatches } from "@/lib/hooks/useMatches";
import { useProfileImage } from "@/lib/hooks/useProfileImage";
import Link from "next/link";
import Image from "next/image";
import type { Profile } from "@/types/profile";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useOffline } from "@/hooks/useOffline";
import { SubscriptionGuard } from "@/components/ui/subscription-guard";
import { motion } from "framer-motion";
import React from "react";

function MatchCard({
  match,
  index,
}: {
  match: Partial<Profile> & { userId: string; unread: number };
  index: number;
}) {
  // Cookie-auth: server reads cookies; hook signature may still accept token, pass empty shim if required.
  const { imageUrl: avatar } = useProfileImage(match.userId, "" as string);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-base hover-lift overflow-hidden">
        <CardContent className="p-0">
          <div className="flex">
            {/* Profile Image */}
            <div className="relative p-4">
              {avatar ? (
                <div className="relative">
                  <Image
                    src={avatar}
                    alt={match.fullName || "Avatar"}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
                  />
                  {(match.unread ?? 0) > 0 ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1"
                    >
                      <span className="flex items-center justify-center h-6 min-w-6 rounded-full bg-primary text-white text-[10px] leading-none font-bold shadow-lg px-1">
                        {match.unread > 9 ? "9+" : match.unread}
                      </span>
                    </motion.div>
                  ) : null}
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary-light to-accent-light flex items-center justify-center shadow-lg">
                  <UserCircle className="w-12 h-12 text-secondary" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 p-4 min-w-0">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-neutral truncate group-hover:text-primary transition-colors">
                    {match.fullName || "Unknown"}
                  </h3>
                </div>

                <div className="flex items-center gap-1 text-sm text-neutral-light">
                  <MapPin className="w-4 h-4 text-secondary" />
                  <span className="truncate">
                    {match.city || "Location not specified"}
                  </span>
                </div>

                {match.occupation && (
                  <div className="flex items-center gap-1 text-sm text-neutral-light">
                    <Users className="w-4 h-4 text-secondary" />
                    <span className="truncate">{match.occupation}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="p-4 flex items-center">
              <Link href={`/matches/${match.userId}`}>
                <Button
                  className="bg-primary hover:bg-primary-dark text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                  size="sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Chat
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MatchesLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex">
              <div className="p-4">
                <Skeleton className="w-20 h-20 rounded-2xl" />
              </div>
              <div className="flex-1 p-4 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="p-4">
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function MatchesPage() {
  const { user, profile } = useAuthContext();
  const userId =
    user?.uid || (profile as any)?._id || (profile as any)?.userId || "";
  const offline = useOffline();
  const [search, setSearch] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Cookie-auth: server authenticates via cookies; pass empty token shim if hook signature still expects it
  const { matches, loading } = useMatches(userId ?? "", "" as string, search);
  // If the hook toasts errors but returns empty, provide a subtle inline notice once
  React.useEffect(() => {
    if (
      !loading &&
      Array.isArray(matches) &&
      matches.length === 0 &&
      !offline
    ) {
      setFetchError(
        "No matches to display. If this seems wrong, please try again in a moment."
      );
    } else {
      setFetchError(null);
    }
  }, [loading, matches, offline]);

  if (!userId)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState message="You must be signed in to view matches." />
      </div>
    );

  if (offline) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState />
      </div>
    );
  }

  return (
    <SubscriptionGuard feature="canChatWithMatches">
      <div className="w-full overflow-x-hidden overflow-y-hidden bg-base-light pt-24 pb-12 relative">
        {/* Decorative pink circles */}
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-primary rounded-2xl text-white shadow-lg">
                <Heart className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold text-primary font-serif">
                Your Matches
              </h1>
            </div>
            <p className="text-neutral-light text-lg">
              Connect with people who are interested in you
            </p>
          </motion.div>
          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-2xl p-6 mb-8 border border-primary-light/20 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {matches.length}
                  </div>
                  <div className="text-sm text-neutral-light">
                    Total Matches
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">
                    {matches.filter((m) => m.unread > 0).length}
                  </div>
                  <div className="text-sm text-neutral-light">Unread Chats</div>
                </div>
              </div>
              {/* Premium feature badge removed as per UI update */}
            </div>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or location..."
                className="pl-12 pr-4 py-3 rounded-2xl border-0 bg-base-light shadow-lg focus:shadow-xl transition-shadow text-center focus:ring-2 focus:ring-primary"
              />
            </div>
          </motion.div>
          {/* Matches List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {fetchError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {fetchError}
              </div>
            )}
            {loading ? (
              <MatchesLoadingSkeleton />
            ) : matches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <EmptyState
                  message={
                    search
                      ? "No matches found for your search."
                      : "No matches yet."
                  }
                  description={
                    search
                      ? "Try adjusting your search terms."
                      : "Keep swiping to find your perfect match!"
                  }
                />
              </motion.div>
            ) : (
              <div className="space-y-6">
                {matches.map((match, index) => (
                  <MatchCard key={match.userId} match={match} index={index} />
                ))}

                {/* Load More Hint */}
                {matches.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center py-8"
                  >
                    <p className="text-neutral-light text-sm">
                      {matches.length === 1
                        ? "1 match"
                        : `${matches.length} matches`}{" "}
                      found
                    </p>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </SubscriptionGuard>
  );
}
