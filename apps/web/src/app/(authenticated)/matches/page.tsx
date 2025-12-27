"use client";

import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  UserCircle,
  MapPin,
  Search,
  MessageCircle,
  Heart,
  Users,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useMatches } from "@/lib/hooks/useMatches";
import { useProfileImage } from "@/lib/hooks/useProfileImage";
import Link from "next/link";
import Image from "next/image";
import type { Profile } from "@aroosi/shared/types";
import { ErrorState } from "@/components/ui/error-state";
import { Empty, EmptyIcon, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { useOffline } from "@/hooks/useOffline";
import { SubscriptionGuard } from "@/components/ui/subscription-guard";
import { motion } from "framer-motion";
import React from "react";
import { Ban } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

type SortOption = "recent" | "newest" | "unread" | "name";

function MatchCard({
  match,
  index,
}: {
  match: Partial<Profile> & { userId: string; unread: number };
  index: number;
}) {
  // Cookie-auth: server reads cookies; hook signature may still accept token, pass empty shim if required.
  const { imageUrl: avatar } = useProfileImage(match.userId, "" as string);

  const initials = match.fullName
    ? match.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const genderColor = match.gender === "female" 
    ? "from-rose-100 to-rose-200 text-rose-500" 
    : match.gender === "male"
    ? "from-blue-100 to-blue-200 text-blue-500"
    : "from-secondary-light to-accent-light text-secondary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <HoverCard>
        <HoverCardTrigger asChild>
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-base-light rounded-2xl overflow-hidden cursor-pointer">
            <CardContent className="p-0">
              <div className="flex items-center p-4 sm:p-6 gap-4 sm:gap-6">
                {/* Profile Image */}
                <div className="relative flex-shrink-0">
                  {avatar ? (
                    <div className="relative">
                      <Image
                        src={avatar}
                        alt={match.fullName || "Avatar"}
                        width={80}
                        height={80}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-md group-hover:scale-105 transition-transform duration-300 ring-2 ring-base-light"
                      />
                      {(match.unread ?? 0) > 0 ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1"
                        >
                          <span className="flex items-center justify-center h-6 min-w-6 rounded-full bg-primary text-base-light text-[10px] leading-none font-bold shadow-lg px-1 border-2 border-base-light">
                            {match.unread > 9 ? "9+" : match.unread}
                          </span>
                        </motion.div>
                      ) : null}
                    </div>
                  ) : (
                    <div className={cn(
                      "w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br flex flex-col items-center justify-center shadow-md ring-2 ring-base-light relative",
                      genderColor
                    )}>
                      <span className="text-lg sm:text-xl font-bold tracking-tighter">{initials}</span>
                      <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 opacity-40 -mt-1" />
                      <span className="absolute -bottom-1 bg-neutral-dark/10 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest opacity-60">
                        No Photo
                      </span>
                    </div>
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg sm:text-xl text-neutral-dark truncate group-hover:text-primary transition-colors font-serif">
                      {match.fullName || "Unknown"}
                    </h3>

                    <div className="flex items-center gap-4 text-sm text-neutral-light">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                        <span className="truncate max-w-[100px] sm:max-w-xs">
                          {match.city || "Location hidden"}
                        </span>
                      </div>
                      
                      {match.occupation && (
                        <div className="hidden sm:flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{match.occupation}</span>
                        </div>
                      )}
                      
                      <span className="text-xs text-primary/60 bg-primary/10 px-2 py-0.5 rounded-full hidden sm:inline-block flex-shrink-0">
                        Matched
                      </span>
                    </div>
                    
                    <p className="text-sm text-neutral-light truncate mt-1">
                      {(match.unread ?? 0) > 0 
                        ? <span className="text-primary font-medium">You have new messages</span>
                        : "Start a conversation..."}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0">
                  <Link href={`/matches/${match.userId}`}>
                    <Button
                      className="bg-primary/10 hover:bg-primary text-primary hover:text-base-light border-0 shadow-none hover:shadow-lg transition-all duration-300 rounded-full w-10 h-10 sm:w-auto sm:h-10 sm:px-6 p-0 flex items-center justify-center"
                    >
                      <MessageCircle className="w-5 h-5 sm:mr-2" />
                      <span className="hidden sm:inline">Chat</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="relative h-32 bg-gradient-to-br from-primary/20 to-secondary/20">
            {avatar && (
              <Image
                src={avatar}
                alt={match.fullName || "Avatar"}
                fill
                className="object-cover opacity-40 blur-sm"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={match.fullName || "Avatar"}
                    width={64}
                    height={64}
                    className="rounded-full border-4 border-base-light shadow-lg object-cover"
                  />
                ) : (
                  <div className={cn("w-16 h-16 rounded-full flex items-center justify-center border-4 border-base-light shadow-lg", genderColor)}>
                    <span className="text-xl font-bold">{initials}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-center">
              <h4 className="text-lg font-bold text-neutral-dark">{match.fullName}</h4>
              <p className="text-sm text-neutral-light">{match.city}, {match.country}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-neutral/5 p-2 rounded-xl">
                <span className="text-neutral-light block mb-0.5">Occupation</span>
                <span className="text-neutral-dark font-medium truncate block">{match.occupation || "Not specified"}</span>
              </div>
              <div className="bg-neutral/5 p-2 rounded-xl">
                <span className="text-neutral-light block mb-0.5">Education</span>
                <span className="text-neutral-dark font-medium truncate block">{match.education || "Not specified"}</span>
              </div>
            </div>
            {match.aboutMe && (
              <p className="text-xs text-neutral-light line-clamp-2 italic">
                "{match.aboutMe}"
              </p>
            )}
            <Link href={`/matches/${match.userId}`} className="block">
              <Button className="w-full rounded-xl bg-primary hover:bg-primary-dark text-white text-xs h-9">
                View Full Profile
              </Button>
            </Link>
          </div>
        </HoverCardContent>
      </HoverCard>
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
  const networkStatus = useOffline();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Cookie-auth: server authenticates via cookies; pass empty token shim if hook signature still expects it
  const { matches, loading } = useMatches(userId ?? "", "" as string, search);

  const sortedAndFilteredMatches = useMemo(() => {
    let result = [...matches];

    if (showUnreadOnly) {
      result = result.filter((m) => m.unread > 0);
    }

    return result.sort((a, b) => {
      switch (sortBy) {
        case "unread":
          return (b.unread || 0) - (a.unread || 0);
        case "newest":
          return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
        case "name":
          return (a.fullName || "").localeCompare(b.fullName || "");
        case "recent":
        default:
          return (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0);
      }
    });
  }, [matches, sortBy, showUnreadOnly]);

  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredMatches.slice(start, start + itemsPerPage);
  }, [sortedAndFilteredMatches, currentPage]);

  const totalPages = Math.ceil(sortedAndFilteredMatches.length / itemsPerPage);

  // If the hook toasts errors but returns empty, provide a subtle inline notice once
  React.useEffect(() => {
    if (
      !loading &&
      Array.isArray(matches) &&
      matches.length === 0 &&
      networkStatus.isOnline
    ) {
      setFetchError(
        "No matches to display. If this seems wrong, please try again in a moment."
      );
    } else {
      setFetchError(null);
    }
  }, [loading, matches, networkStatus.isOnline]);

  if (!userId)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState message="You must be signed in to view matches." />
      </div>
    );

  if (!networkStatus.isOnline) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState message="You appear to be offline. Please check your connection." />
      </div>
    );
  }

  return (
    <>
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Aroosi Matches",
            url: "https://aroosi.app/matches",
            description:
              "View and connect with your matches on Aroosi Afghan matrimony platform",
            isPartOf: {
              "@type": "WebSite",
              name: "Aroosi",
              url: "https://aroosi.app",
            },
          }),
        }}
      />
      <SubscriptionGuard feature="canChatWithMatches">
        <div className="w-full overflow-x-hidden overflow-y-hidden bg-base-light pt-24 pb-12 relative">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-20 z-0 pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent rounded-full blur-3xl opacity-10 z-0 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-primary rounded-2xl text-base-light shadow-lg">
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
            className="bg-base-light/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-primary/10 shadow-sm"
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

          {/* Search and Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 space-y-4"
          >
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setIsCommandOpen(true)}
                  placeholder="Search by name or location..."
                  className="pl-12 pr-4 py-6 rounded-2xl border-0 bg-base-light shadow-lg focus:shadow-xl transition-shadow focus:ring-2 focus:ring-primary w-full"
                />
                
                <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
                  <CommandInput 
                    placeholder="Type a name or location to search..." 
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No matches found.</CommandEmpty>
                    <CommandGroup heading="Recent Matches">
                      {matches.slice(0, 5).map((match) => (
                        <CommandItem
                          key={match.userId}
                          onSelect={() => {
                            setSearch(match.fullName || "");
                            setIsCommandOpen(false);
                          }}
                        >
                          <UserCircle className="mr-2 h-4 w-4" />
                          <span>{match.fullName}</span>
                          <span className="ml-auto text-xs text-neutral-light">{match.city}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Quick Filters">
                      <CommandItem onSelect={() => { setShowUnreadOnly(true); setIsCommandOpen(false); }}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        <span>Unread Messages</span>
                      </CommandItem>
                      <CommandItem onSelect={() => { setSortBy("newest"); setIsCommandOpen(false); }}>
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        <span>Newest First</span>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </CommandDialog>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[180px] h-[52px] rounded-2xl border-0 bg-base-light shadow-lg focus:ring-2 focus:ring-primary">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4 text-secondary" />
                      <SelectValue placeholder="Sort by" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-neutral/10 shadow-xl">
                    <SelectItem value="recent">Recently Active</SelectItem>
                    <SelectItem value="newest">Newest Matches</SelectItem>
                    <SelectItem value="unread">Unread First</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className={cn(
                    "h-[52px] px-4 rounded-2xl border-0 shadow-lg transition-all duration-300",
                    showUnreadOnly 
                      ? "bg-primary text-white hover:bg-primary-dark" 
                      : "bg-base-light text-neutral-light hover:bg-neutral/5"
                  )}
                >
                  <Filter className={cn("w-4 h-4 mr-2", showUnreadOnly ? "text-white" : "text-secondary")} />
                  <span className="hidden sm:inline">Unread</span>
                  {matches.filter(m => m.unread > 0).length > 0 && !showUnreadOnly && (
                    <Badge className="ml-2 bg-primary text-white border-0 h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
                      {matches.filter(m => m.unread > 0).length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Matches List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {fetchError && (
              <div className="mb-4 text-sm text-danger bg-danger/5 border border-danger/20 rounded-md px-3 py-2">
                {fetchError}
              </div>
            )}
            {loading ? (
              <MatchesLoadingSkeleton />
            ) : sortedAndFilteredMatches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Empty>
                  <EmptyIcon icon={Ban} />
                  <EmptyTitle>
                    {search || showUnreadOnly
                      ? "No matches found for your filters"
                      : "No matches yet"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {search || showUnreadOnly
                      ? "Try adjusting your search or filters to find what you're looking for."
                      : "Keep exploring profiles to find your perfect match!"}
                  </EmptyDescription>
                </Empty>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {paginatedMatches.map((match, index) => (
                  <MatchCard key={match.userId} match={match} index={index} />
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={cn("cursor-pointer", currentPage === 1 && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <PaginationItem key={i}>
                            <PaginationLink 
                              onClick={() => setCurrentPage(i + 1)}
                              isActive={currentPage === i + 1}
                              className="cursor-pointer"
                            >
                              {i + 1}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={cn("cursor-pointer", currentPage === totalPages && "pointer-events-none opacity-50")}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                {/* Load More Hint */}
                {sortedAndFilteredMatches.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center py-8"
                  >
                    <p className="text-neutral-light text-sm">
                      Showing {paginatedMatches.length} of {sortedAndFilteredMatches.length} matches
                    </p>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </SubscriptionGuard>
    </>
  );
}
