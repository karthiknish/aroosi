"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";

const TokenContext = createContext<string | null>(null);

export const TokenProvider = ({ children }: { children: ReactNode }) => {
  const { getToken, isSignedIn } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isSignedIn) {
      getToken({ template: "convex" }).then((t) => {
        if (isMounted) setToken(t);
      });
    } else {
      setToken(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isSignedIn, getToken]);

  return (
    <TokenContext.Provider value={token}>{children}</TokenContext.Provider>
  );
};

export const useToken = () => useContext(TokenContext);
