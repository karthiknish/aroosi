"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { tokenStorage } from "@/lib/http/client";

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
    state: string
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
function getInitialToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken") || null;
  }
  return null;
}


export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getInitialToken());
  const router = useRouter();

  // Store tokens in localStorage for persistence and sync the centralized client immediately
  const saveToken = useCallback((token: string | null, refresh?: string | null) => {
    setAccessToken(token);

    // 1) Persist to localStorage
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("accessToken", token);
      else localStorage.removeItem("accessToken");

      if (refresh !== undefined) {
        if (refresh) localStorage.setItem("refreshToken", refresh);
        else localStorage.removeItem("refreshToken");
      }
    }

    // 2) Immediately bootstrap centralized client token storage (emits token-changed inside setters)
    tokenStorage.access = token ?? null;
    if (refresh !== undefined) tokenStorage.refresh = refresh ?? null;
  }, []);

  // Remove all auth markers (access + refresh)
  const removeLocalMarkers = useCallback(() => {
    // Clear both persistence and centralized client storage
    saveToken(null, null);
    tokenStorage.clearAll();
  }, [saveToken]);

  // Fetch current user using Bearer token (centralized http client with auto-refresh on 401)
  const fetchUser = useCallback(async (): Promise<User | null> => {
    if (!accessToken) return null;
    try {
      // Use centralized client to inherit 401 -> refresh retry automatically
      const data = (await (await import("@/lib/http/client")).getJson<{ user?: User }>("/api/auth/me").catch(async (err: any) => {
        // One manual retry after a short delay to cover transient races
        try {
          await new Promise((r) => setTimeout(r, 150));
          return await (await import("@/lib/http/client")).getJson<{ user?: User }>("/api/auth/me");
        } catch {
          throw err;
        }
      })) as { user?: User };
      return data?.user ?? null;
    } catch (error) {
      console.warn("AuthProvider.fetchUser failed", error);
      return null;
    }
  }, [accessToken]);


  // Refresh user data
  const refreshUser = useCallback(async () => {
    const userData = await fetchUser();
    setUser(userData ?? null);
  }, [fetchUser]);

  // Legacy compatibility method
  const refreshProfile = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);


  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      if (accessToken) {
        // Attempt initial fetch with one retry inside fetchUser
        const tokenUser = await fetchUser();
        if (tokenUser) {
          setUser(tokenUser);
        }
      }
      setIsLoading(false);
    };
    void initAuth();

    // Listen for centralized client token changes to keep user state in sync
    const onTokenChanged = (ev: Event) => {
      try {
        // CustomEvent<{accessToken: string|null, refreshToken: string|null, reason: 'set'|'clear'|'refresh'}>
        const detail = (ev as CustomEvent).detail as {
          accessToken: string | null;
          refreshToken: string | null;
          reason: "set" | "clear" | "refresh";
        };
        // Update local access token state for immediate effect
        setAccessToken(detail?.accessToken ?? null);
        // Re-fetch user when we have an access token, or clear user on clear
        if (detail?.accessToken) {
          void refreshUser();
        } else {
          setUser(null);
        }
      } catch {
        // no-op
      }
    };

    // Cross-tab token sync via storage event
    const onStorage = (e: StorageEvent) => {
      try {
        if (!e.key) return;
        if (e.key !== "accessToken" && e.key !== "refreshToken") return;
        const newAccess = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const newRefresh = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
        setAccessToken(newAccess);
        if (newAccess) {
          void refreshUser();
        } else {
          setUser(null);
        }
      } catch {
        // no-op
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("token-changed", onTokenChanged as EventListener);
      window.addEventListener("storage", onStorage);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("token-changed", onTokenChanged as EventListener);
        window.removeEventListener("storage", onStorage);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Sign in with email/password (token-based) + centralized hydration retry
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
          const serverMsg = (data && (data.error as string)) || "Sign in failed";
          const code = (data && (data.code as string)) || undefined;
          const composed = code ? `${serverMsg} (${code})` : serverMsg;
          setError(composed);
          removeLocalMarkers();
          setUser(null);
          return { success: false, error: composed };
        }

        // Store access + refresh tokens
        const token = data.accessToken || data.token;
        const refresh = data.refreshToken || null;
        if (token) saveToken(token, refresh);

        // Hydration retry loop to centralize reliability across callers
        const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
        const backoffs = [0, 150, 300, 750];
        for (let i = 0; i < backoffs.length; i++) {
          if (backoffs[i] > 0) await sleep(backoffs[i]);
          try {
            await refreshUser();
            // If user is populated, we can break early
            if (user) break;
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
              errorMessage = parsed?.code ? `${parsed.error} (${parsed.code})` : parsed.error;
            }
          }
        } catch {
          // keep default
        }
        console.error("Sign in error:", error);
        removeLocalMarkers();
        setUser(null);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [removeLocalMarkers, refreshUser, saveToken, user]
  );


  // Sign up with email/password (token-based)
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

        // Store access + refresh tokens
        const token = data.accessToken || data.token;
        const refresh = data.refreshToken || null;
        if (token) saveToken(token, refresh);
        await refreshUser();
        return { success: true };
      } catch (error) {
        console.error("Sign up error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [removeLocalMarkers, refreshUser, saveToken]
  );


  // Sign in with Google (token-based)
  const signInWithGoogle = useCallback(
    async (credential: string, state: string) => {
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

        // Store access + refresh tokens
        const token = data.accessToken || data.token;
        const refresh = data.refreshToken || null;
        if (token) saveToken(token, refresh);
        await refreshUser();
        return { success: true };
      } catch (error) {
        console.error("Google sign in error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [refreshUser, saveToken]
  );


  // Sign out
  const signOut = useCallback(async () => {
    removeLocalMarkers();
    setUser(null);
    setError(null);
    router.push("/sign-in");
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
    console.log("AuthProvider state update:", {
      isAuthenticated,
      isLoaded,
      hasUser: !!user,
    });
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
