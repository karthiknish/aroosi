"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchAPI } from "@/lib/api/search";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

type Props = {
  baseCity?: string;
  baseCountry?: string;
  baseMotherTongue?: string;
  excludeUserId: string;
};

export function SimilarProfiles({ baseCity, baseCountry, baseMotherTongue, excludeUserId }: Props) {
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (baseCity) p.set("city", baseCity);
    if (baseCountry) p.set("country", baseCountry);
    if (baseMotherTongue) p.set("motherTongue", baseMotherTongue);
    p.set("page", "0");
    p.set("pageSize", "6");
    return p.toString();
  }, [baseCity, baseCountry, baseMotherTongue]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["similar-profiles", params, excludeUserId],
    queryFn: async () => {
      return await searchAPI.search({
        city: baseCity,
        country: baseCountry,
        motherTongue: baseMotherTongue,
        page: 0,
        pageSize: 6,
      });
    },
  });

  if (isLoading) return null;
  if (isError || !data?.profiles?.length) return null;

  const items = data.profiles.filter((p) => p.userId !== excludeUserId).slice(0, 6);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((p) => (
        <Card key={p.userId} className="hover:shadow-md transition border-neutral/10">
          <CardContent className="p-3">
            <div className="w-full aspect-square rounded-md overflow-hidden bg-neutral/5 mb-2 relative">
              {p.profile.profileImageUrls && p.profile.profileImageUrls[0] ? (
                <Image
                  src={p.profile.profileImageUrls[0]}
                  alt={p.profile.fullName || "Profile"}
                  fill
                  sizes="(max-width: 768px) 50vw, 200px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="text-sm font-medium truncate text-neutral-dark">{p.profile.fullName || "Member"}</div>
            <div className="text-xs text-neutral-light truncate">{p.profile.city || ""}</div>
            <div className="mt-2 text-right">
              <Link href={`/profile/${p.userId}`} className="text-xs text-primary hover:underline font-medium">
                View
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


