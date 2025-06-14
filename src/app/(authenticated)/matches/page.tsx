"use client";

import { useAuthContext } from "@/components/AuthProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { useMatches } from "@/lib/hooks/useMatches";
import { useProfileImage } from "@/lib/hooks/useProfileImage";
import Link from "next/link";
import type { Profile } from "@/types/profile";

function MatchCard({
  match,
  token,
}: {
  match: Partial<Profile> & { userId: string; unread: number };
  token: string;
}) {
  const { imageUrl: avatar } = useProfileImage(match.userId, token);

  return (
    <Card
      className="flex items-center gap-4 p-4 bg-base-light/60 backdrop-blur-lg border border-border shadow-sm hover:shadow-lg transition hover:scale-[1.015]"
      key={match.userId}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={match.fullName || "Avatar"}
          className="w-16 h-16 rounded-full object-cover border-2 border-primary/40 shadow-sm shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border shrink-0">
          <UserCircle className="w-10 h-10 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-lg text-foreground truncate">
          {match.fullName || "Unknown"}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1 truncate">
          <MapPin className="w-4 h-4" /> {match.ukCity || "—"}
        </div>
      </div>
      {match.unread && match.unread > 0 && (
        <Badge variant="destructive" className="shrink-0">
          {match.unread}
        </Badge>
      )}
      <Link
        href={`/matches/${match.userId}`}
        className="ml-3 shrink-0 bg-primary text-white px-3 py-1 rounded-lg text-sm hover:bg-primary-dark transition"
      >
        Chat
      </Link>
    </Card>
  );
}

export default function MatchesPage() {
  const { token, userId } = useAuthContext();
  const [search, setSearch] = useState("");

  const { matches, loading } = useMatches(userId ?? "", token ?? "", search);

  if (!token || !userId) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="h-6 w-40 ml-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-6 text-center text-primary">
        Your Matches
      </h1>
      {/* Search */}
      <div className="flex items-center gap-2 mb-6 bg-base-light/70 backdrop-blur rounded-xl border border-border px-4 py-2 shadow-sm">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search matches..."
          className="flex-1 outline-none bg-transparent text-foreground"
        />
      </div>

      {matches.length === 0 ? (
        <p className="text-center text-muted-foreground">No matches found.</p>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <MatchCard key={m.userId} match={m} token={token} />
          ))}
        </div>
      )}
    </div>
  );
}
