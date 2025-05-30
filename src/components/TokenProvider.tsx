"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";

interface TokenContextType {
  token: string | null;
  setToken: (token: string | null) => void;
}

const TokenContext = createContext<TokenContextType>({
  token: null,
  setToken: () => {},
});

const TOKEN_STORAGE_KEY = "aroosi_auth_token";

export function TokenProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [token, setTokenState] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsClient(true);
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      setTokenState(savedToken);
    }
  }, []);

  // Custom setToken that also updates localStorage
  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (isClient) {
      if (newToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  };

  useEffect(() => {
    if (!isClient) return;

    const fetchToken = async () => {
      try {
        // Get the token with the required audience for Convex
        const newToken = await getToken({ template: "convex" });
        if (newToken) {
          setToken(newToken);
        }
      } catch (error) {
        console.error("Error fetching token:", error);
        setToken(null);
      }
    };

    fetchToken();

    // Set up an interval to refresh the token every 5 minutes
    const intervalId = setInterval(fetchToken, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [getToken, isClient, setToken]);

  // During SSR and initial client render, return null to prevent hydration mismatch
  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <TokenContext.Provider value={{ token, setToken }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error("useToken must be used within a TokenProvider");
  }
  return context.token;
}

export function useSetToken() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error("useSetToken must be used within a TokenProvider");
  }
  return context.setToken;
}
