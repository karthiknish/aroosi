"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  createdAt?: number;
  profile?: {
    id: string;
    fullName?: string;
    isProfileComplete?: boolean;
    isOnboardingComplete?: boolean;
    [key: string]: unknown;
  } | null;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Legacy compatibility properties (sans token)
  isSignedIn: boolean;
  isLoaded: boolean;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
  isAdmin: boolean;
  userId: string;
  profile: unknown | null;
  error: string | null;
  // Auth methods
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (
    credential: string,
    state?: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  // Legacy compatibility methods
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Alias for backward compatibility
export const useAuthContext = useAuth;

interface AuthProviderProps {
  children: React.ReactNode;
}

// Util: get token from localStorage (for SSR safety, fallback to memory)

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // Guard against late async state overwrites during logout
  const logoutVersionRef = React.useRef(0);

  // Store tokens in localStorage for persistence and sync the centralized client immediately
  const saveToken = useCallback(
    (_token: string | null, _refresh?: string | null) => {
      // No-op in Convex cookie session model; kept for legacy compatibility with callers
    },
    []
  );

  // Remove all auth markers (access + refresh)
  const removeLocalMarkers = useCallback(() => {
    // No tokens to clear in cookie-based auth; kept for compatibility
    saveToken(null, null);
  }, [saveToken]);

  // Fetch current user using Bearer token (centralized http client with auto-refresh on 401)
  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const data = (await (await import("@/lib/http/client"))
        .getJson<{ user?: User }>("/api/auth/me")
        .catch(async (err: any) => {
          try {
            await new Promise((r) => setTimeout(r, 150));
            return await (
              await import("@/lib/http/client")
            ).getJson<{ user?: User }>("/api/auth/me");
          } catch {
            throw err;
          }
        })) as { user?: User };
      return data?.user ?? null;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("AuthProvider.fetchUser failed");
      }
      return null;
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    // Capture current logout version to ignore late updates occurring after a logout
    const version = logoutVersionRef.current;
    const userData = await fetchUser();
    if (logoutVersionRef.current !== version) {
      // A logout occurred while we were fetching; ignore this result
      return;
    }
    setUser(userData ?? null);
  }, [fetchUser]);

  // Legacy compatibility method
  const refreshProfile = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const tokenUser = await fetchUser();
      if (tokenUser) {
        setUser(tokenUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };
    void initAuth();
  }, [fetchUser]);

  // Sign in with email/password (cookie-session) + centralized hydration retry
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        removeLocalMarkers();
        setUser(null);

        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          // Improve error message with server code if present
          const serverMsg =
            (data && (data.error as string)) || "Sign in failed";
          const code = (data && (data.code as string)) || undefined;
          const composed = code ? `${serverMsg} (${code})` : serverMsg;
          setError(composed);
          removeLocalMarkers();
          setUser(null);
          return { success: false, error: composed };
        }

        // Hydration retry loop to centralize reliability across callers
        const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
        const backoffs = [0, 150, 300, 750];
        for (let i = 0; i < backoffs.length; i++) {
          if (backoffs[i] > 0) await sleep(backoffs[i]);
          try {
            await refreshUser();
            // If user now present, we can break early
            if (typeof window !== "undefined") break;
          } catch {
            // continue to next backoff
          }
        }

        return { success: true };
      } catch (error: any) {
        // Include message/code if server provided in text
        let errorMessage = "Network error";
        try {
          if (typeof error?.message === "string") {
            const parsed = JSON.parse(error.message);
            if (parsed?.error) {
              errorMessage = parsed?.code
                ? `${parsed.error} (${parsed.code})`
                : parsed.error;
            }
          }
        } catch {
          // keep default
        }
        if (process.env.NODE_ENV !== "production") {
          console.error("Sign in error");
        }
        removeLocalMarkers();
        setUser(null);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [removeLocalMarkers, refreshUser]
  );

  // Sign up with email/password (cookie-session)
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string
    ) => {
      try {
        setError(null);
        removeLocalMarkers();
        setUser(null);

        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            fullName: `${firstName} ${lastName}`.trim(),
            profile: {
              fullName: `${firstName} ${lastName}`.trim(),
              email,
              dateOfBirth: "1990-01-01",
              gender: "other",
              city: "Not specified",
              aboutMe: "Hello!",
              occupation: "Not specified",
              education: "Not specified",
              height: "170 cm",
              maritalStatus: "single",
              phoneNumber: "+10000000000",
              isProfileComplete: false,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || "Sign up failed";
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }
        await refreshUser();
        return { success: true };
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Sign up error");
        }
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [removeLocalMarkers, refreshUser]
  );

  // Sign in with Google (cookie-session)
  const signInWithGoogle = useCallback(
    async (credential: string, state?: string) => {
      try {
        setError(null);
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential, state }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || "Google sign in failed";
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }
        await refreshUser();
        return { success: true };
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Google sign in error");
        }
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [refreshUser]
  );

  // Sign out
  const signOut = useCallback(async () => {
    logoutVersionRef.current += 1;
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      }).catch(() => {});
    } finally {
      removeLocalMarkers();
      setUser(null);
      setError(null);
      router.push("/sign-in");
    }
  }, [removeLocalMarkers, router]);

  // Remove legacy cookie detection effect

  // Computed values
  const isAuthenticated = !!user;
  const isSignedIn = isAuthenticated;
  const isLoaded = !isLoading;
  const isProfileComplete = user?.profile?.isProfileComplete || false;
  const isOnboardingComplete = user?.profile?.isOnboardingComplete || false;
  const isAdmin = user?.role === "admin";
  const userId = user?.id || "";
  const profile = user?.profile || null;

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // dev: auth provider state update
    }
  }, [isAuthenticated, isLoaded, user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    // Legacy compatibility
    isSignedIn,
    isLoaded,
    isProfileComplete,
    isOnboardingComplete,
    isAdmin,
    userId,
    profile,
    error,
    // Auth methods
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshUser,
    // Legacy compatibility methods
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
