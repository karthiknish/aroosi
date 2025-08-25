import { useQuery } from "@tanstack/react-query";

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
      const res = await fetch(`/api/profile-detail/${userId}/images`, {
        // Cookie-based session; no Authorization header
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (Array.isArray(json)) {
        return json[0]?.url ?? null;
      }
      return json?.userProfileImages?.[0]?.url ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });

  return { imageUrl: data, loading: isLoading };
}
