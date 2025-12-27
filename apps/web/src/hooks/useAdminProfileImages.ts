import { useQuery } from "@tanstack/react-query";
import { adminProfilesAPI } from "@/lib/api/admin/profiles";
import type { ProfileImageInfo } from "@aroosi/shared/types";
import { useEffect, useState } from "react";

interface UseAdminProfileImagesOptions {
  profileId?: string | null;
  enabled?: boolean;
}

export function useAdminProfileImages({
  profileId,
  enabled = true,
}: UseAdminProfileImagesOptions) {
  const query = useQuery<ProfileImageInfo[]>({
    queryKey: ["profileImages", profileId, "admin"],
    queryFn: async () => {
      if (!profileId) return [];
      try {
        return await adminProfilesAPI.getImages(profileId);
      } catch (e) {
        // swallow, returning empty; caller can display a toast if desired
        return [];
      }
    },
    enabled: !!profileId && enabled,
    staleTime: 60_000,
  });

  const [images, setImages] = useState<ProfileImageInfo[]>(query.data || []);
  useEffect(() => {
    if (Array.isArray(query.data)) setImages(query.data);
  }, [query.data]);

  return { images, loading: query.isLoading, query, setImages };
}
