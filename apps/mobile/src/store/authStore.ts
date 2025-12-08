/**
 * Auth Store - Zustand store for authentication state
 */

import { create } from 'zustand';

interface User {
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    phoneNumber: string | null;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    setUser: (user) =>
        set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
            error: null,
        }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error, isLoading: false }),

    signOut: () =>
        set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
        }),
}));
