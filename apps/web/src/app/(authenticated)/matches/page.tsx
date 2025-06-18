"use client";

import { useAuthContext } from "@/components/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCircle, MapPin, Search, MessageCircle, Heart, Calendar, Users, Star } from "lucide-react";
import { useState } from "react";
import { useMatches } from "@/lib/hooks/useMatches";
import { useProfileImage } from "@/lib/hooks/useProfileImage";
import Link from "next/link";
import type { Profile } from "@/types/profile";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useOffline } from "@/hooks/useOffline";
import { SubscriptionGuard } from "@/components/ui/subscription-guard";
import { motion } from "framer-motion";

function MatchCard({
  match,
  token,
  index,
}: {
  match: Partial<Profile> & { userId: string; unread: number };
  token: string;
  index: number;
}) {
  const { imageUrl: avatar } = useProfileImage(match.userId, token);
  
  const calculateAge = (dateOfBirth: string | Date | number | undefined) => {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(match.dateOfBirth);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex">
            {/* Profile Image */}
            <div className="relative p-4">
              {avatar ? (
                <div className="relative">
                  <img
                    src={avatar}
                    alt={match.fullName || "Avatar"}
                    className="w-20 h-20 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
                  />
                  {match.unread && match.unread > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1"
                    >
                      <Badge variant="destructive" className="h-6 min-w-6 rounded-full text-xs font-bold shadow-lg">
                        {match.unread > 9 ? '9+' : match.unread}
                      </Badge>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-lg">
                  <UserCircle className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 p-4 min-w-0">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                    {match.fullName || "Unknown"}
                  </h3>
                  {age && (
                    <Badge variant="secondary" className="text-xs bg-gray-100">
                      {age}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{match.ukCity || "Location not specified"}</span>
                </div>
                
                {match.occupation && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{match.occupation}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Button */}
            <div className="p-4 flex items-center">
              <Link href={`/matches/${match.userId}`}>
                <Button 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                  size="sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Chat
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MatchesLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex">
              <div className="p-4">
                <Skeleton className="w-20 h-20 rounded-2xl" />
              </div>
              <div className="flex-1 p-4 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="p-4">
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function MatchesPage() {
  const { token, userId, profile } = useAuthContext();
  const offline = useOffline();
  const [search, setSearch] = useState("");

  const { matches, loading } = useMatches(userId ?? "", token ?? "", search);

  if (!token || !userId)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState message="You must be signed in to view matches." />
      </div>
    );

  if (offline) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState />
      </div>
    );
  }

  return (
    <SubscriptionGuard feature="canChatWithMatches">
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl text-white shadow-lg">
              <Heart className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Your Matches
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Connect with people who are interested in you
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 border border-purple-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{matches.length}</div>
                <div className="text-sm text-gray-600">Total Matches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-600">
                  {matches.filter(m => m.unread > 0).length}
                </div>
                <div className="text-sm text-gray-600">Unread Chats</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>Premium Feature</span>
            </div>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or location..."
              className="pl-12 pr-4 py-3 rounded-2xl border-0 bg-white shadow-lg focus:shadow-xl transition-shadow text-center"
            />
          </div>
        </motion.div>

        {/* Matches List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {loading ? (
            <MatchesLoadingSkeleton />
          ) : matches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <EmptyState 
                message={search ? "No matches found for your search." : "No matches yet."} 
                description={search ? "Try adjusting your search terms." : "Keep swiping to find your perfect match!"}
              />
            </motion.div>
          ) : (
            <div className="space-y-6">
              {matches.map((match, index) => (
                <MatchCard 
                  key={match.userId} 
                  match={match} 
                  token={token} 
                  index={index}
                />
              ))}
              
              {/* Load More Hint */}
              {matches.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center py-8"
                >
                  <p className="text-gray-500 text-sm">
                    {matches.length === 1 ? "1 match" : `${matches.length} matches`} found
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </SubscriptionGuard>
  );
}