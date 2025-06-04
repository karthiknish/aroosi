"use client";

import { useEffect, useState } from "react";
import {
  fetchAdminAllMatches,
  AdminProfileMatchesResult,
} from "@/lib/profile/adminProfileApi";
import { useAuthContext } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle } from "lucide-react";

export default function AdminMatchesPage() {
  const { token } = useAuthContext();
  const [matches, setMatches] = useState<AdminProfileMatchesResult>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchAdminAllMatches({ token })
      .then((data) => setMatches(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-green-800">
        All Matches (Admin)
      </h1>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-600 font-semibold">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.length === 0 ? (
            <div className="text-gray-500">No matches found.</div>
          ) : (
            matches.map((item) => (
              <Card key={item.profileId} className="bg-white/80 shadow-lg">
                <CardHeader>
                  <CardTitle>Profile: {item.profileId}</CardTitle>
                  {item.error && (
                    <div className="text-red-500 text-xs">{item.error}</div>
                  )}
                </CardHeader>
                <CardContent>
                  {item.matches.length === 0 ? (
                    <div className="text-gray-400">
                      No matches for this profile.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {item.matches.map((match) => (
                        <li
                          key={match._id}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                        >
                          {match.profileImageIds &&
                          match.profileImageIds.length > 0 ? (
                            <img
                              src={`/api/storage/${match.profileImageIds[0]}`}
                              alt="Profile"
                              className="w-10 h-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border">
                              <UserCircle className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">
                              {match.fullName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {match.ukCity}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
