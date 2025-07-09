"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useOneSignal } from "@/hooks/useOneSignal";
import { Profile } from "@/types/profile";

interface AuthContextType {
  user: {
    id: string;
    email: string;
    role?: string;
  } | null;
  profile: Profile | null;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoaded: boolean;
  isAdmin: boolean;
  error: Error | null;
  refreshProfile: () => Promise<void>;
  updateProfileCompletion: (isComplete: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  userId: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Auth state
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  const [authProviderLoading, setAuthProviderLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  // Derived states
  const isAuthenticated = Boolean(user);
  const isAdmin = useMemo(() => {
    return user?.role === "admin";
  }, [user?.role]);

  // Check authentication status by validating session cookie
  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          if (data.profile) {
            setProfile(data.profile);
            setIsProfileComplete(Boolean(data.profile.isProfileComplete));
            setIsOnboardingComplete(Boolean(data.profile.isOnboardingComplete));
          }
          setAuthError(null);
          return data.user;
        }
      }
      
      // If response is not ok or no user data, clear auth state
      setUser(null);
      setProfile(null);
      setIsProfileComplete(false);
      setIsOnboardingComplete(false);
      return null;
    } catch (error) {
      console.error('AuthProvider: Error checking auth status:', error);
      setAuthError(error as Error);
      setUser(null);
      setProfile(null);
      setIsProfileComplete(false);
      setIsOnboardingComplete(false);
      return null;
    }
  }, []);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      // Call sign out API to clear server-side session
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('AuthProvider: Error during sign out:', error);
    }

    // Clear local auth state
    setUser(null);
    setProfile(null);
    setIsProfileComplete(false);
    setIsOnboardingComplete(false);
    setAuthError(null);

    // Clear React Query cache
    queryClient.clear();

    // Clear any localStorage data
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("isProfileComplete");
        localStorage.removeItem("isOnboardingComplete");
      } catch (err) {
        console.error("AuthProvider: Failed to clear localStorage", err);
      }
    }

    // Redirect to sign in page
    router.push('/sign-in');
  }, [queryClient, router]);

  // Refresh profile data
  const refreshProfile = useCallback(async (): Promise<void> => {
    try {
      await checkAuthStatus();
    } catch (error) {
      console.error("Error refreshing profile:", error);
      throw error;
    }
  }, [checkAuthStatus]);

  // Update profile and onboarding completion status
  const updateProfileCompletion = useCallback(
    async (isComplete: boolean, isOnboardingCompleteParam?: boolean) => {
      setIsProfileComplete(isComplete);
      if (isOnboardingCompleteParam !== undefined) {
        setIsOnboardingComplete(isOnboardingCompleteParam);
      }
      
      // Update localStorage cache
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("isProfileComplete", String(isComplete));
          if (isOnboardingCompleteParam !== undefined) {
            localStorage.setItem("isOnboardingComplete", String(isOnboardingCompleteParam));
          }
        } catch (err) {
          console.error("AuthProvider: Failed to update localStorage", err);
        }
      }
    },
    [],
  );

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === "undefined") return;

      setAuthProviderLoading(true);

      try {
        // Check if user is authenticated by validating session
        await checkAuthStatus();
      } catch (error) {
        console.error("AuthProvider: Error initializing auth:", error);
        setAuthError(error as Error);
      } finally {
        setAuthProviderLoading(false);
      }
    };

    void initializeAuth();
  }, [checkAuthStatus]);

  // Periodic session check to detect session expiration
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check session every 5 minutes
    const interval = setInterval(async () => {
      try {
        await checkAuthStatus();
      } catch (error) {
        console.error("AuthProvider: Session check failed:", error);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, checkAuthStatus]);

  const PushInit: React.FC = () => {
    useOneSignal();
    return null;
  };

  // Context value
  const userId = user?.id || "";
  const isLoaded = !authProviderLoading;
  const contextValue: AuthContextType = useMemo(
    () => ({
      user,
      profile,
      isProfileComplete,
      isOnboardingComplete,
      isLoading: authProviderLoading,
      isAuthenticated,
      isLoaded,
      isAdmin,
      error: authError,
      refreshProfile,
      updateProfileCompletion,
      signOut,
      userId,
    }),
    [
      user,
      profile,
      isProfileComplete,
      isOnboardingComplete,
      authProviderLoading,
      isAuthenticated,
      isLoaded,
      isAdmin,
      authError,
      refreshProfile,
      updateProfileCompletion,
      signOut,
      userId,
    ],
  );

  if (authProviderLoading) {
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
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
