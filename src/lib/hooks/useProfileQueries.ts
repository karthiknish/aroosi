import { useQuery } from "@tanstack/react-query";
import { useToken } from "@/components/TokenProvider";
import { queryKeys } from "../queryClient";

interface ProfileResponse {
  _id?: string;
  userId?: string;
  isProfileComplete?: boolean;
  profile?: {
    fullName?: string;
    dateOfBirth?: string;
    gender?: string;
    ukCity?: string;
    aboutMe?: string;
    religion?: string;
    occupation?: string;
    education?: string;
    height?: string;
    maritalStatus?: string;
    smoking?: string;
    drinking?: string;
    profileImageIds?: string[];
    isProfileComplete?: boolean;
  };
}

export function useCurrentUserProfile() {
  const token = useToken();

  return useQuery<ProfileResponse>({
    queryKey: queryKeys.currentUserProfile(token),
    queryFn: async () => {
      if (!token) {
        throw new Error("No authentication token available");
      }
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch profile");
      }
      const data = await res.json();
      return data.profile ? data : { profile: null };
    },
    enabled: !!token,
  });
}

export function useProfileImages(userId: string | undefined) {
  const token = useToken();

  return useQuery({
    queryKey: queryKeys.profileImages(userId || "", token),
    queryFn: async () => {
      if (!token || !userId) return [];
      const res = await fetch(`/api/profile-detail/${userId}/images`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.userProfileImages || [];
    },
    enabled: !!token && !!userId,
  });
}

export function useUserImages(userIds: string[]) {
  const token = useToken();

  return useQuery({
    queryKey: queryKeys.userImages(userIds, token),
    queryFn: async () => {
      if (!token || userIds.length === 0) return {};
      const res = await fetch(
        `/api/images/batch?userIds=${userIds.join(",")}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) return {};
      return await res.json();
    },
    enabled: !!token && userIds.length > 0,
  });
}
