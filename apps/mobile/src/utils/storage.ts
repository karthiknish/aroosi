/**
 * Storage Utility - LocalStorage polyfill with reactive subscriptions
 *
 * Uses expo-sqlite localStorage polyfill for persistent key-value storage.
 * Provides reactive subscriptions for state updates.
 */

import 'expo-sqlite/localStorage/install';

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export const storage = {
    /**
     * Get a value from storage
     * @param key - The storage key
     * @param defaultValue - Default value if key doesn't exist
     * @returns The parsed value or default value
     */
    get<T>(key: string, defaultValue: T): T {
        const value = localStorage.getItem(key);
        if (!value) return defaultValue;
        try {
            return JSON.parse(value) as T;
        } catch {
            return value as T;
        }
    },

    /**
     * Set a value in storage
     * @param key - The storage key
     * @param value - The value to store (will be JSON stringified)
     */
    set<T>(key: string, value: T): void {
        localStorage.setItem(key, JSON.stringify(value));
        listeners.get(key)?.forEach((fn) => fn());
    },

    /**
     * Remove a value from storage
     * @param key - The storage key to remove
     */
    remove(key: string): void {
        localStorage.removeItem(key);
        listeners.get(key)?.forEach((fn) => fn());
    },

    /**
     * Clear all values from storage
     */
    clear(): void {
        localStorage.clear();
        listeners.forEach((set) => set.forEach((fn) => fn()));
    },

    /**
     * Subscribe to changes for a specific key
     * @param key - The storage key to watch
     * @param listener - Callback function when value changes
     * @returns Unsubscribe function
     */
    subscribe(key: string, listener: Listener): () => void {
        if (!listeners.has(key)) {
            listeners.set(key, new Set());
        }
        listeners.get(key)!.add(listener);
        return () => {
            listeners.get(key)?.delete(listener);
            if (listeners.get(key)?.size === 0) {
                listeners.delete(key);
            }
        };
    },

    /**
     * Get all keys from storage
     * @returns Array of all storage keys
     */
    keys(): string[] {
        return Object.keys(localStorage);
    },

    /**
     * Check if a key exists in storage
     * @param key - The storage key to check
     * @returns True if the key exists
     */
    has(key: string): boolean {
        return localStorage.getItem(key) !== null;
    },
};
