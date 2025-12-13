/**
 * Auth Store - Zustand store for authentication state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    phoneNumber: string | null;
    onboardingComplete?: boolean;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    needsOnboarding: boolean;

    // Actions
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setOnboardingComplete: () => void;
    setNeedsOnboarding: (needs: boolean) => void;
    signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: true,
            error: null,
            needsOnboarding: false,

            setUser: (user) =>
                set({
                    user,
                    isAuthenticated: !!user,
                    isLoading: false,
                    error: null,
                    // Check if user needs onboarding (new user without display name or profile)
                    needsOnboarding: user ? !user.onboardingComplete && !user.displayName : false,
                }),

            setLoading: (isLoading) => set({ isLoading }),

            setError: (error) => set({ error, isLoading: false }),

            setOnboardingComplete: () =>
                set((state) => ({
                    needsOnboarding: false,
                    user: state.user ? { ...state.user, onboardingComplete: true } : null,
                })),

            setNeedsOnboarding: (needsOnboarding) => set({ needsOnboarding }),

            signOut: () =>
                set({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                    error: null,
                    needsOnboarding: false,
                }),
        }),
        {
            name: 'aroosi-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ 
                needsOnboarding: state.needsOnboarding,
            }),
        }
    )
);

