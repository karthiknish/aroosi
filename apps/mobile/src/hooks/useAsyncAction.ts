/**
 * useAsyncAction Hook - Standardized loading/error state management
 * 
 * Provides consistent patterns for:
 * - Loading states (global and per-action)
 * - Error handling (Alert or inline)
 * - Success callbacks
 * - Retry mechanisms
 */

import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { isNetworkError, getNetworkErrorMessage } from './useOffline';
import { nowTimestamp } from '../utils/timestamp';

export type ErrorDisplayMode = 'alert' | 'inline' | 'silent';

export interface AsyncActionOptions {
    /** How to display errors: 'alert' (modal), 'inline' (sets error state), 'silent' (no display) */
    errorMode?: ErrorDisplayMode;
    /** Custom error title for alerts */
    errorTitle?: string;
    /** Success message to show as alert (if provided) */
    successMessage?: string;
    /** Success callback */
    onSuccess?: () => void;
    /** Error callback */
    onError?: (error: Error) => void;
    /** Whether to show offline-specific error messages */
    networkAware?: boolean;
}

export interface AsyncActionState<T> {
    loading: boolean;
    error: string | null;
    data: T | null;
    lastUpdated: number | null;
}

export interface AsyncActionResult<T, Args extends unknown[] = []> {
    /** Current state */
    state: AsyncActionState<T>;
    /** Whether an action is currently loading */
    loading: boolean;
    /** Current error message (null if no error) */
    error: string | null;
    /** Last successful result data */
    data: T | null;
    /** Execute the async action */
    execute: (...args: Args) => Promise<T | null>;
    /** Clear the error state */
    clearError: () => void;
    /** Reset all state */
    reset: () => void;
    /** Retry the last action */
    retry: () => Promise<T | null>;
}

const initialState: AsyncActionState<unknown> = {
    loading: false,
    error: null,
    data: null,
    lastUpdated: null,
};

/**
 * Hook for handling async actions with standardized loading and error states
 */
export function useAsyncAction<T, Args extends unknown[] = []>(
    action: (...args: Args) => Promise<T>,
    options: AsyncActionOptions = {}
): AsyncActionResult<T, Args> {
    const {
        errorMode = 'alert',
        errorTitle = 'Error',
        successMessage,
        onSuccess,
        onError,
        networkAware = true,
    } = options;

    const [state, setState] = useState<AsyncActionState<T>>({
        loading: false,
        error: null,
        data: null,
        lastUpdated: null,
    });

    // Track last args for retry
    const lastArgsRef = useRef<Args | null>(null);

    const handleError = useCallback((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        
        let message: string;
        if (networkAware && isNetworkError(error)) {
            message = getNetworkErrorMessage(error, false);
        } else {
            message = err.message || 'Something went wrong. Please try again.';
        }

        setState(prev => ({
            ...prev,
            loading: false,
            error: message,
        }));

        if (errorMode === 'alert') {
            const title = networkAware && isNetworkError(error) 
                ? 'Connection Error' 
                : errorTitle;
            Alert.alert(title, message);
        }

        onError?.(err);

        return null;
    }, [errorMode, errorTitle, networkAware, onError]);

    const execute = useCallback(async (...args: Args): Promise<T | null> => {
        lastArgsRef.current = args;

        setState(prev => ({
            ...prev,
            loading: true,
            error: null,
        }));

        try {
            const result = await action(...args);

            setState({
                loading: false,
                error: null,
                data: result,
                lastUpdated: nowTimestamp(),
            });

            if (successMessage) {
                Alert.alert('Success', successMessage);
            }

            onSuccess?.();

            return result;
        } catch (error) {
            return handleError(error);
        }
    }, [action, handleError, onSuccess, successMessage]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const reset = useCallback(() => {
        setState({
            loading: false,
            error: null,
            data: null,
            lastUpdated: null,
        });
        lastArgsRef.current = null;
    }, []);

    const retry = useCallback(async (): Promise<T | null> => {
        if (lastArgsRef.current) {
            return execute(...lastArgsRef.current);
        }
        return null;
    }, [execute]);

    return {
        state,
        loading: state.loading,
        error: state.error,
        data: state.data,
        execute,
        clearError,
        reset,
        retry,
    };
}

/**
 * Hook for handling multiple async actions with individual loading states
 */
export function useAsyncActions<T extends Record<string, (...args: any[]) => Promise<any>>>(
    actions: T,
    options: AsyncActionOptions = {}
): {
    loading: Record<keyof T, boolean>;
    errors: Record<keyof T, string | null>;
    execute: { [K in keyof T]: (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]> | null> };
    clearErrors: () => void;
} {
    const [loading, setLoading] = useState<Record<string, boolean>>(
        Object.keys(actions).reduce((acc, key) => ({ ...acc, [key]: false }), {})
    );
    const [errors, setErrors] = useState<Record<string, string | null>>(
        Object.keys(actions).reduce((acc, key) => ({ ...acc, [key]: null }), {})
    );

    const { errorMode = 'alert', errorTitle = 'Error', networkAware = true } = options;

    const execute = Object.keys(actions).reduce((acc, key) => {
        acc[key as keyof T] = async (...args: any[]) => {
            setLoading(prev => ({ ...prev, [key]: true }));
            setErrors(prev => ({ ...prev, [key]: null }));

            try {
                const result = await actions[key](...args);
                setLoading(prev => ({ ...prev, [key]: false }));
                return result;
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                let message: string;
                if (networkAware && isNetworkError(error)) {
                    message = getNetworkErrorMessage(error, false);
                } else {
                    message = err.message || 'Something went wrong.';
                }

                setLoading(prev => ({ ...prev, [key]: false }));
                setErrors(prev => ({ ...prev, [key]: message }));

                if (errorMode === 'alert') {
                    const title = networkAware && isNetworkError(error) 
                        ? 'Connection Error' 
                        : errorTitle;
                    Alert.alert(title, message);
                }

                return null;
            }
        };
        return acc;
    }, {} as { [K in keyof T]: (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]> | null> });

    const clearErrors = useCallback(() => {
        setErrors(Object.keys(actions).reduce((acc, key) => ({ ...acc, [key]: null }), {}));
    }, [actions]);

    return {
        loading: loading as Record<keyof T, boolean>,
        errors: errors as Record<keyof T, string | null>,
        execute,
        clearErrors,
    };
}

/**
 * Inline error display component helper
 */
export function getInlineErrorStyle() {
    return {
        color: '#DC2626',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center' as const,
    };
}
