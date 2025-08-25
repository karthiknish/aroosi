import { useQuery } from "@tanstack/react-query";
import { fetchUserProfileImagesViaApi } from "@/lib/profile/userProfileApi";

// Cookie-auth friendly: token parameter is optional/ignored. We rely on HttpOnly cookies.
export function useProfileImage(
  userId: string | undefined,
  _token?: string | undefined
) {
  const { data, isLoading } = useQuery<string | null>({
    queryKey: ["profileImage", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;
      const result = await fetchUserProfileImagesViaApi(userId);
      if (!result.success || !result.data) return null;

      // Handle different response formats
      if (Array.isArray(result.data)) {
        return result.data[0] ?? null;
      }
      if (typeof result.data === "string") {
        return result.data;
      }
      return null;
    },
    staleTime: 1000 * 60 * 5,
  });

  return { imageUrl: data, loading: isLoading };
}
