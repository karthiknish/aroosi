"use client";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import ModernChat from "@/components/chat/ModernChat";
import { getConversationId } from "@/lib/utils/conversation";
import { useQuery } from "@tanstack/react-query";
import { getPublicProfile } from "@/lib/api/publicProfile";
import { markConversationRead } from "@/lib/api/messages";

export default function MatchChatPage() {
  const { id: otherUserId } = useParams<{ id: string }>();
  const { token, userId } = useAuthContext();
  const router = useRouter();

  const conversationId = getConversationId(userId ?? "", otherUserId);

  // fetch match profile
  const { data: matchProfile } = useQuery({
    queryKey: ["matchProfile", otherUserId, token],
    queryFn: async () => {
      if (!token) return null;
      return await getPublicProfile(otherUserId);
    },
    enabled: !!token,
  });

  // mark conversation as read (runs once via react-query, no useEffect)
  useQuery({
    queryKey: ["markRead", conversationId, userId],
    queryFn: async () => {
      if (!token || !userId) return true;
      await markConversationRead(conversationId, token);
      return true;
    },
    enabled: !!token && !!userId && !!conversationId,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // Show loader until auth context ready
  if (!token || !userId) {
    return null;
  }

  return (
    <div className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* Optional back link */}
      <button
        onClick={() => router.push("/matches")}
        className="text-primary mb-4"
      >
        ← Back
      </button>
      {/* Chat component */}
      <ModernChat
        conversationId={conversationId}
        currentUserId={userId}
        matchUserId={otherUserId}
        token={token}
        matchUserName={matchProfile?.fullName || ""}
        matchUserAvatarUrl=""
      />
    </div>
  );
}
