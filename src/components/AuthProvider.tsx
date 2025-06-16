"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
  useCallback,
  useRef, // Added: For token refresh management
} from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { useQuery, useQueryClient } from "@tanstack/react-query"; // Added: useQueryClient
// import { usePathname, useRouter } from "next/navigation";
import { getCurrentUserWithProfile } from "@/lib/profile/userProfileApi";
import { setCachedProfileComplete } from "@/lib/cache";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
// import { toast } from "sonner"; // Or your preferred toast library

// Placeholder for toast if not using a specific library for this example
// const toast = {
//   success: (message: string) => console.log("Toast Success:", message),
//   error: (message: string) => console.error("Toast Error:", message),
// };

interface ProfileType {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string | Date | number;
  gender?: string;
  // profileImageUrl and bio removed – we now rely solely on array `profileImageUrls` and `aboutMe`.
  createdAt?: string | Date | number;
  updatedAt?: string | Date | number;
  isOnboardingComplete: boolean;
  isApproved: boolean;
  isProfileComplete: boolean;
  // Add other profile fields as needed
  [key: string]: unknown;
  banned: boolean;
  hiddenFromSearch: boolean;
  role: string;
  ukCity: string;
  profileImageUrls: string[];
}

interface AuthContextType {
  token: string | null;
  // setToken: (token: string | null) => void; // setToken is internal, not usually exposed directly
  profile: ProfileType | null;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
  isApproved: boolean;
  isLoading: boolean; // Consolidated loading state for consumer
  isSignedIn: boolean; // Stricter isSignedIn status
  isLoaded: boolean; // Clerk and AuthProvider fully initialized
  isAdmin: boolean;
  error: Error | null;
  refreshProfile: () => Promise<void>;
  updateProfileCompletion: (isComplete: boolean) => Promise<void>;
  signOut: (redirectToSignIn?: boolean) => Promise<void>;
  getToken: (forceRefresh?: boolean) => Promise<string | null>; // Enhanced getToken
  userId: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const {
    getToken: clerkGetToken,
    isSignedIn: clerkIsSignedIn = false, // Renamed to avoid clash with context's isSignedIn
    isLoaded: isClerkLoaded = false,
    signOut: clerkSignOut,
  } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded = false } = useUser();
  const queryClient = useQueryClient(); // Added

  // Token state
  const [token, setTokenState] = useState<string | null>(null);

  // AuthProvider's own loading and error states
  const [authProviderLoading, setAuthProviderLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  // Refs for managing token refresh logic
  const isRefreshingTokenRef = useRef(false);
  const tokenRefreshPromiseRef = useRef<Promise<string | null> | null>(null);

  // Profile state
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);
  const [isOnboardingComplete, setIsOnboardingComplete] =
    useState<boolean>(false);
  const [profile, setProfile] = useState<ProfileType | null>(null);

  // Combined overall loaded state (Clerk + AuthProvider initial tasks)
  const isFullyLoaded = Boolean(
    isClerkLoaded && isUserLoaded && !authProviderLoading
  );

  // Derived states
  const isAdmin = useMemo(() => {
    return clerkUser?.publicMetadata?.role === "admin" || false;
  }, [clerkUser]);

  // Stricter isSignedIn for context consumers
  const isSignedIn = useMemo(() => {
    return !!(clerkIsSignedIn && token);
  }, [clerkIsSignedIn, token]);

  // Wrapped getToken with refresh management
  const getToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      if (!clerkGetToken) {
        console.warn("clerkGetToken is not available");
        return null;
      }
      if (forceRefresh) {
        if (isRefreshingTokenRef.current && tokenRefreshPromiseRef.current) {
          return tokenRefreshPromiseRef.current;
        }
        isRefreshingTokenRef.current = true;
        const newRefreshPromise = clerkGetToken({ template: "convex" })
          .then((t) => t) // t can be null
          .catch((error) => {
            console.error("Error forcing token refresh via Clerk:", error);
            throw error; // Re-throw to be caught by caller
          })
          .finally(() => {
            isRefreshingTokenRef.current = false;
            tokenRefreshPromiseRef.current = null;
          });
        tokenRefreshPromiseRef.current = newRefreshPromise;
        return newRefreshPromise;
      }
      // For non-forced requests, Clerk handles caching.
      // ALWAYS use the convex template to ensure correct audience claims.
      return clerkGetToken({ template: "convex" });
    },
    [clerkGetToken]
  );

  // Set token in state
  const setToken = useCallback(
    (newToken: string | null) => {
      // Only update if the token has actually changed
      if (newToken === token) return;

      setTokenState(newToken);

      // Token persistence to localStorage removed for security. Still decode for debugging.
      if (newToken) {
        try {
          jwtDecode<JwtPayload>(newToken);
        } catch (error) {
          console.error("AuthProvider - Error decoding token:", error);
        }
      }
      // Clear relevant cache when token is cleared.
      if (!newToken) {
        queryClient.removeQueries({ queryKey: ["userProfile"] });
      }
    },
    [token, queryClient]
  );

  // Sign out function
  const signOut = useCallback(async () => {
    // Clear local auth state immediately
    setToken(null); // This will also clear from localStorage and parts of queryClient
    setProfile(null);
    setIsProfileComplete(false);
    setIsOnboardingComplete(false);
    setAuthError(null);

    // Reset token refresh mechanism
    isRefreshingTokenRef.current = false;
    tokenRefreshPromiseRef.current = null;

    // Sign out from Clerk
    if (clerkSignOut) {
      await clerkSignOut();
    }

    // Clear any remaining sensitive data
    if (queryClient) {
      queryClient.clear();
    }

    // Clear completion flags from localStorage explicitly on sign-out (token already in memory only)
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("isProfileComplete");
        localStorage.removeItem("isOnboardingComplete");
      } catch (err) {
        console.error("AuthProvider: Failed to clear completion flags", err);
      }
    }
  }, [clerkSignOut, setToken, queryClient]);

  // Fetch user profile when token changes
  const { isLoading: isProfileLoading } = useQuery({
    queryKey: ["userProfile", token],
    queryFn: async () => {
      if (!token) return null;
      try {
        const response = await getCurrentUserWithProfile(token);
        if (response.success && response.data) {
          // Safely extract data from the response
          const userData = response.data as unknown; // raw response data from API
          // Some endpoints wrap payload in `data` field. Support both shapes.
          /* eslint-disable @typescript-eslint/no-explicit-any */
          const envelope: any = (userData as any)?.data ?? userData;
          /* eslint-enable @typescript-eslint/no-explicit-any */

          const nestedProfile = envelope.profile || {};

          const profileData: ProfileType = {
            // IDs & user info
            id: String(nestedProfile._id ?? ""),
            userId: String(envelope._id ?? envelope.userId ?? ""),
            email: envelope.email || "",

            // Names strictly from nestedProfile
            firstName:
              nestedProfile.firstName ??
              (typeof nestedProfile.fullName === "string"
                ? nestedProfile.fullName.split(" ")[0]
                : ""),
            lastName:
              nestedProfile.lastName ??
              (typeof nestedProfile.fullName === "string"
                ? nestedProfile.fullName.split(" ").slice(1).join(" ")
                : ""),

            // Profile details
            phoneNumber: nestedProfile.phoneNumber,
            dateOfBirth: nestedProfile.dateOfBirth,
            gender: nestedProfile.gender,
            ukCity: nestedProfile.ukCity ?? nestedProfile.location,

            // New array of image URLs
            profileImageUrls: Array.isArray(nestedProfile.profileImageUrls)
              ? nestedProfile.profileImageUrls
              : [],

            // Timestamps
            createdAt:
              nestedProfile.createdAt ??
              envelope.createdAt ??
              envelope._creationTime,
            updatedAt: nestedProfile.updatedAt ?? envelope.updatedAt,

            // Flags
            isOnboardingComplete: Boolean(nestedProfile.isOnboardingComplete),
            isProfileComplete: Boolean(nestedProfile.isProfileComplete),
            isApproved: Boolean(nestedProfile.isApproved),

            // Additional flags / roles
            banned: Boolean(nestedProfile.banned),
            hiddenFromSearch: Boolean(nestedProfile.hiddenFromSearch),
            role: envelope.role || "",
          };

          setProfile(profileData);
          console.log("profileData", profileData);

          // Completion flags are now directly read from the correctly built profileData
          const rawIsProfileComplete = Boolean(profileData.isProfileComplete);
          const rawIsOnboardingComplete = Boolean(
            profileData.isOnboardingComplete
          );

          // Ensure flags are always boolean to unblock UI logic
          setIsProfileComplete(rawIsProfileComplete);
          setIsOnboardingComplete(rawIsOnboardingComplete);

          return profileData;
        }
        return null;
      } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }
    },
    enabled: !!token && isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const handleRefreshProfile = useCallback(async (): Promise<void> => {
    try {
      await queryClient.refetchQueries({ queryKey: ["userProfile", token] });
    } catch (error) {
      console.error("Error refreshing profile:", error);
      throw error;
    }
  }, [queryClient, token]);

  // Update profile and onboarding completion status
  const updateProfileCompletion = useCallback(
    async (isComplete: boolean, isOnboardingCompleteParam?: boolean) => {
      setIsProfileComplete(isComplete);
      if (isComplete && clerkUser?.id) {
        await setCachedProfileComplete(clerkUser.id, isComplete);
      }
      if (isOnboardingCompleteParam !== undefined) {
        setIsOnboardingComplete(isOnboardingCompleteParam);
      }
    },
    [clerkUser?.id]
  );

  // Initialize auth state and handle session changes in a single effect
  useEffect(() => {
    const initializeAuth = async () => {
      // Only run in browser
      if (typeof window === "undefined") return;

      // Wait for Clerk to be fully loaded
      if (!isClerkLoaded || !isUserLoaded) return;

      setAuthProviderLoading(true);

      try {
        if (clerkIsSignedIn) {
          // Get fresh token and update state
          const freshToken = await getToken();
          if (freshToken) {
            setToken(freshToken);
          } else {
            console.warn(
              "AuthProvider: Clerk session active but no token. Signing out."
            );
            await signOut();
          }
        }
      } catch (error) {
        console.error("AuthProvider: Error initializing auth:", error);
        setAuthError(error as Error);
        await signOut();
      } finally {
        setAuthProviderLoading(false);
      }
    };

    initializeAuth();
  }, [
    isClerkLoaded,
    isUserLoaded,
    clerkIsSignedIn,
    getToken,
    setToken,
    signOut,
  ]);

  // No redirection logic here - all redirections are handled by ProtectedRoute component

  // Context value
  const userId = profile?.userId || "";
  const contextValue: AuthContextType = useMemo(
    () => ({
      token,
      profile,
      isProfileComplete,
      isOnboardingComplete,
      isApproved: profile?.isApproved ?? false,
      isLoading: !isFullyLoaded || isProfileLoading, // Overall loading state
      isSignedIn, // Uses the stricter memoized version
      isLoaded: isFullyLoaded, // Clerk and AuthProvider are ready
      isAdmin,
      error: authError,
      refreshProfile: handleRefreshProfile,
      updateProfileCompletion,
      signOut,
      getToken,
      userId,
    }),
    [
      token,
      profile,
      isProfileComplete,
      isOnboardingComplete,
      isFullyLoaded,
      isProfileLoading,
      isSignedIn,
      isAdmin,
      authError,
      handleRefreshProfile,
      updateProfileCompletion,
      signOut,
      getToken,
      userId,
    ]
  ) as AuthContextType;

  if (!isFullyLoaded && !token) {
    // Show loader if not fully loaded AND no initial token (to prevent flash if token exists)
    // This prevents loader flash if Clerk loads fast and user is already "signed in" via local token
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  // Explicit return type
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
