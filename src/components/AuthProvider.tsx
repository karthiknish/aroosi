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
  token: string | null;
  // Legacy compatibility properties
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
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (
    email: string,
    otp: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (
    credential: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  // Legacy compatibility methods
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Get token from localStorage or cookie
  const getStoredToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth-token") || null;
  }, []);

  // Store token in localStorage and cookie
  const storeToken = useCallback((newToken: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("auth-token", newToken);
    // Set cookie for middleware
    document.cookie = `auth-token=${newToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=strict`;
    setToken(newToken);
  }, []);

  // Remove token from storage
  const removeToken = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("auth-token");
    document.cookie =
      "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setToken(null);
  }, []);

  // Fetch current user data (supports cookie-only sessions when no token provided)
  const fetchUser = useCallback(
    async (authToken?: string | null): Promise<User | null> => {
      try {
        const init: RequestInit = {};
        if (authToken) {
          init.headers = {
            Authorization: `Bearer ${authToken}`,
          };
        }
        const response = await fetch("/api/auth/me", init);

        if (!response.ok) {
          // 401 means no valid session; treat as logged out
          if (response.status === 401) return null;
          throw new Error("Failed to fetch user");
        }

        // If server rotated cookies, ensure our client state reflects an authenticated session
        // We don't need to read Set-Cookie; presence of 200 OK is enough to mark cookie-session
        const data = await response.json();

        // If we authenticated via cookies (no bearer used), set sentinel token early
        if (!authToken) {
          setToken((prev) => (prev ? prev : "cookie"));
        }

        return data.user;
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    []
  );

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const currentToken = token || getStoredToken();
    // Always attempt to fetch user: if no token, /api/auth/me can still authenticate via HttpOnly cookies
    const userData = await fetchUser(currentToken ?? undefined);
    if (userData) {
      setUser(userData);
      // If we authenticated via cookie only (no local token), set a sentinel token
      if (!currentToken) {
        setToken("cookie"); // sentinel value to mark authenticated session
      }
    } else {
      setUser(null);
      // Do not clear token here; caller may retry or re-authenticate
    }
  }, [token, getStoredToken, fetchUser]);

  // Legacy compatibility method
  const refreshProfile = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  // Legacy compatibility method
  const getToken = useCallback(
    async (forceRefresh?: boolean) => {
      if (forceRefresh) {
        await refreshUser();
      }
      return token || getStoredToken();
    },
    [token, getStoredToken, refreshUser]
  );

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();

      // Helper to finalize authenticated state quickly
      const finalizeAuth = (u: User) => {
        setUser(u);
        // If no real token is stored, mark cookie session
        setToken((prev) => (prev && prev !== "" ? prev : "cookie"));
      };

      // Try local token first, else fall back to cookie-only session
      if (storedToken) {
        setToken(storedToken);
        const userData = await fetchUser(storedToken);
        if (userData) {
          finalizeAuth(userData);
        } else {
          // Invalid token, remove it and try cookie-based session
          removeToken();
          const cookieUser = await fetchUser(undefined);
          if (cookieUser) {
            finalizeAuth(cookieUser);
          }
        }
      } else {
        // No local token: try cookie-based session
        const cookieUser = await fetchUser(undefined);
        if (cookieUser) {
          finalizeAuth(cookieUser);
        }
      }
      setIsLoading(false);
    };

    void initAuth();
  }, [getStoredToken, fetchUser, removeToken]);

  // Sign in with email/password
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);

        // Always clear any existing local token BEFORE attempting sign-in to avoid stale redirects
        removeToken();
        setUser(null);

        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMessage =
            (data && (data.error as string)) || "Sign in failed";
          setError(errorMessage);
          // Ensure no residual token/user remains on failure
          removeToken();
          setUser(null);
          return { success: false, error: errorMessage };
        }

        // Success: store token and user
        if (data && data.token) {
          storeToken(data.token);
        }
        if (data && data.user) {
          setUser(data.user);
        }
        return { success: true };
      } catch (error) {
        console.error("Sign in error:", error);
        const errorMessage = "Network error";
        // Ensure no residual token/user remains on error
        removeToken();
        setUser(null);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [storeToken, removeToken]
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
        setError(null);
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, firstName, lastName }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || "Sign up failed";
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }

        return { success: true };
      } catch (error) {
        console.error("Sign up error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Verify OTP
  const verifyOTP = useCallback(
    async (email: string, otp: string) => {
      try {
        setError(null);
        const response = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, otp }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || "OTP verification failed";
          setError(errorMessage);
          return {
            success: false,
            error: errorMessage,
          };
        }

        storeToken(data.token);
        setUser(data.user);
        return { success: true };
      } catch (error) {
        console.error("OTP verification error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [storeToken]
  );

  // Sign in with Google
  const signInWithGoogle = useCallback(
    async (credential: string) => {
      try {
        setError(null);
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ credential }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || "Google sign in failed";
          setError(errorMessage);
          return {
            success: false,
            error: errorMessage,
          };
        }

        storeToken(data.token);
        setUser(data.user);
        return { success: true };
      } catch (error) {
        console.error("Google sign in error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [storeToken]
  );

  // Sign out
  const signOut = useCallback(() => {
    removeToken();
    setUser(null);
    setError(null);
    router.push("/sign-in");
  }, [removeToken, router]);

  // Optional: if cookies exist but token is null (first paint race), trigger a one-time refresh
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isLoading) return;
    if (token && token !== "") return;

    const cookies = document.cookie.split(";").map((c) => c.trim());
    const hasAuthCookie =
      cookies.some((c) => c.startsWith("auth-token=")) ||
      cookies.some((c) => c.startsWith("authTokenPublic="));

    if (hasAuthCookie) {
      // Kick a background refresh to flip state to authenticated
      void refreshUser();
    }
    // run once post-load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Computed values for legacy compatibility
  // Treat cookie-established sessions as authenticated too, since server sets HttpOnly JWT.
  // This avoids redirecting to "/" or sign-in when the access token is only in cookies.
  const hasRealToken = !!token && token !== "";
  const isCookieSession = token === "cookie";
  const isAuthenticated = !!user && (hasRealToken || isCookieSession);
  const isSignedIn = isAuthenticated;
  const isLoaded = !isLoading;
  const isProfileComplete = user?.profile?.isProfileComplete || false;
  const isOnboardingComplete = user?.profile?.isOnboardingComplete || false;
  const isAdmin = user?.role === "admin";
  const userId = user?.id || "";
  const profile = user?.profile || null;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    token,
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
    verifyOTP,
    signInWithGoogle,
    signOut,
    refreshUser,
    // Legacy compatibility methods
    getToken,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
