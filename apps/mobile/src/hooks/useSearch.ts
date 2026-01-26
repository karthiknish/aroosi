/**
 * useSearch Hook - Native search state management for Expo Router
 */

import { useEffect, useState } from 'react';
import { useNavigation } from 'expo-router';

export interface UseSearchOptions {
    placeholder?: string;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    inputType?: 'text' | 'phone' | 'number' | 'email';
    cancelButtonText?: string;
    hideWhenScrolling?: boolean;
    hideNavigationBar?: boolean;
    obscureBackground?: boolean;
    placement?: 'automatic' | 'inline' | 'stacked';
    onChangeText?: (event: any) => void;
    onSearchButtonPress?: (event: any) => void;
    onCancelButtonPress?: (event: any) => void;
    onFocus?: () => void;
    onBlur?: () => void;
}

export function useSearch(options: UseSearchOptions = {}) {
    const [search, setSearch] = useState('');
    const navigation = useNavigation();

    useEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerSearchBarOptions: {
                placeholder: options.placeholder || 'Search...',
                autoCapitalize: options.autoCapitalize || 'none',
                inputType: options.inputType || 'text',
                cancelButtonText: options.cancelButtonText || 'Cancel',
                hideWhenScrolling: options.hideWhenScrolling ?? false,
                hideNavigationBar: options.hideNavigationBar ?? false,
                obscureBackground: options.obscureBackground ?? false,
                placement: options.placement || 'automatic',
                onChangeText(e: any) {
                    setSearch(e.nativeEvent.text);
                    options.onChangeText?.(e);
                },
                onSearchButtonPress(e: any) {
                    setSearch(e.nativeEvent.text);
                    options.onSearchButtonPress?.(e);
                },
                onCancelButtonPress(e: any) {
                    setSearch('');
                    options.onCancelButtonPress?.(e);
                },
                onFocus: options.onFocus,
                onBlur: options.onBlur,
            },
        });
    }, [options, navigation]);

    return search;
}

/**
 * Debounce hook for delaying search input
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}
