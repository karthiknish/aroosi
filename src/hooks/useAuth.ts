'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { JWTUtils } from '@/lib/utils/jwt';

export interface User {
  id: string;
  email: string;
  role?: string;
  emailVerified?: boolean;
  createdAt?: number;
  lastLoginAt?: number;
}

export interface Profile {
  id: string;
  fullName?: string;
  isProfileComplete?: boolean;
  isOnboardingComplete?: boolean;
}

export interface AuthSession {
  id: string;
  createdAt: number;
  lastActivity?: number;
}

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthContextType extends AuthState {
  signIn: (credentials: SignInCredentials) => Promise<{ success: boolean; error?: string }>;
  signUp: (credentials: SignUpCredentials) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => void;
  isAdmin: boolean;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
}

const STORAGE_KEY = 'auth_state';

export function useAuth(): AuthContextType {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedState = JSON.parse(stored);
          setState(prev => ({
            ...prev,
            ...parsedState,
            isLoading: false,
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadAuthState();
  }, []);

  // Save auth state to localStorage
  const saveAuthState = useCallback((authState: Partial<AuthState>) => {
    try {
      const stateToSave = {
        user: authState.user,
        profile: authState.profile,
        session: authState.session,
        isAuthenticated: authState.isAuthenticated,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving auth state:', error);
    }
  }, []);

  // Refresh authentication state
  const refreshAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const newState = {
            user: data.data.user,
            profile: data.data.profile,
            session: data.data.session,
            isAuthenticated: true,
            isLoading: false,
          };
          
          setState(newState);
          saveAuthState(newState);
        } else {
          throw new Error(data.error || 'Failed to refresh auth');
        }
      } else {
        throw new Error('Failed to refresh auth');
      }
    } catch (error) {
      console.error('Error refreshing auth:', error);
      const newState = {
        user: null,
        profile: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      };
      
      setState(newState);
      saveAuthState(newState);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [saveAuthState]);

  // Check auth state on mount and when dependencies change
  useEffect(() => {
    if (!state.isLoading && state.isAuthenticated) {
      refreshAuth();
    }
  }, []); // Only run once on mount

  // Sign in
  const signIn = useCallback(async (credentials: SignInCredentials) => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await refreshAuth();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Sign in failed' };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Network error' };
    }
  }, [refreshAuth]);

  // Sign up
  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Sign up failed' };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Network error' };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Clear local state regardless of API response
      const newState = {
        user: null,
        profile: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      };
      
      setState(newState);
      localStorage.removeItem(STORAGE_KEY);
      
      // Redirect to sign in page
      router.push('/sign-in');
    }
  }, [router]);

  // Update profile
  const updateProfile = useCallback((profileUpdate: Partial<Profile>) => {
    setState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, ...profileUpdate } : null,
    }));
  }, []);

  // Computed properties
  const isAdmin = state.user?.role === 'admin';
  const isProfileComplete = state.profile?.isProfileComplete ?? false;
  const isOnboardingComplete = state.profile?.isOnboardingComplete ?? false;

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshAuth,
    updateProfile,
    isAdmin,
    isProfileComplete,
    isOnboardingComplete,
  };
}

// Hook for accessing auth context
export function useAuthContext(): AuthContextType {
  return useAuth();
}

// Hook for requiring authentication
export function useRequireAuth(redirectTo = '/sign-in'): AuthContextType {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push(redirectTo);
    }
  }, [auth.isLoading, auth.isAuthenticated, router, redirectTo]);

  return auth;
}

// Hook for accessing current user
export function useUser(): User | null {
  const auth = useAuth();
  return auth.user;
}

// Hook for accessing current profile
export function useProfile(): Profile | null {
  const auth = useAuth();
  return auth.profile;
}