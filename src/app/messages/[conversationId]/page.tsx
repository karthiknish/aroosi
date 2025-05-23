"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Id } from "@/../convex/_generated/dataModel";

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useUser();
  const currentUserConvex = useQuery(api.users.getCurrentUserWithProfile, {});
  const currentUserId = currentUserConvex?._id;

  // Parse user IDs from conversationId (format: userA_userB, sorted)
  const [userA, userB] = conversationId.split("_");
  // Convex expects Id<"users">, so cast as needed
  const otherUserId = (currentUserId === userA ? userB : userA) as Id<"users">;

  // Only allow access if mutual interest exists
  const isMutualInterest = useQuery(
    api.interests.isMutualInterest,
    currentUserId && otherUserId && currentUserId !== otherUserId
      ? { userA: currentUserId, userB: otherUserId }
      : "skip"
  );

  // Fetch messages for this conversation
  const messages = useQuery(
    api.messages.getMessages,
    conversationId ? { conversationId } : "skip"
  );
  const sendMessage = useMutation(api.messages.sendMessage);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!currentUserId || isMutualInterest === undefined) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        Loading...
      </div>
    );
  }
  if (!isMutualInterest) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-pink-700 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-4">
          You can only message users with whom you have a mutual interest.
        </p>
      </div>
    );
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      await sendMessage({
        conversationId,
        fromUserId: currentUserId,
        toUserId: otherUserId,
        text: newMessage,
      });
      setNewMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 via-rose-50 to-white py-16 px-4">
      <Card className="max-w-2xl w-full mx-auto shadow-xl rounded-2xl overflow-hidden flex flex-col h-[70vh]">
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages === undefined ? (
            <div className="text-center text-gray-400">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg: any) => (
              <div
                key={msg._id}
                className={`flex ${msg.fromUserId === currentUserId ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-xs break-words shadow text-base ${
                    msg.fromUserId === currentUserId
                      ? "bg-pink-600 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {msg.text}
                  <div className="text-xs text-gray-400 mt-1 text-right">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <form
          className="flex items-center gap-2 border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            autoFocus
          />
          <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}
