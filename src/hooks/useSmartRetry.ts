import { useState, useCallback, useRef } from "react";
import { useOffline } from "./useOffline";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  onMaxAttemptsReached?: (error: any) => void;
}

export interface RetryState {
  isRetrying: boolean;
  attempt: number;
  nextRetryIn: number | null;
  canRetry: boolean;
  error: any | null;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  jitter: true,
  retryCondition: () => true,
  onRetry: () => {},
  onMaxAttemptsReached: () => {},
};

export function useSmartRetry(options: RetryOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const networkStatus = useOffline();
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    nextRetryIn: null,
    canRetry: true,
    error: null,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Calculate delay with exponential backoff and jitter
  const calculateDelay = useCallback((attempt: number): number => {
    let delay = Math.min(
      opts.baseDelay * Math.pow(opts.backoffFactor, attempt),
      opts.maxDelay
    );

    if (opts.jitter) {
      // Add random jitter to prevent thundering herd
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    // Adjust delay based on network quality
    if (!networkStatus.isOnline) {
      delay *= 2; // Double delay when offline
    } else if (networkStatus.isSlowConnection) {
      delay *= 1.5; // 50% longer delay for slow connections
    }

    return Math.round(delay);
  }, [opts, networkStatus]);

  // Check if we should retry based on network conditions
  const shouldRetryBasedOnNetwork = useCallback((error: any): boolean => {
    // Don't retry if we're completely offline and the error is network-related
    if (!networkStatus.isOnline && isNetworkError(error)) {
      return false;
    }

    // For slow connections, be more conservative with retries
    if (networkStatus.isSlowConnection && state.attempt >= 2) {
      return false;
    }

    return opts.retryCondition(error);
  }, [networkStatus, state.attempt, opts]);

  const retry = useCallback(async (fn: () => Promise<any>): Promise<any> => {
    return new Promise((resolve, reject) => {
      const attempt = state.attempt;

      if (attempt >= opts.maxAttempts) {
        setState(prev => ({ ...prev, canRetry: false }));
        opts.onMaxAttemptsReached(state.error);
        reject(new Error(`Max retry attempts (${opts.maxAttempts}) reached`));
        return;
      }

      const delay = calculateDelay(attempt);
      setState(prev => ({
        ...prev,
        isRetrying: true,
        nextRetryIn: delay,
        attempt: attempt + 1,
      }));

      // Create abort controller for this attempt
      abortControllerRef.current = new AbortController();

      const timeout = setTimeout(async () => {
        try {
          opts.onRetry(attempt + 1, state.error);
          const result = await fn();
          setState(prev => ({
            ...prev,
            isRetrying: false,
            nextRetryIn: null,
            error: null,
          }));
          resolve(result);
        } catch (error) {
          setState(prev => ({ ...prev, error }));

          // Check if we should retry based on network conditions
          if (shouldRetryBasedOnNetwork(error) && attempt + 1 < opts.maxAttempts) {
            // Schedule next retry
            retry(fn).then(resolve).catch(reject);
          } else {
            setState(prev => ({
              ...prev,
              isRetrying: false,
              nextRetryIn: null,
              canRetry: false,
            }));
            opts.onMaxAttemptsReached(error);
            reject(error);
          }
        }
      }, delay);

      timeoutRef.current = timeout;
    });
  }, [state.attempt, state.error, opts, calculateDelay, shouldRetryBasedOnNetwork]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState({
      isRetrying: false,
      attempt: 0,
      nextRetryIn: null,
      canRetry: true,
      error: null,
    });
  }, []);

  const manualRetry = useCallback(() => {
    reset();
    setState(prev => ({ ...prev, canRetry: true }));
  }, [reset]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    retry,
    reset,
    manualRetry,
    networkStatus,
  };
}

// Helper function to detect network errors
function isNetworkError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';

  const networkErrorPatterns = [
    'network',
    'connection',
    'timeout',
    'fetch',
    'offline',
    'unreachable',
    'net::err',
    'failed to fetch',
  ];

  const networkErrorCodes = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'CONNECTION_ERROR',
    'FETCH_ERROR',
    'OFFLINE',
  ];

  return networkErrorPatterns.some(pattern => errorMessage.includes(pattern)) ||
         networkErrorCodes.includes(errorCode);
}

// React import for cleanup
import React from "react";
