// Unified FirebaseAuthProvider shim that re-exports UserProfileProvider.
// This allows existing imports from "@/components/FirebaseAuthProvider" to keep working
// while the system migrates to the consolidated UserProfileProvider.

"use client";

import React, { ReactNode } from "react";
import { UserProfileProvider, useUserProfileContext, useAuthContext as _useAuthContext } from "./UserProfileProvider";
export type { AuthContextValue } from "./UserProfileProvider";
// Backwards compatibility: some tests import AuthContextType
export type AuthContextType = import("./UserProfileProvider").AuthContextValue;

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  return <UserProfileProvider>{children}</UserProfileProvider>;
}

// Re-export hooks for legacy code
export const useAuthContext = _useAuthContext;
export const useFirebaseAuth = _useAuthContext; // alias used in some components

// Named export to aid progressive refactor
export { useUserProfileContext } from "./UserProfileProvider";
