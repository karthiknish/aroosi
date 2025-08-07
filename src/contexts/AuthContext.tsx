"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { getJson, postJson, tokenStorage } from "@/lib/http/client";
import { waitForAccessToken } from "@/lib/auth/requireAccessTokenClient";

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

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
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
    credential: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Get token from centralized storage (localStorage under the hood)
  const getStoredToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return tokenStorage.access;
  }, []);

  // Store token via centralized storage
  const storeToken = useCallback((newToken: string) => {
    if (typeof window === "undefined") return;
    tokenStorage.access = newToken;
    setToken(newToken);
  }, []);

  // Remove token from storage
  const removeToken = useCallback(() => {
    if (typeof window === "undefined") return;
    tokenStorage.clearAll();
    setToken(null);
  }, []);

  // Fetch current user data using Authorization header (auto-attached)
  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const data = await getJson<{ user: User }>("/api/auth/me", {
        cache: "no-store",
      });
      return data?.user ?? null;
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }, []);

  // Refresh user data (guarded: ensure token exists before calling /api/auth/me)
  const refreshUser = useCallback(async () => {
    let currentToken = token || getStoredToken();
    if (!currentToken) {
      currentToken = await waitForAccessToken(1000, 50);
    }
    if (!currentToken) {
      setUser(null);
      return;
    }
    const userData = await fetchUser();
    setUser(userData);
  }, [token, getStoredToken, fetchUser]);

  // Initialize auth state (guard: wait briefly for token to exist in client before calling /api/auth/me)
  useEffect(() => {
    const initAuth = async () => {
      // Wait up to 1.5s for access token to appear (handles race right after sign-in/redirect)
      const tokenMaybe = (await waitForAccessToken(1500, 50)) || getStoredToken();
      if (tokenMaybe) {
        setToken(tokenMaybe);
        const userData = await fetchUser();
        if (userData) {
          setUser(userData);
        } else {
          // Invalid token, remove it
          removeToken();
        }
      }
      setIsLoading(false);
    };

    void initAuth();
  }, [getStoredToken, fetchUser, removeToken]);

  // React to token changes immediately (token event bus)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        accessToken: string | null;
        refreshToken: string | null;
        reason: "set" | "clear" | "refresh";
      };
      setToken(detail?.accessToken ?? null);
      // On token set or refresh, proactively refresh user
      if (detail?.accessToken) {
        void refreshUser();
      } else {
        // token cleared -> clear user
        setUser(null);
      }
    };
    window.addEventListener("token-changed", handler as EventListener);
    return () => window.removeEventListener("token-changed", handler as EventListener);
  }, [refreshUser]);

  // Sign in with email/password using centralized client
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const data = await postJson<{
          accessToken?: string;
          user?: User;
          error?: string;
        }>("/api/auth/signin", { email, password }, { cache: "no-store" });

        if (!data || !data.accessToken || !data.user) {
          return { success: false, error: data?.error || "Sign in failed" };
        }

        storeToken(data.accessToken);
        setUser(data.user);
        return { success: true };
      } catch (error) {
        console.error("Sign in error:", error);
        return { success: false, error: "Network error" };
      }
    },
    [storeToken]
  );

  // Sign up with email/password
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string
    ) => {
      try {
        // signup may or may not return tokens; treat as public
        const data = await postJson<{ error?: string }>(
          "/api/auth/signup",
          { email, password, firstName, lastName },
          { skipAuth: true, noRefresh: true, cache: "no-store" }
        );

        if ((data as any)?.error) {
          return {
            success: false,
            error: (data as any).error || "Sign up failed",
          };
        }

        return { success: true };
      } catch (error) {
        console.error("Sign up error:", error);
        return { success: false, error: "Network error" };
      }
    },
    []
  );

  // Sign in with Google (public)
  const signInWithGoogle = useCallback(
    async (credential: string) => {
      try {
        const data = await postJson<{
          accessToken?: string;
          user?: User;
          error?: string;
        }>(
          "/api/auth/google",
          { credential },
          { skipAuth: true, noRefresh: true, cache: "no-store" }
        );

        if (!data || !data.accessToken || !data.user) {
          return {
            success: false,
            error: data?.error || "Google sign in failed",
          };
        }

        storeToken(data.accessToken);
        setUser(data.user);
        return { success: true };
      } catch (error) {
        console.error("Google sign in error:", error);
        return { success: false, error: "Network error" };
      }
    },
    [storeToken]
  );

  // Sign out
  const signOut = useCallback(() => {
    removeToken();
    setUser(null);
    router.push("/");
  }, [removeToken, router]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && !!token,
    token,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
