"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ConversationList from "./ConversationList";
import ModernChat from "./ModernChat";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { useProfileImage } from "@/lib/hooks/useProfileImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { createConversationId } from '@/lib/utils/messageUtils';

interface ChatPageProps {
  initialConversationId?: string;
  initialOtherUserId?: string;
  initialOtherUserName?: string;
  className?: string;
}

export default function ChatPage({
  initialConversationId,
  initialOtherUserId,
  initialOtherUserName,
  className = "",
}: ChatPageProps) {
  const { user, profile } = useAuthContext();
  const userId =
    user?.uid || (profile as any)?._id || (profile as any)?.userId || "";
  const [selectedConversation, setSelectedConversation] = useState<{
    conversationId: string;
    otherUserId: string;
    otherUserName: string;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);

  // Fetch avatar for currently selected conversation's other user (cookie-auth)
  const { imageUrl: selectedAvatar } = useProfileImage(
    selectedConversation?.otherUserId,
    undefined // keep signature satisfied; hook ignores token under cookie-auth
  );

  // Check if mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setShowConversationList(window.innerWidth >= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize with provided conversation
  useEffect(() => {
    if (
      initialConversationId &&
      initialOtherUserId &&
      initialOtherUserName &&
      userId
    ) {
      setSelectedConversation({
        conversationId: initialConversationId,
        otherUserId: initialOtherUserId,
        otherUserName: initialOtherUserName,
      });

      if (isMobile) {
        setShowConversationList(false);
      }
    }
  }, [
    initialConversationId,
    initialOtherUserId,
    initialOtherUserName,
    userId,
    isMobile,
  ]);

  // Handle conversation selection
  const handleConversationSelect = (
    conversationId: string,
    otherUserId: string,
    otherUserName: string
  ) => {
    setSelectedConversation({
      conversationId,
      otherUserId,
      otherUserName,
    });

    if (isMobile) {
      setShowConversationList(false);
    }
  };

  // Handle back to conversations (mobile)
  const handleBackToConversations = () => {
    setShowConversationList(true);
    if (isMobile) {
      setSelectedConversation(null);
    }
  };

  if (!userId) {
    return (
      <div className={cn("flex items-center justify-center h-96", className)}>
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-secondary-light/30 rounded-full flex items-center justify-center mx-auto">
            <MessageCircle className="w-8 h-8 text-secondary" />
          </div>
          <div>
            <h3 className="font-medium text-neutral mb-1">Sign in required</h3>
            <p className="text-neutral-light text-sm">
              Please sign in to access your messages
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full bg-base-dark", className)}>
      {/* Conversation List */}
      <AnimatePresence mode="wait">
        {(showConversationList || !isMobile) && (
          <motion.div
            initial={isMobile ? { x: -300, opacity: 0 } : undefined}
            animate={isMobile ? { x: 0, opacity: 1 } : undefined}
            exit={isMobile ? { x: -300, opacity: 0 } : undefined}
            transition={{ type: "tween", duration: 0.3 }}
            className={cn(
              "bg-base border-r border-secondary-light/30",
              isMobile ? "w-full" : "w-80 flex-shrink-0"
            )}
          >
            <ConversationList
              onConversationSelect={handleConversationSelect}
              selectedConversationId={selectedConversation?.conversationId}
              className="h-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedConversation.conversationId}
              initial={isMobile ? { x: 300, opacity: 0 } : { opacity: 0 }}
              animate={isMobile ? { x: 0, opacity: 1 } : { opacity: 1 }}
              exit={isMobile ? { x: 300, opacity: 0 } : { opacity: 0 }}
              transition={{ type: "tween", duration: 0.3 }}
              className="h-full flex flex-col"
            >
              {/* Mobile header with back button */}
              {isMobile && (
                <div className="flex items-center gap-3 p-4 bg-base border-b border-secondary-light/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToConversations}
                    className="p-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8 border border-secondary-light/40">
                        {selectedAvatar ? (
                          <AvatarImage
                            src={selectedAvatar}
                            alt={selectedConversation.otherUserName || "User"}
                          />
                        ) : (
                          <AvatarFallback className="text-[11px]">
                            {selectedConversation.otherUserName
                              .charAt(0)
                              .toUpperCase() || "U"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {/* Presence dot placeholder; can be wired to real presence later */}
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-base bg-success" />
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral">
                        {selectedConversation.otherUserName}
                      </h3>
                      <p className="text-xs text-neutral-light">Active now</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Component */}
              <div className="flex-1 p-4">
                <ModernChat
                  conversationId={selectedConversation.conversationId}
                  currentUserId={userId}
                  matchUserId={selectedConversation.otherUserId}
                  matchUserName={selectedConversation.otherUserName}
                  matchUserAvatarUrl={selectedAvatar || ""}
                  className="h-full"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          /* Empty state when no conversation selected */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center space-y-4 max-w-sm mx-auto p-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-light/30 to-secondary-light/30 rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-neutral mb-2 font-serif">
                  Welcome to Messages
                </h3>
                <p className="text-neutral-light text-sm leading-relaxed">
                  {isMobile
                    ? "Select a conversation to start messaging"
                    : "Choose a conversation from the sidebar to start messaging with your matches. Build meaningful connections through thoughtful conversations."}
                </p>
              </div>
              {!isMobile && (
                <div className="pt-4">
                  <div className="flex items-center justify-center gap-4 text-xs text-neutral-light">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-success rounded-full" />
                      <span>Online</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-secondary rounded-full" />
                      <span>Read receipts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span>Safe messaging</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
