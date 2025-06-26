import { useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  isLoading: boolean;
  token: string | null;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoaded: false,
    isSignedIn: false,
    isLoading: true,
    token: null,
    isProfileComplete: false,
    isOnboardingComplete: false,
  });

  useEffect(() => {
    // Mock authentication logic
    setTimeout(() => {
      setAuthState({
        user: null,
        isLoaded: true,
        isSignedIn: false,
        isLoading: false,
        token: null,
        isProfileComplete: false,
        isOnboardingComplete: false,
      });
    }, 100);
  }, []);

  return authState;
}