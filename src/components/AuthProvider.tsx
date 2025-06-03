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
import { Loader2 } from "lucide-react";
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
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  createdAt?: string | Date | number;
  updatedAt?: string | Date | number;
  isOnboardingComplete?: boolean;
  // Add other profile fields as needed
  [key: string]: unknown;
}

interface AuthContextType {
  token: string | null;
  // setToken: (token: string | null) => void; // setToken is internal, not usually exposed directly
  profile: ProfileType | null;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
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

const TOKEN_STORAGE_KEY = "aroosi_auth_token";

// Type for expected profile API response shape
type ProfileApiResponseData = {
  _id?: string;
  id?: string;
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: string | Date | number;
  gender?: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  createdAt?: string | Date | number;
  updatedAt?: string | Date | number;
  isOnboardingComplete?: boolean;
};

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
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(TOKEN_STORAGE_KEY);
      } catch (e) {
        console.error("Failed to read token from localStorage on init:", e);
        return null;
      }
    }
    return null;
  });

  // AuthProvider's own loading and error states
  const [authProviderLoading, setAuthProviderLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  // Refs for managing token refresh logic
  const isRefreshingTokenRef = useRef(false);
  const tokenRefreshPromiseRef = useRef<Promise<string | null> | null>(null);

  // Profile state
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
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

  // Set token in state and localStorage
  const setToken = useCallback(
    (newToken: string | null) => {
      // Only update if the token has actually changed
      if (newToken === token) return;

      setTokenState(newToken);

      if (typeof window !== "undefined") {
        try {
          if (newToken) {
            console.log("AuthProvider raw token:", newToken);
            try {
              const decoded = jwtDecode<JwtPayload>(newToken);
              console.log("AuthProvider decoded token payload:", decoded);
            } catch (error) {
              console.error("AuthProvider - Error decoding token:", error);
            }
            localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
          } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            // Clear sensitive queries on logout or token removal
            queryClient.removeQueries({ queryKey: ["userProfile"] }); // Be more specific
            // queryClient.clear(); // Use if a full cache clear is desired on logout
          }
        } catch (error) {
          console.error("Error updating token in localStorage:", error);
          // Potentially dispatch an error state update here
        }
      }
    },
    [token, queryClient]
  );

  // Sign out function
  const signOut = useCallback(async () => {
    console.log("AuthContext: Signing out...");
    try {
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
        console.log("AuthContext: Clerk sign out complete");
      }

      // Clear any remaining sensitive data
      if (queryClient) {
        queryClient.clear();
      }
    } catch (error) {
      console.error("Error during sign out:", error);
      setAuthError(
        error instanceof Error ? error : new Error("Failed to sign out")
      );
      throw error;
    } finally {
      console.log("AuthContext: Sign out process completed");
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
          const profileResponse = response.data as ProfileApiResponseData;

          // Create a properly typed profile object with defaults
          const profileData: ProfileType = {
            id:
              profileResponse._id?.toString() ||
              profileResponse.id?.toString() ||
              "",
            userId: profileResponse.userId?.toString() || "",
            email: profileResponse.email || "",
            firstName:
              profileResponse.firstName ||
              profileResponse.fullName?.split(" ")[0] ||
              "",
            lastName:
              profileResponse.lastName ||
              profileResponse.fullName?.split(" ").slice(1).join(" ") ||
              "",
            phoneNumber: profileResponse.phoneNumber,
            dateOfBirth: profileResponse.dateOfBirth,
            gender: profileResponse.gender,
            profileImageUrl: profileResponse.profileImageUrl,
            bio: profileResponse.bio,
            location: profileResponse.location,
            createdAt: profileResponse.createdAt,
            updatedAt: profileResponse.updatedAt,
            isOnboardingComplete: Boolean(profileResponse.isOnboardingComplete),
          };

          setProfile(profileData);
          const profileComplete = response.isProfileComplete || false;
          setIsProfileComplete(profileComplete);

          // Set onboarding complete based on profile data
          setIsOnboardingComplete(profileData.isOnboardingComplete || false);

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

      // Initialize token from localStorage if available
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (savedToken) {
        setTokenState(savedToken);
      }

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
        } else if (savedToken) {
          // Clear token if user is not signed in but we have a saved token
          setToken(null);
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

  // After the state for isProfileComplete and isOnboardingComplete is set
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "isProfileComplete",
        JSON.stringify(isProfileComplete)
      );
      localStorage.setItem(
        "isOnboardingComplete",
        JSON.stringify(isOnboardingComplete)
      );
    }
  }, [isProfileComplete, isOnboardingComplete]);

  // No redirection logic here - all redirections are handled by ProtectedRoute component

  // Context value
  const userId = profile?.userId || "";
  const contextValue: AuthContextType = useMemo(
    () => ({
      token,
      profile,
      isProfileComplete,
      isOnboardingComplete,
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
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
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
