/**
 * useStorage Hook - Reactive storage hook for localStorage
 *
 * Automatically syncs with localStorage changes across components.
 */

import { useSyncExternalStore } from 'react';
import { storage } from '../utils/storage';

/**
 * Hook for reactive localStorage access
 * @param key - The storage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns [value, setValue] tuple
 */
export function useStorage<T>(
    key: string,
    defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    const value = useSyncExternalStore(
        (cb) => storage.subscribe(key, cb),
        () => storage.get(key, defaultValue)
    );

    const setValue = (newValue: T | ((prev: T) => T)) => {
        const valueToStore = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;
        storage.set(key, valueToStore);
    };

    return [value, setValue];
}

/**
 * Hook for boolean storage values
 * @param key - The storage key
 * @param defaultValue - Default value (default: false)
 * @returns [value, toggle, setValue] tuple
 */
export function useBooleanStorage(
    key: string,
    defaultValue = false
): [boolean, () => void, (value: boolean) => void] {
    const [value, setValue] = useStorage(key, defaultValue);

    const toggle = () => setValue(!value);

    return [value, toggle, setValue];
}
