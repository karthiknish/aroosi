import { useQuery } from "@tanstack/react-query";

export function useProfileImage(
  userId: string | undefined,
  token: string | undefined
) {
  const { data, isLoading } = useQuery<string | null>({
    queryKey: ["profileImage", userId],
    enabled: Boolean(userId && token),
    queryFn: async () => {
      if (!userId || !token) return null;
      const res = await fetch(`/api/profile-detail/${userId}/images`, {
        headers: { Authorization: `Bearer ${token}` },
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
