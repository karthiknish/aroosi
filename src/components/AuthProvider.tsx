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
    credential: string
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // No token storage at all; cookie-auth only
  const removeLocalMarkers = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("auth-token");
    } catch {}
  }, []);

  // Fetch current user via cookie-auth only; /api/auth/me proxies refresh if needed.
  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        headers: { accept: "application/json", "cache-control": "no-store" },
      });

      if (!res.ok) {
        try {
          const body = await res.json();
          console.warn("AuthProvider.fetchUser: /api/auth/me not OK", body);
        } catch {}
        return null;
      }

      const data = (await res.json().catch(() => ({}))) as { user?: User };
      return data?.user ?? null;
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  }, []);

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
      console.log(
        "AuthProvider: Initializing auth state (cookie session only)"
      );
      const cookieUser = await fetchUser();
      if (cookieUser) setUser(cookieUser);
      setIsLoading(false);
      console.log("AuthProvider: Initialization complete");
    };
    void initAuth();
  }, [fetchUser]);

  // Sign in with email/password
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        console.log("AuthProvider: Starting signIn");
        setError(null);
        removeLocalMarkers();
        setUser(null);

        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMessage =
            (data && (data.error as string)) || "Sign in failed";
          setError(errorMessage);
          removeLocalMarkers();
          setUser(null);
          return { success: false, error: errorMessage };
        }

        console.log("AuthProvider: SignIn successful; hydrating from cookies");
        await refreshUser();
        return { success: true };
      } catch (error) {
        console.error("Sign in error:", error);
        const errorMessage = "Network error";
        removeLocalMarkers();
        setUser(null);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [removeLocalMarkers, refreshUser]
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
        removeLocalMarkers();
        setUser(null);

        // This is a legacy method - your actual signup goes through CustomSignupForm
        // But we can still support basic signup for backward compatibility
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
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

        console.log("AuthProvider: SignUp successful; hydrating from cookies");
        await refreshUser();

        return { success: true };
      } catch (error) {
        console.error("Sign up error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [removeLocalMarkers, refreshUser]
  );

  // Sign in with Google
  const signInWithGoogle = useCallback(
    async (credential: string) => {
      try {
        setError(null);
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ credential }),
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
        console.error("Google sign in error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [refreshUser]
  );

  // Sign out
  const signOut = useCallback(async () => {
    console.log("AuthProvider: Signing out");
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    removeLocalMarkers();
    setUser(null);
    setError(null);
    router.push("/sign-in");
  }, [removeLocalMarkers, router]);

  // Cookie detection and refresh
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isLoading) return;

    const cookies = document.cookie.split(";").map((c) => c.trim());
    const hasAnyAuthCookie =
      cookies.some((c) => c.startsWith("auth-token=")) ||
      cookies.some((c) => c.startsWith("refresh-token=")) ||
      cookies.some((c) => c.startsWith("authTokenPublic="));

    if (hasAnyAuthCookie && !user) {
      console.log(
        "AuthProvider: Auth cookies detected but no user, refreshing..."
      );
      void refreshUser();
    }
  }, [isLoading, user, refreshUser]);

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
