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
    [key: string]: any;
  } | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
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

  // Fetch current user data
  const fetchUser = useCallback(
    async (authToken: string): Promise<User | null> => {
      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }

        const data = await response.json();
        return data.user;
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    [],
  );

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const currentToken = token || getStoredToken();
    if (!currentToken) {
      setUser(null);
      return;
    }

    const userData = await fetchUser(currentToken);
    setUser(userData);
  }, [token, getStoredToken, fetchUser]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      if (storedToken) {
        setToken(storedToken);
        const userData = await fetchUser(storedToken);
        if (userData) {
          setUser(userData);
        } else {
          // Invalid token, remove it
          removeToken();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [getStoredToken, fetchUser, removeToken]);

  // Sign in with email/password
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error || "Sign in failed" };
        }

        storeToken(data.token);
        setUser(data.user);
        return { success: true };
      } catch (error) {
        console.error("Sign in error:", error);
        return { success: false, error: "Network error" };
      }
    },
    [storeToken],
  );

  // Sign up with email/password
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
    ) => {
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, firstName, lastName }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error || "Sign up failed" };
        }

        return { success: true };
      } catch (error) {
        console.error("Sign up error:", error);
        return { success: false, error: "Network error" };
      }
    },
    [],
  );

  // Verify OTP
  const verifyOTP = useCallback(
    async (email: string, otp: string) => {
      try {
        const response = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, otp }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.error || "OTP verification failed",
          };
        }

        storeToken(data.token);
        setUser(data.user);
        return { success: true };
      } catch (error) {
        console.error("OTP verification error:", error);
        return { success: false, error: "Network error" };
      }
    },
    [storeToken],
  );

  // Sign in with Google
  const signInWithGoogle = useCallback(
    async (credential: string) => {
      try {
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ credential }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.error || "Google sign in failed",
          };
        }

        storeToken(data.token);
        setUser(data.user);
        return { success: true };
      } catch (error) {
        console.error("Google sign in error:", error);
        return { success: false, error: "Network error" };
      }
    },
    [storeToken],
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
    verifyOTP,
    signInWithGoogle,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
