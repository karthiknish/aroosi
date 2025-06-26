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
// import { showErrorToast } from "@/lib/ui/toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useOneSignal } from "@/hooks/useOneSignal";
import { Profile } from "@/types/profile";
// import { toast } from "sonner"; // Or your preferred toast library

// Placeholder for toast if not using a specific library for this example
// const toast = {
//   success: (message: string) => console.log("Toast Success:", message),
//   error: (message: string) => console.error("Toast Error:", message),
// };

interface AuthContextType {
  token: string | null;
  // setToken: (token: string | null) => void; // setToken is internal, not usually exposed directly
  profile: Profile | null;
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
  const [profile, setProfile] = useState<Profile | null>(null);

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

  // Enhanced getToken with refresh management and error handling
  const getToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      if (!clerkGetToken) {
        console.warn("AuthProvider: clerkGetToken is not available");
        return null;
      }

      try {
        if (forceRefresh) {
          // If we're already refreshing, return the existing promise
          if (isRefreshingTokenRef.current && tokenRefreshPromiseRef.current) {
            return tokenRefreshPromiseRef.current;
          }

          isRefreshingTokenRef.current = true;
          const newRefreshPromise = clerkGetToken({ template: "convex" })
            .then((token) => {
              if (token) {
                setTokenState(token);
              }
              return token;
            })
            .catch((error) => {
              console.error("AuthProvider: Error forcing token refresh:", error);
              setAuthError(error);
              throw error;
            })
            .finally(() => {
              isRefreshingTokenRef.current = false;
              tokenRefreshPromiseRef.current = null;
            });

          tokenRefreshPromiseRef.current = newRefreshPromise;
          return newRefreshPromise;
        }

        // For non-forced requests, use cached token if available
        const newToken = await clerkGetToken({ template: "convex" });
        
        // Auto-update token state if it changed
        if (newToken && newToken !== token) {
          setTokenState(newToken);
        }
        
        return newToken;
      } catch (error) {
        console.error("AuthProvider: Error getting token:", error);
        setAuthError(error as Error);
        return null;
      }
    },
    [clerkGetToken, token]
  );

  // Set token in state with enhanced validation and session persistence
  const setToken = useCallback(
    (newToken: string | null) => {
      // Only update if the token has actually changed
      if (newToken === token) return;

      // Validate token before setting
      if (newToken) {
        try {
          const decoded = jwtDecode<JwtPayload>(newToken);
          
          // Check if token is expired
          if (decoded.exp && decoded.exp < Date.now() / 1000) {
            console.warn("AuthProvider: Received expired token, clearing auth state");
            setTokenState(null);
            setAuthError(new Error("Token expired"));
            return;
          }
          
          // Clear any previous auth errors when setting valid token
          if (authError) {
            setAuthError(null);
          }
        } catch (error) {
          console.error("AuthProvider: Error decoding token:", error);
          setAuthError(error as Error);
          setTokenState(null);
          return;
        }
      }

      setTokenState(newToken);

      // Clear relevant cache when token is cleared
      if (!newToken) {
        queryClient.removeQueries({ queryKey: ["userProfile"] });
        setProfile(null);
        setIsProfileComplete(false);
        setIsOnboardingComplete(false);
      }
    },
    [token, queryClient, authError]
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
          const envelope = (userData as { data?: unknown })?.data ?? userData;
          const typedEnvelope = envelope as { profile?: Partial<Profile>; role?: string } & Partial<Profile>;

          const nestedProfile = typedEnvelope.profile || {};

          const profileData: Profile = {
            ...nestedProfile,
            role: typedEnvelope.role || nestedProfile.role || "",
          } as Profile;

          setProfile(profileData);

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
        console.error("AuthProvider: Error fetching user profile:", error);
        
        // Handle specific error cases
        if (error instanceof Error) {
          if (error.message.includes("401") || error.message.includes("Unauthorized")) {
            // Token might be expired or invalid, try to refresh
            try {
              const freshToken = await getToken(true);
              if (!freshToken) {
                throw new Error("Failed to refresh token");
              }
              // Retry the profile fetch with fresh token
              const retryResponse = await getCurrentUserWithProfile(freshToken);
              if (retryResponse.success && retryResponse.data) {
                return retryResponse.data;
              }
            } catch (retryError) {
              console.error("AuthProvider: Failed to retry profile fetch:", retryError);
              setAuthError(new Error("Session expired. Please sign in again."));
              await signOut();
            }
          } else {
            setAuthError(error);
          }
        }
        
        return null;
      }
    },
    enabled: !!token && isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && 
          (error.message.includes("401") || error.message.includes("Unauthorized"))) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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

  // Token expiration check
  const checkTokenExpiration = useCallback(async () => {
    if (!token) return;

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Date.now() / 1000;
      const timeToExpiry = (decoded.exp || 0) - now;
      
      // If token expires within 5 minutes, refresh it
      if (timeToExpiry < 300) {
        console.log("AuthProvider: Token expiring soon, refreshing...");
        const freshToken = await getToken(true);
        if (!freshToken) {
          console.warn("AuthProvider: Failed to refresh expiring token");
          await signOut();
        }
      }
    } catch (error) {
      console.error("AuthProvider: Error checking token expiration:", error);
    }
  }, [token, getToken, signOut]);

  // Set up token expiration check interval
  useEffect(() => {
    if (!token) return;

    // Check immediately
    checkTokenExpiration();

    // Set up interval to check every 2 minutes
    const interval = setInterval(checkTokenExpiration, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [token, checkTokenExpiration]);

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
        } else {
          // Clear auth state if not signed in
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

  const PushInit: React.FC = () => {
    useOneSignal();
    return null;
  };

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
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      <PushInit />
      {children}
    </AuthContext.Provider>
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
