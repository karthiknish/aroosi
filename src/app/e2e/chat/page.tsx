"use client";
import ModernChat from "@/components/chat/ModernChat";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ChatE2ETestPageInner() {
  const params = useSearchParams();
  const conversationId = params.get("id") ?? "test-convo";
  const currentUserId = params.get("me") ?? "user1";
  const matchUserId = params.get("other") ?? "user2";

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <ModernChat
        conversationId={conversationId}
        currentUserId={currentUserId}
        matchUserId={matchUserId}
        className="w-full max-w-md h-[70vh]"
      />
    </div>
  );
}

export default function ChatE2ETestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatE2ETestPageInner />
    </Suspense>
  );
}
