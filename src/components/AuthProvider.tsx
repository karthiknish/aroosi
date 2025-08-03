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

  // Get token from localStorage (legacy sentinel), but prefer cookie-based sessions.
  const getStoredToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    // Only used for backward compatibility. We no longer persist real JWTs client-side.
    const stored = localStorage.getItem("auth-token");
    return stored ? stored : null;
  }, []);

  // Store token in localStorage (legacy) WITHOUT setting any writable auth cookies client-side.
  // Server is the source of truth for HttpOnly cookies.
  const storeToken = useCallback((newToken: string) => {
    if (typeof window === "undefined") return;
    // Persist a minimal marker for legacy callers; do not set client-writable auth cookie.
    localStorage.setItem("auth-token", newToken || "cookie");
    setToken(newToken || "cookie");
  }, []);

  // Remove token from storage (client-side markers only; server cookies are HttpOnly and set by API)
  const removeToken = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("auth-token");
    setToken(null);
  }, []);

  // Fetch current user, with one-shot auto-refresh on 401 if refresh cookie exists.
  const fetchUser = useCallback(
    async (authToken?: string | null): Promise<User | null> => {
      const callMe = async (withBearer?: string | null) => {
        const init: RequestInit = {};
        if (withBearer) {
          init.headers = { Authorization: `Bearer ${withBearer}` };
        }
        const res = await fetch("/api/auth/me", init);
        return res;
      };

      try {
        // 1) Try /api/auth/me (bearer if provided)
        let res = await callMe(authToken ?? null);

        if (res.status === 401) {
          // 2) If unauthorized, try to refresh using cookies, then retry /me once
          try {
            const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
            // If refresh succeeded, retry /me
            if (refreshRes.ok) {
              res = await callMe(null);
            }
          } catch (e) {
            // swallow refresh network errors; will return null below
          }
        }

        if (!res.ok) {
          if (res.status === 401) return null;
          throw new Error(`Failed to fetch user: ${res.status}`);
        }

        const data = await res.json().catch(() => ({} as { user?: User }));
        if (data && data.user) {
          // If authenticated via cookies (no bearer), mark sentinel token
          if (!authToken) {
            setToken((prev) => (prev ? prev : "cookie"));
          }
          return data.user;
        }
        return null;
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
    const userData = await fetchUser(currentToken ?? undefined);
    if (userData) {
      setUser(userData);
      if (!currentToken) {
        setToken("cookie");
      }
    } else {
      setUser(null);
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
      console.log("AuthProvider: Initializing auth state");
      const storedToken = getStoredToken();

      const finalizeAuth = (u: User) => {
        console.log("AuthProvider: Finalizing auth for user:", u.id);
        setUser(u);
        setToken((prev) => (prev && prev !== "" ? prev : "cookie"));
      };

      if (storedToken) {
        console.log("AuthProvider: Found stored token, validating...");
        setToken(storedToken);
        const userData = await fetchUser(storedToken);
        if (userData) {
          finalizeAuth(userData);
        } else {
          console.log(
            "AuthProvider: Stored token invalid, trying cookie session"
          );
          removeToken();
          const cookieUser = await fetchUser(undefined);
          if (cookieUser) {
            finalizeAuth(cookieUser);
          }
        }
      } else {
        console.log("AuthProvider: No stored token, trying cookie session");
        const cookieUser = await fetchUser(undefined);
        if (cookieUser) {
          finalizeAuth(cookieUser);
        }
      }
      setIsLoading(false);
      console.log("AuthProvider: Initialization complete");
    };

    void initAuth();
  }, [getStoredToken, fetchUser, removeToken]);

  // Sign in with email/password
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        console.log("AuthProvider: Starting signIn");
        setError(null);
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
          removeToken();
          setUser(null);
          return { success: false, error: errorMessage };
        }

        console.log("AuthProvider: SignIn successful; hydrating from cookies");
        // Prefer cookie-based session; if server returned token include it for legacy
        if (data && data.token) {
          storeToken(data.token);
        } else {
          storeToken("cookie");
        }
        // Always refresh from /api/auth/me to ensure we have latest profile
        await refreshUser();
        return { success: true };
      } catch (error) {
        console.error("Sign in error:", error);
        const errorMessage = "Network error";
        removeToken();
        setUser(null);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [storeToken, removeToken]
  );

  // Sign up with email/password - UPDATED TO MATCH YOUR SIGNUP API
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string
    ) => {
      try {
        console.log("AuthProvider: Starting signUp (legacy method)");
        setError(null);

        // Clear any existing auth state
        removeToken();
        setUser(null);

        // This is a legacy method - your actual signup goes through CustomSignupForm
        // But we can still support basic signup for backward compatibility
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            fullName: `${firstName} ${lastName}`.trim(),
            // Provide minimal profile data for basic signup
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
              isProfileComplete: false, // Mark as incomplete for basic signup
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || "Sign up failed";
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }

        console.log("AuthProvider: SignUp successful; hydrating from cookies");
        if (data.token) {
          storeToken(data.token);
        } else {
          storeToken("cookie");
        }
        // Refresh from server to finalize session and profile state
        await refreshUser();

        return { success: true };
      } catch (error) {
        console.error("Sign up error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [storeToken, removeToken]
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
    console.log("AuthProvider: Signing out");
    removeToken();
    setUser(null);
    setError(null);
    router.push("/sign-in");
  }, [removeToken, router]);

  // Cookie detection and refresh
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isLoading) return;
    if (token && token !== "") return;

    const cookies = document.cookie.split(";").map((c) => c.trim());
    const hasAuthCookie =
      cookies.some((c) => c.startsWith("auth-token=")) ||
      cookies.some((c) => c.startsWith("authTokenPublic="));

    if (hasAuthCookie && !user) {
      console.log(
        "AuthProvider: Found auth cookies but no user, refreshing..."
      );
      void refreshUser();
    }
  }, [isLoading, token, user, refreshUser]);

  // Computed values for legacy compatibility
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

  // Debug logging
  useEffect(() => {
    console.log("AuthProvider state update:", {
      isAuthenticated,
      isLoaded,
      hasUser: !!user,
      hasToken: !!token,
      tokenType:
        token === "cookie" ? "cookie" : hasRealToken ? "stored" : "none",
    });
  }, [isAuthenticated, isLoaded, user, token, hasRealToken]);

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
    signInWithGoogle,
    signOut,
    refreshUser,
    // Legacy compatibility methods
    getToken,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
