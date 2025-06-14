"use client";
import { useState, useEffect, useRef } from "react";
import { useMatchMessages } from "@/lib/utils/useMatchMessages";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Smile } from "lucide-react";

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
  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to bottom when messages change & if near bottom
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Detect scroll top for pagination
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || loadingOlder || !hasMore) return;
    if (el.scrollTop < 40) {
      fetchOlder();
    }
  };

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

  return (
    <div
      className={`bg-base-light/70 backdrop-blur-lg border border-border rounded-xl shadow-lg p-4 flex flex-col ${className}`}
    >
      {/* Messages list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 mb-2 pr-2 scrollbar-thumb-rounded scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        onScroll={handleScroll}
      >
        {loading ? (
          <LoadingSpinner size={24} />
        ) : messages.length === 0 ? (
          <div className="text-gray-400 text-center">
            No messages yet. Say hello!
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center py-2">
                <button
                  onClick={fetchOlder}
                  disabled={loadingOlder}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {loadingOlder ? "Loading..." : "Load earlier messages"}
                </button>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={`flex ${
                    msg.fromUserId === currentUserId
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`px-4 py-2 rounded-2xl max-w-xs break-words shadow-md text-sm md:text-base ${
                      msg.fromUserId === currentUserId
                        ? "bg-accent text-white rounded-br-none"
                        : "bg-secondary-light text-neutral rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                    <span className="block text-[10px] mt-1 opacity-80 text-right select-none">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
      <form
        className="flex gap-2 relative"
        onSubmit={async (e) => {
          e.preventDefault();
          if (text.trim()) {
            await sendMessage({
              fromUserId: currentUserId,
              toUserId: matchUserId,
              text,
            });
            setText("");
          }
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-dark bg-white/60"
        />
        {/* Emoji picker toggle */}
        <button
          type="button"
          onClick={() => setShowPicker((p) => !p)}
          ref={toggleBtnRef}
          className="p-2 text-pink-600 hover:text-pink-700 transition-colors rounded-md focus:outline-none"
        >
          <Smile size={20} />
        </button>
        <button
          type="submit"
          className="bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Send
        </button>

        {showPicker && (
          <div
            ref={pickerRef}
            className="absolute bottom-full right-0 mb-2 z-50"
          >
            <EmojiPicker
              onEmojiClick={(emojiData: EmojiClickData) => {
                setText((prev) => prev + emojiData.emoji);
              }}
              autoFocusSearch={false}
            />
          </div>
        )}
      </form>
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-danger text-xs mt-1"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
