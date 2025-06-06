"use client";

import { useAuthContext } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, MapPin } from "lucide-react";
import { useState } from "react";
import type { Profile } from "@/types/profile";
import { useMatchMessages } from "@/lib/utils/useMatchMessages";

function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join("_");
}

function ModernChat({
  conversationId,
  currentUserId,
  matchUserId,
  token,
}: {
  conversationId: string;
  currentUserId: string;
  matchUserId: string;
  token: string;
}) {
  const { messages, loading, error, sendMessage } = useMatchMessages(
    conversationId,
    token
  );
  const [text, setText] = useState("");

  return (
    <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg p-4 mt-4">
      <div className="h-48 overflow-y-auto space-y-2 mb-2">
        {loading ? (
          <Skeleton className="h-6 w-3/4" />
        ) : messages.length === 0 ? (
          <div className="text-gray-400 text-center">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`flex ${msg.fromUserId === currentUserId ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-3 py-2 rounded-2xl shadow ${
                  msg.fromUserId === currentUserId
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-900"
                } max-w-xs`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>
      <form
        className="flex gap-2"
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
          placeholder="Type your message..."
          className="flex-1 border rounded px-2 py-1"
        />
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded"
        >
          Send
        </button>
      </form>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
}

function ProfileCard({
  profile,
  currentUserId,
  token,
}: {
  profile: Profile;
  currentUserId: string;
  token: string;
}) {
  const conversationId = getConversationId(currentUserId, profile.userId);
  return (
    <Card className="bg-white/70 backdrop-blur-lg shadow-2xl border-0 hover:scale-105 transition-transform duration-200">
      <CardHeader className="flex flex-row items-center gap-4">
        {profile.profileImageIds?.length ? (
          <img
            src={`/api/storage/${profile.profileImageIds[0]}`}
            alt="Profile"
            className="w-16 h-16 rounded-full object-cover border-4 border-green-200 shadow"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border">
            <UserCircle className="w-10 h-10 text-gray-400" />
          </div>
        )}
        <div>
          <CardTitle className="text-xl font-bold">
            {profile.fullName}
          </CardTitle>
          <div className="flex items-center text-green-700 gap-1">
            <MapPin className="w-4 h-4" /> {profile.ukCity}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-gray-700 mb-2">
          <span className="font-semibold">About:</span> {profile.aboutMe || "-"}
        </div>
        <ModernChat
          conversationId={conversationId}
          currentUserId={currentUserId}
          matchUserId={profile.userId}
          token={token}
        />
      </CardContent>
    </Card>
  );
}

export default function MatchesPage() {
  const { token, userId } = useAuthContext();

  const { data: matches = [], isLoading: loadingMatches } = useQuery<Profile[]>(
    {
      queryKey: ["matches", userId, token],
      queryFn: async () => {
        if (!token || !userId) return [];
        const res = await fetch(`/api/matches?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        return await res.json();
      },
      enabled: Boolean(token && userId),
    }
  );

  if (!token || !userId) {
    return null;
  }

  if (loadingMatches) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-20 h-20 rounded-full" />
        <Skeleton className="h-6 w-40 rounded ml-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-base-light pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden">
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
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block relative mb-4">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-primary mb-2">
              Matches
            </h1>
            {/* Pink wavy SVG underline */}
            <svg
              className="absolute -bottom-2 left-0 w-full"
              height="6"
              viewBox="0 0 200 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 3C50 0.5 150 0.5 200 3"
                stroke="#FDA4AF"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
        {matches.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            No matches found yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {matches.map((profile) => (
              <ProfileCard
                key={profile.userId}
                profile={profile}
                currentUserId={userId}
                token={token}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
