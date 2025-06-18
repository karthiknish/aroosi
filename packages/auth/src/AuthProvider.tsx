"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import type { User, AuthState } from '@aroosi/shared-types';

interface AuthContextType extends AuthState {
  user: User | null;
  isAdmin: boolean;
  getToken: (template?: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { 
    getToken: clerkGetToken, 
    isSignedIn: clerkIsSignedIn, 
    isLoaded: isAuthLoaded,
    signOut: clerkSignOut 
  } = useAuth();

  const isLoaded = isUserLoaded && isAuthLoaded;
  const isSignedIn = Boolean(clerkIsSignedIn && clerkUser);

  // Transform Clerk user to our User type
  const user: User | null = clerkUser ? {
    id: clerkUser.id,
    firstName: clerkUser.firstName || undefined,
    lastName: clerkUser.lastName || undefined,
    emailAddresses: clerkUser.emailAddresses.map(email => ({
      emailAddress: email.emailAddress,
      id: email.id,
    })),
    primaryEmailAddressId: clerkUser.primaryEmailAddressId || undefined,
    imageUrl: clerkUser.imageUrl || undefined,
    username: clerkUser.username || undefined,
    createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : undefined,
    updatedAt: clerkUser.updatedAt ? new Date(clerkUser.updatedAt) : undefined,
  } : null;

  const isAdmin = Boolean(clerkUser?.publicMetadata?.role === 'admin');

  const getToken = async (template = 'convex'): Promise<string | null> => {
    if (!clerkGetToken) return null;
    try {
      return await clerkGetToken({ template });
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  const signOut = async (): Promise<void> => {
    if (clerkSignOut) {
      await clerkSignOut();
    }
  };

  const contextValue: AuthContextType = {
    user,
    userId: user?.id || null,
    isSignedIn,
    isLoaded,
    isAdmin,
    getToken,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}