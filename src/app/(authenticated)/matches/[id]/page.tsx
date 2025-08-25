"use client";

import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import ModernChat from "@/components/chat/ModernChat";
import { getConversationId } from "@/lib/utils/conversation";
import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/lib/profile/userProfileApi";
import { useProfileImage } from "@/lib/hooks/useProfileImage";
import { markConversationRead } from "@/lib/api/messages";
import { useState, useEffect } from "react";
import { showErrorToast } from "@/lib/ui/toast";
import Head from "next/head";
export default function MatchChatPage() {
  const { id: otherUserId } = useParams<{ id: string }>();
  // Cookie-auth: remove token from context; server reads HttpOnly cookies
  const { user, profile } = useAuthContext();
  const userId =
    user?.uid || (profile as any)?._id || (profile as any)?.userId || "";
  const router = useRouter();
  const [loadError, setLoadError] = useState<string | null>(null);

  const conversationId = getConversationId(userId ?? "", otherUserId);

  // fetch match profile (name and other public fields)
  const { data: matchProfile, error: matchError } = useQuery({
    queryKey: ["matchProfile", otherUserId],
    queryFn: async () => {
      const res = await fetchUserProfile(otherUserId);
      if (res.success && res.data) {
        return res.data as { fullName?: string };
      }
      throw new Error(res.error || "Failed to load match profile");
    },
    enabled: !!otherUserId,
    retry: 1,
  });

  useEffect(() => {
    if (matchError) {
      const msg =
        (matchError as Error)?.message || "Failed to load match profile";
      setLoadError(msg);
      showErrorToast?.(msg);
    } else {
      setLoadError(null);
    }
  }, [matchError]);

  // fetch avatar image (hook should tolerate undefined token)
  const { imageUrl: matchAvatar } = useProfileImage(otherUserId, undefined);

  // mark conversation as read (runs once via react-query, no useEffect)
  useQuery({
    queryKey: ["markRead", conversationId, userId],
    queryFn: async () => {
      if (!userId) return true;
      // markConversationRead now cookie-based; only conversationId is required
      await markConversationRead(conversationId);
      return true;
    },
    enabled: !!userId && !!conversationId,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // Show loader until auth context ready
  if (!userId) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Chat — Aroosi Matches</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#bfa67a" />
      </Head>
      <div className="relative min-h-screen">
        {/* Decorative color pop circles */}
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent-100 rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
        {/* Subtle SVG background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23BFA67A' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="min-h-screen pt-6">
            {/* Optional back link */}
            <button
              onClick={() => router.push("/matches")}
              className="text-primary mb-4"
            >
              ← Back
            </button>
            {loadError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {loadError}
              </div>
            )}
            {/* Chat component */}
            <ModernChat
              conversationId={conversationId}
              currentUserId={userId}
              matchUserId={otherUserId}
              matchUserName={matchProfile?.fullName || ""}
              matchUserAvatarUrl={matchAvatar || ""}
            />
          </div>
        </div>
      </div>
    </>
  );
}
