"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useMatchMessages } from "@/lib/utils/useMatchMessages";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Smile, Send, MoreVertical, Image as ImageIcon, Paperclip, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModernChatProps = {
  conversationId: string;
  currentUserId: string;
  matchUserId: string;
  token: string;
  className?: string;
};

export default function ModernChat({
  conversationId,
  currentUserId,
  matchUserId,
  token,
  className = "",
}: ModernChatProps) {
  const {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    fetchOlder,
    sendMessage,
  } = useMatchMessages(conversationId, token);
  const [text, setText] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change & if near bottom
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isNearBottom, scrollToBottom]);

  // Enhanced scroll handling for pagination and scroll-to-bottom detection
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    // Check if near bottom for auto-scroll behavior
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setIsNearBottom(isAtBottom);
    setShowScrollToBottom(!isAtBottom && messages.length > 0);
    
    // Load older messages when near top
    if (!loadingOlder && hasMore && el.scrollTop < 40) {
      fetchOlder();
    }
  }, [loadingOlder, hasMore, fetchOlder, messages.length]);
  
  // Debounced scroll handler
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    let timeoutId: NodeJS.Timeout;
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 50);
    };
    
    el.addEventListener('scroll', debouncedHandleScroll);
    return () => {
      el.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  // Enhanced message sending
  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage({
        fromUserId: currentUserId,
        toUserId: matchUserId,
        text: messageText.trim(),
      });
      setText("");
      setIsNearBottom(true);
      // Focus back to input after sending
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [sendMessage, currentUserId, matchUserId, isSending]);

  // Keyboard shortcuts
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(text);
    }
  }, [text, handleSendMessage]);

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col h-[600px] relative overflow-hidden",
        className
      )}
    >
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span className="font-medium">Chat Active</span>
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 relative">
        {/* Messages list */}
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <LoadingSpinner size={32} />
                <p className="text-gray-500 text-sm">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto">
                  <Smile className="w-8 h-8 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Start the conversation!</h3>
                  <p className="text-gray-500 text-sm">Send a message to break the ice</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {hasMore && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchOlder}
                    disabled={loadingOlder}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {loadingOlder ? (
                      <>
                        <LoadingSpinner size={16} className="mr-2" />
                        Loading...
                      </>
                    ) : (
                      "Load earlier messages"
                    )}
                  </Button>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => {
                  const isCurrentUser = msg.fromUserId === currentUserId;
                  const showTime = index === 0 || 
                    new Date(messages[index - 1]?.createdAt).getTime() < new Date(msg.createdAt).getTime() - 5 * 60 * 1000;
                  
                  return (
                    <motion.div
                      key={msg._id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="space-y-1"
                    >
                      {showTime && (
                        <div className="text-center">
                          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                            {new Date(msg.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                        <div
                          className={cn(
                            "max-w-[280px] px-4 py-3 rounded-2xl shadow-sm text-sm break-words",
                            isCurrentUser
                              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-md"
                              : "bg-gray-100 text-gray-900 rounded-bl-md"
                          )}
                        >
                          <p className="leading-relaxed">{msg.text}</p>
                          <div className={cn(
                            "text-xs mt-2 flex items-center gap-1",
                            isCurrentUser ? "text-purple-100 justify-end" : "text-gray-500"
                          )}>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isCurrentUser && (
                              <div className="w-1 h-1 bg-current rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}
        </div>
        
        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollToBottom && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-4 right-4"
            >
              <Button
                size="sm"
                onClick={() => scrollToBottom(true)}
                className="rounded-full shadow-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 h-10 w-10 p-0"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-2xl">
        <form
          className="flex items-end gap-3 relative"
          onSubmit={async (e) => {
            e.preventDefault();
            handleSendMessage(text);
          }}
        >
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message…"
              disabled={isSending}
              className={cn(
                "w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all",
                isSending && "opacity-50 cursor-not-allowed"
              )}
            />
            
            {/* Emoji picker toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPicker((p) => !p)}
              ref={toggleBtnRef}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors p-2 h-8 w-8"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Additional action buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-purple-500 transition-colors p-2 h-10 w-10"
              title="Attach file (coming soon)"
              disabled
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-purple-500 transition-colors p-2 h-10 w-10"
              title="Send image (coming soon)"
              disabled
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Send button */}
          <Button
            type="submit"
            disabled={!text.trim() || isSending}
            className={cn(
              "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl",
              (!text.trim() || isSending) && "opacity-50 cursor-not-allowed transform-none shadow-none"
            )}
          >
            {isSending ? (
              <LoadingSpinner size={16} className="text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>

          {/* Emoji picker */}
          <AnimatePresence>
            {showPicker && (
              <motion.div
                ref={pickerRef}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full right-0 mb-2 z-50 shadow-xl rounded-lg overflow-hidden"
              >
                <EmojiPicker
                  onEmojiClick={(emojiData: EmojiClickData) => {
                    setText((prev) => prev + emojiData.emoji);
                    inputRef.current?.focus();
                  }}
                  width={350}
                  height={400}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </form>
        
        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-red-600 text-xs">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}