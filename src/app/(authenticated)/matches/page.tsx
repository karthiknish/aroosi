"use client";

import { useAuthContext } from "@/components/AuthProvider";
import { useForm, Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useMatchMessages } from "@/lib/utils/useMatchMessages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, MapPin, Search, Send } from "lucide-react";
import { useState } from "react";
import type { Profile } from "@/types/profile";

const religions = [
  "Any",
  "Islam",
  "Christianity",
  "Hinduism",
  "Sikhism",
  "Judaism",
  "Other",
];

interface FiltersState {
  distance: string;
  religion: string;
  minAge: string;
  maxAge: string;
  city: string;
}

async function fetchProfilesAPI(filters: FiltersState, token: string | null) {
  if (!token)
    return Promise.reject(new Error("Authentication token not available."));
  const params = new URLSearchParams();
  if (filters.city) params.append("city", filters.city);
  if (filters.religion && filters.religion !== "Any")
    params.append("religion", filters.religion);
  if (filters.minAge) params.append("minAge", filters.minAge);
  if (filters.maxAge) params.append("maxAge", filters.maxAge);
  const res = await fetch(`/api/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Failed to parse error response" }));
    throw new Error(err?.error || "Failed to fetch matches");
  }
  return res.json();
}

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
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          className="bg-green-600 hover:bg-green-700"
        >
          <Send className="w-5 h-5" />
        </Button>
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
  const [filters, setFilters] = useState<FiltersState>({
    distance: "",
    religion: "Any",
    minAge: "",
    maxAge: "",
    city: "",
  });
  const form = useForm({ defaultValues: filters });

  const { data: profiles, isLoading: loading } = useQuery<Profile[], Error>({
    queryKey: ["searchProfiles", filters, token],
    queryFn: () => fetchProfilesAPI(filters, token),
    enabled: !!token,
  });

  const onSubmit = (data: FiltersState) => {
    setFilters(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center mb-10 text-green-800 drop-shadow-lg">
          Your Matches
        </h1>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mb-10 flex flex-wrap gap-4 justify-center items-end bg-white/60 backdrop-blur rounded-xl shadow p-6"
        >
          <Controller
            control={form.control}
            name="city"
            render={({ field }) => (
              <Input {...field} placeholder="UK City" className="w-40" />
            )}
          />
          <Controller
            control={form.control}
            name="religion"
            render={({ field }) => (
              <select {...field} className="w-40 rounded-md border px-3 py-2">
                {religions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          />
          <Controller
            control={form.control}
            name="minAge"
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={18}
                placeholder="Min Age"
                className="w-28"
              />
            )}
          />
          <Controller
            control={form.control}
            name="maxAge"
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={18}
                placeholder="Max Age"
                className="w-28"
              />
            )}
          />
          <Button type="submit" className="bg-green-600 hover:bg-green-700">
            <Search className="mr-2 h-4 w-4" /> Filter
          </Button>
        </form>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-2xl" />
            ))
          ) : profiles?.length ? (
            profiles.map((profile) => (
              <ProfileCard
                key={profile._id}
                profile={profile}
                currentUserId={userId}
                token={token!}
              />
            ))
          ) : (
            <div className="col-span-full text-center text-gray-400 py-20">
              <UserCircle className="mx-auto w-16 h-16 mb-4" />
              <div>No matches found. Try adjusting your filters.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
