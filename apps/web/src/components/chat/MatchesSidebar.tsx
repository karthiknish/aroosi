"use client";

import React from "react";
import { useMatches } from "@/lib/hooks/useMatches";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { useProfileImage } from "@/lib/hooks/useProfileImage";
import { Profile } from "@aroosi/shared";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, MessageCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function MatchesSidebar() {
  const { user, profile } = useAuthContext();
  const userId = user?.uid || (profile as any)?._id || (profile as any)?.userId || "";
  const { id: activeMatchId } = useParams<{ id: string }>();
  const [search, setSearch] = React.useState("");

  const { matches, loading: isLoading } = useMatches(userId ?? "", "" as string, search);

  const filteredMatches = React.useMemo(() => {
    return matches || [];
  }, [matches]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-neutral/10">
      <div className="p-4 border-b border-neutral/10">
        <h2 className="text-xl font-bold text-primary font-serif mb-4">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" />
          <Input
            placeholder="Search matches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-neutral/5 border-0 rounded-xl h-10 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-neutral/20 mx-auto mb-3" />
            <p className="text-sm text-neutral-light">No matches found</p>
          </div>
        ) : (
          <div className="py-2">
            {filteredMatches.map((match) => (
              <MatchItem
                key={match.userId}
                match={match}
                isActive={match.userId === activeMatchId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchItemComponent({ match, isActive }: { match: Profile & { unread: number }; isActive: boolean }) {
  const { imageUrl: avatar } = useProfileImage(match.userId, "");

  return (
    <Link
      href={`/matches/${match.userId}`}
      prefetch={true}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral/5 relative",
        isActive && "bg-primary/5 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-primary"
      )}
    >
      <div className="relative flex-shrink-0">
        {avatar ? (
          <Image
            src={avatar}
            alt={match.fullName || ""}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover border border-neutral/10"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-neutral/10 flex items-center justify-center text-neutral-light">
            <UserCircle className="w-6 h-6" />
          </div>
        )}
        {match.unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {match.unread > 9 ? "9+" : match.unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className={cn(
            "text-sm font-semibold truncate",
            isActive ? "text-primary" : "text-neutral-dark"
          )}>
            {match.fullName || "Unknown"}
          </h3>
          {match.updatedAt && (
            <span className="text-[10px] text-neutral-light">
              {new Date(match.updatedAt).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-light truncate">
          {match.unread > 0 ? "New message" : "Start a conversation..."}
        </p>
      </div>
    </Link>
  );
}

const MatchItem = React.memo(MatchItemComponent);
