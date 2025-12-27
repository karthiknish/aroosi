"use client";
import { useState, Suspense } from "react";
import { interestsAPI } from "@/lib/api/interests";
import { Heart, HeartOff } from "lucide-react";
import { useSearchParams } from "next/navigation";

function InterestE2ETestPageInner() {
  const params = useSearchParams();
  const toUserId = params.get("other") ?? "user2";
  // token is no longer required; cookie-based auth is used

  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState("idle");

  const handleClick = async () => {
    setStatus("loading");
    try {
      if (sent) {
        await interestsAPI.remove(toUserId);
        setSent(false);
      } else {
        await interestsAPI.send(toUserId);
        setSent(true);
      }
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className="p-4 rounded-full shadow-lg bg-primary text-base-light"
      >
        {sent ? (
          <HeartOff className="w-8 h-8" />
        ) : (
          <Heart className="w-8 h-8" />
        )}
      </button>
      <div data-testid="status">{status}</div>
    </div>
  );
}

export default function InterestE2ETestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InterestE2ETestPageInner />
    </Suspense>
  );
}
