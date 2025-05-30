"use client";
import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToken } from "./TokenProvider";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Profile } from "@/types/profile";

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ProfileCompletionContextType {
  isProfileComplete: boolean;
  isLoading: boolean;
  refetchProfile: () => Promise<void>;
  profile: Profile | null | undefined;
}

const ProfileCompletionContext = createContext<ProfileCompletionContextType>({
  isProfileComplete: false,
  isLoading: true,
  refetchProfile: async () => {},
  profile: undefined,
});

export function ProfileCompletionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const token = useToken();

  const {
    data: profileData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["currentUserProfile", token], // Include token in the query key
    queryFn: async () => {
      if (!token) return null;
      convexClient.setAuth(token);
      return convexClient.query(api.users.getCurrentUserWithProfile);
    },
    enabled: !!token,
  });

  // Derive isProfileComplete directly from the fetched data
  const isProfileComplete = Boolean(
    profileData?.profile?.fullName &&
      profileData?.profile?.dateOfBirth &&
      profileData?.profile?.gender &&
      profileData?.profile?.ukCity &&
      profileData?.profile?.religion &&
      profileData?.profile?.aboutMe &&
      profileData?.profile?.partnerPreferenceAgeMin !== undefined &&
      profileData?.profile?.partnerPreferenceAgeMin !== null &&
      profileData?.profile?.partnerPreferenceAgeMax !== undefined &&
      profileData?.profile?.partnerPreferenceAgeMax !== null &&
      profileData?.profile?.partnerPreferenceReligion &&
      profileData?.profile?.partnerPreferenceReligion.length > 0 &&
      profileData?.profile?.partnerPreferenceUkCity &&
      profileData?.profile?.partnerPreferenceUkCity.length > 0 &&
      profileData?.profile?.profileImageIds &&
      profileData?.profile?.profileImageIds.length > 0
  );

  const refetchProfile = async () => {
    await refetch();
  };

  return (
    <ProfileCompletionContext.Provider
      value={{
        isProfileComplete,
        isLoading,
        refetchProfile,
        profile: profileData?.profile,
      }}
    >
      {children}
    </ProfileCompletionContext.Provider>
  );
}

export const useProfileCompletion = () => useContext(ProfileCompletionContext);
