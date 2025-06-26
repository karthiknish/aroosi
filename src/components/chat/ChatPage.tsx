'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ConversationList from './ConversationList';
import ModernChat from './ModernChat';
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
  className = ""
}: ChatPageProps) {
  const { userId, getToken } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<{
    conversationId: string;
    otherUserId: string;
    otherUserName: string;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);

  // Check if mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setShowConversationList(window.innerWidth >= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize with provided conversation
  useEffect(() => {
    if (initialConversationId && initialOtherUserId && initialOtherUserName && userId) {
      setSelectedConversation({
        conversationId: initialConversationId,
        otherUserId: initialOtherUserId,
        otherUserName: initialOtherUserName,
      });
      
      if (isMobile) {
        setShowConversationList(false);
      }
    }
  }, [initialConversationId, initialOtherUserId, initialOtherUserName, userId, isMobile]);

  // Handle conversation selection
  const handleConversationSelect = (conversationId: string, otherUserId: string, otherUserName: string) => {
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
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <MessageCircle className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Sign in required</h3>
            <p className="text-gray-500 text-sm">Please sign in to access your messages</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full bg-gray-50", className)}>
      {/* Conversation List */}
      <AnimatePresence mode="wait">
        {(showConversationList || !isMobile) && (
          <motion.div
            initial={isMobile ? { x: -300, opacity: 0 } : undefined}
            animate={isMobile ? { x: 0, opacity: 1 } : undefined}
            exit={isMobile ? { x: -300, opacity: 0 } : undefined}
            transition={{ type: "tween", duration: 0.3 }}
            className={cn(
              "bg-white border-r border-gray-200",
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
                <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToConversations}
                    className="p-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-medium text-sm">
                        {selectedConversation.otherUserName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{selectedConversation.otherUserName}</h3>
                      <p className="text-xs text-gray-500">Active now</p>
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
                  token=""
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
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="w-10 h-10 text-purple-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Messages</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {isMobile 
                    ? "Select a conversation to start messaging"
                    : "Choose a conversation from the sidebar to start messaging with your matches. Build meaningful connections through thoughtful conversations."
                  }
                </p>
              </div>
              {!isMobile && (
                <div className="pt-4">
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span>Online</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      <span>Read receipts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full" />
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