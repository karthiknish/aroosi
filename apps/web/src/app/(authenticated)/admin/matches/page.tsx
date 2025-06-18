"use client";

import { useEffect, useState } from "react";
import {
  fetchAdminAllMatches,
  AdminProfileMatchesResult,
  fetchAllAdminProfileImages,
} from "@/lib/profile/adminProfileApi";
import { useAuthContext } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, ExternalLink, Users, Heart } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ImageType } from "@/types/image";

export default function AdminMatchesPage() {
  const { token } = useAuthContext();
  const [matches, setMatches] = useState<AdminProfileMatchesResult>([]);
  const [profileImages, setProfileImages] = useState<Record<string, ImageType[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    
    try {
      const matchesData = await fetchAdminAllMatches({ token });
      setMatches(matchesData);
      
      // Collect all unique profile IDs from matches
      const allProfileIds = new Set<string>();
      matchesData.forEach(item => {
        item.matches.forEach(match => {
          allProfileIds.add(match._id);
        });
      });
      
      // Fetch images for all matched profiles
      if (allProfileIds.size > 0) {
        const profilesForImages = Array.from(allProfileIds).map(id => ({
          _id: id,
          userId: id, // Using profile ID as userId for image fetching
        }));
        
        const imagesData = await fetchAllAdminProfileImages({
          token,
          profiles: profilesForImages,
        });
        setProfileImages(imagesData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Helper function to get age from date of birth
  const getAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) years--;
    return years;
  };

  // Calculate total matches count
  const totalMatches = matches.reduce((sum, item) => sum + item.matches.length, 0);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Matches Overview</h1>
          <p className="text-muted-foreground">
            View all matches across user profiles. Total: {totalMatches} matches across {matches.length} profiles.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            Refresh Data
          </Button>
          <Link href="/admin/matches/create">
            <Button className="gap-2">
              <Heart className="w-4 h-4" />
              Create Manual Match
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} className="py-16" />
      ) : (
        <>
          {matches.length === 0 ? (
            <div className="col-span-full">
              <EmptyState message="No user profiles found with matches." />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {matches.map((item) => (
                <Card key={item.profileId} className="bg-white shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">
                        Profile {item.profileId.slice(-8)}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs">
                          <Users className="w-3 h-3" />
                          {item.matches.length}
                        </div>
                        <Link href={`/admin/profile/${item.profileId}`}>
                          <Button size="icon" variant="ghost" className="h-6 w-6">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    {item.error && (
                      <div className="text-red-500 text-xs bg-red-50 p-2 rounded">
                        {item.error}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {item.matches.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No matches for this profile</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {item.matches.map((match) => {
                          const age = getAge(match.dateOfBirth);
                          const matchImages = profileImages[match._id] || [];
                          const imageUrl = matchImages.length > 0 ? matchImages[0].url : null;
                          
                          return (
                            <div
                              key={match._id}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              {/* Profile Image */}
                              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={match.fullName || "Profile"}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <UserCircle className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Profile Info */}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">
                                  {match.fullName}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  <span>{match.ukCity}</span>
                                  {age && <span>• Age {age}</span>}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                  {match.occupation}
                                </div>
                              </div>
                              
                              {/* Action Button */}
                              <Link href={`/admin/profile/${match._id}`}>
                                <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0">
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
