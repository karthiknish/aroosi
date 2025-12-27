"use client";

import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import ModernChat from "@/components/chat/ModernChat";
import { MatchesSidebar } from "@/components/chat/MatchesSidebar";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { getConversationId } from "@/lib/utils/conversation";
import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/lib/profile/userProfileApi";
import { useProfileImage } from "@/lib/hooks/useProfileImage";
import { markConversationRead } from "@/lib/api/messages";
import { useState, useEffect } from "react";
import { showErrorToast } from "@/lib/ui/toast";
import { getErrorMessage } from "@/lib/utils/apiResponse";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
export default function MatchChatPage() {
  const { id: otherUserId } = useParams<{ id: string }>();
  // Cookie-auth: remove token from context; server reads HttpOnly cookies
  const { user, profile } = useAuthContext();
  const userId =
    user?.uid || (profile as any)?._id || (profile as any)?.userId || "";
  const router = useRouter();
  const [loadError, setLoadError] = useState<string | null>(null);

  const conversationId = getConversationId(userId ?? "", otherUserId);

  // fetch match profile (full profile for drawer)
  const { data: matchProfile, error: matchError } = useQuery({
    queryKey: ["matchProfile", otherUserId],
    queryFn: async () => {
      const res = await fetchUserProfile(otherUserId);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(
        getErrorMessage(res.error) || "Failed to load match profile"
      );
    },
    enabled: !!otherUserId,
    retry: 3, // Increase retries for auth propagation timing
    retryDelay: (attemptIndex) => Math.min(1500 * Math.pow(2, attemptIndex), 8000),
  });

  useEffect(() => {
    if (matchError) {
      const msg =
        (matchError as Error)?.message || "Failed to load match profile";
      // Don't show "Authentication not ready" as a toast - it's usually transient
      if (msg.toLowerCase().includes("authentication not ready")) {
        setLoadError(null);
        return;
      }
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
      <div className="h-screen bg-base-light overflow-hidden flex flex-col">
        {/* Mobile Header - only visible on small screens */}
        <div className="lg:hidden flex items-center p-4 border-b bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/matches")}
            className="mr-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            {matchAvatar ? (
              <Image
                src={matchAvatar}
                alt={matchProfile?.fullName || ""}
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-neutral/10 flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-neutral-light" />
              </div>
            )}
            <span className="font-bold text-neutral-dark truncate">
              {matchProfile?.fullName || "Chat"}
            </span>
          </div>
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Sidebar Panel - hidden on mobile by default or handled by navigation */}
          <ResizablePanel 
            defaultSize={25} 
            minSize={20} 
            maxSize={40}
            className="hidden lg:block"
          >
            <MatchesSidebar />
          </ResizablePanel>
          
          <ResizableHandle withHandle className="hidden lg:flex" />
          
          {/* Chat Panel */}
          <ResizablePanel defaultSize={75}>
            <div className="h-full relative flex flex-col">
              {/* Decorative color pop circles */}
              <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-primary rounded-full blur-3xl opacity-20 z-0 pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] bg-accent rounded-full blur-3xl opacity-10 z-0 pointer-events-none"></div>
              
              <div className="flex-1 relative z-10 p-4 lg:p-6 flex flex-col min-h-0">
                {loadError && (
                  <div className="mb-4 text-sm text-danger bg-danger/5 border border-danger/20 rounded-md px-3 py-2 flex-shrink-0">
                    {loadError}
                  </div>
                )}
                
                <ModernChat
                  conversationId={conversationId}
                  currentUserId={userId}
                  matchUserId={otherUserId}
                  matchUserName={matchProfile?.fullName || ""}
                  matchUserAvatarUrl={matchAvatar || ""}
                  matchProfile={matchProfile}
                  className="h-full"
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
}
