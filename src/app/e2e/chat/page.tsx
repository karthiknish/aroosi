"use client";
import ModernChat from "@/components/chat/ModernChat";
import { useSearchParams } from "next/navigation";

export default function ChatE2ETestPage() {
  const params = useSearchParams();
  const conversationId = params.get("id") ?? "test-convo";
  const currentUserId = params.get("me") ?? "user1";
  const matchUserId = params.get("other") ?? "user2";
  const token = params.get("token") ?? "test-token";

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <ModernChat
        conversationId={conversationId}
        currentUserId={currentUserId}
        matchUserId={matchUserId}
        token={token}
        className="w-full max-w-md h-[70vh]"
      />
    </div>
  );
}
