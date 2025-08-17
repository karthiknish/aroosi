import { useQuery } from "@tanstack/react-query";
import { fetchAdminProfileImagesById } from "@/lib/profile/adminProfileApi";
import type { ImageType } from "@/types/image";

interface UseAdminProfileImagesOptions {
  profileId?: string | null;
  enabled?: boolean;
}

export function useAdminProfileImages({ profileId, enabled = true }: UseAdminProfileImagesOptions) {
  const query = useQuery<ImageType[]>({
    queryKey: ["profileImages", profileId, "admin"],
    queryFn: async () => {
      if (!profileId) return [];
      try {
        return await fetchAdminProfileImagesById({ profileId });
      } catch (e) {
        // swallow, returning empty; caller can display a toast if desired
        return [];
      }
    },
    enabled: !!profileId && enabled,
    staleTime: 60_000,
  });
  return { images: query.data || [], loading: query.isLoading, query };
}
