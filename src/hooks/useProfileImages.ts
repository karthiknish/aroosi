import { useQuery } from "@tanstack/react-query";
import { fetchUserProfileImages } from "@/lib/profile/userProfileApi";

export interface ProfileImageItem { url: string; storageId: string }

interface UseProfileImagesOptions {
  userId?: string | null;
  enabled?: boolean;
  preferInlineUrls?: string[] | null | undefined; // if present, skip fetch
}

export function useProfileImages({ userId, enabled = true, preferInlineUrls }: UseProfileImagesOptions) {
  const skip = !!preferInlineUrls && preferInlineUrls.length > 0;

  const query = useQuery<{ url: string; storageId: string }[]>({
    queryKey: ["profileImages", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetchUserProfileImages(userId);
      if (!res.success || !Array.isArray(res.data)) return [];
      return res.data
        .filter((i) => i && (i.url || i.storageId))
        .map((i) => ({ url: i.url || "", storageId: i.storageId }));
    },
    enabled: !!userId && enabled && !skip,
    staleTime: 60_000,
  });

  const images =
    preferInlineUrls && preferInlineUrls.length > 0
      ? preferInlineUrls.map((u) => ({ url: u, storageId: u }))
      : query.data || [];



  return { images, loading: query.isLoading, query };
}
