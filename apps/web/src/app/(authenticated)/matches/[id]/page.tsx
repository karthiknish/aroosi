"use client";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import ModernChat from "@/components/chat/ModernChat";
import { getConversationId } from "@/lib/utils/conversation";
import { useQuery } from "@tanstack/react-query";
import { fetchUserPublicProfile } from "@/lib/api/publicProfile";
import { markConversationRead } from "@/lib/api/messages";
import { useProfileImage } from "@/lib/hooks/useProfileImage";
import { Skeleton } from "@/components/ui/skeleton";

export default function MatchChatPage() {
  const { id: otherUserId } = useParams<{ id: string }>();
  const { token, userId } = useAuthContext();
  const router = useRouter();

  const conversationId = getConversationId(userId ?? "", otherUserId);

  // fetch match profile
  const { data: matchProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["matchProfile", otherUserId, token],
    queryFn: async () => {
      if (!token) return null;
      return await fetchUserPublicProfile({ userId: otherUserId, token });
    },
    enabled: !!token,
  });

  // mark conversation as read (runs once via react-query, no useEffect)
  useQuery({
    queryKey: ["markRead", conversationId, userId],
    queryFn: async () => {
      if (!token || !userId) return true;
      await markConversationRead({ conversationId, userId, token });
      return true;
    },
    enabled: !!token && !!userId && !!conversationId,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const { imageUrl: avatarData, loading: avatarLoading } = useProfileImage(
    otherUserId,
    token ?? undefined
  );

  // Show loader until auth context ready
  if (!token || !userId) {
    return null;
  }

  return (
    <div className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.push("/matches")}
          className="text-primary pr-2 border-r border-border"
        >
          ← Back
        </button>
        {avatarLoading ? (
          <Skeleton className="w-10 h-10 rounded-full" />
        ) : avatarData ? (
          <img
            src={avatarData}
            className="w-10 h-10 rounded-full object-cover"
            alt="avatar"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200" />
        )}
        {profileLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span className="font-semibold text-lg text-foreground">
            {matchProfile?.fullName || "Match"}
          </span>
        )}
      </div>
      {/* Chat component */}
      <ModernChat
        conversationId={conversationId}
        currentUserId={userId}
        matchUserId={otherUserId}
        token={token}
      />
    </div>
  );
}
