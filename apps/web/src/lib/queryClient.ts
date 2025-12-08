import { QueryClient } from "@tanstack/react-query";

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false, // Disable refetch on window focus
      refetchOnMount: false, // Disable refetch on component mount
      refetchOnReconnect: false, // Disable refetch on reconnect
    },
  },
});

// Shared query keys
export const queryKeys = {
  currentUserProfile: (token: string | null) => ["currentUserProfile", token],
  profileImages: (userId: string, token: string | null) => [
    "profileImages",
    userId,
    token,
  ],
  userImages: (userIds: string[], token: string | null) => [
    "userImages",
    userIds,
    token,
  ],
  searchProfiles: (params: Record<string, string>, token: string | null) => [
    "searchProfiles",
    params,
    token,
  ],
} as const;
