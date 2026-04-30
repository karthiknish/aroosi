import { useQuery } from "@tanstack/react-query";
import { useUnreadCounts } from "./useUnreadCounts";
import { matchesAPI, type MatchListItem } from "@/lib/api/matches";
import { handleError } from "@/lib/utils/errorHandling";

export interface MatchListView {
  id: string;
  userId: string;
  conversationId: string;
  status: string;
  fullName: string | null;
  city: string | null;
  country: string | null;
  occupation: string | null;
  education: string | null;
  aboutMe: string | null;
  gender: string | null;
  profileImageUrls: string[];
  createdAt: MatchListItem["createdAt"];
  updatedAt: MatchListItem["updatedAt"];
  lastMessage: MatchListItem["lastMessage"];
  unread: number;
}

export function useMatches(
  userId: string | undefined,
  token: string | undefined,
  search: string
) {
  // fetch matches list via cookie-auth; server infers user from session
  const { data: matches = [], isLoading: loading } = useQuery<MatchListView[], Error>(
    {
      queryKey: ["matches", /* user inferred by cookie */ "self"],
      queryFn: async (): Promise<MatchListView[]> => {
        try {
          const res = await matchesAPI.getMatches();
          return res.map((match) => ({
            id: match.id,
            userId: match.matchedProfile?.userId || match.matchedUser?.id || "",
            conversationId: match.conversationId,
            status: match.status,
            fullName: match.matchedProfile?.fullName || match.matchedUser?.displayName || null,
            city: match.matchedProfile?.city || null,
            country: match.matchedProfile?.country || null,
            occupation: match.matchedProfile?.occupation || null,
            education: match.matchedProfile?.education || null,
            aboutMe: match.matchedProfile?.aboutMe || match.matchedUser?.bio || null,
            gender: match.matchedProfile?.gender || null,
            profileImageUrls: match.matchedProfile?.profileImageUrls || [],
            createdAt: match.createdAt,
            updatedAt: match.updatedAt,
            lastMessage: match.lastMessage,
            unread: 0,
          }));
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Failed to fetch matches";
          handleError(
            e,
            { scope: "useMatches", action: "fetch_matches", userId },
            { customUserMessage: msg }
          );
          return [];
        }
      },
      enabled: true,
      staleTime: 60000, // 1 minute stale time for matches list
    }
  );

  const { data: counts = {} } = useUnreadCounts(userId, token);

  // filter by search
  const term = (search || "").trim().toLowerCase();
  const filtered = matches.filter((match) =>
    term
      ? (match.fullName ?? "").toLowerCase().includes(term) ||
        (match.city ?? "").toLowerCase().includes(term)
      : true
  );

  // attach unreadCount
  const withUnread = filtered.map((match) => ({
    ...match,
    unread: counts[match.userId] || 0,
  }));

  return { matches: withUnread, loading };
}
