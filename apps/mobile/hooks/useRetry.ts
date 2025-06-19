import { useState, useCallback, useRef } from 'react';
import { AppError, errorHandler } from '../utils/errorHandling';

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
}

export interface UseRetryResult<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  retry: () => Promise<void>;
  reset: () => void;
  attempt: number;
  canRetry: boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffFactor: 2,
  maxDelayMs: 10000,
};

export function useRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  autoRetry = false
): UseRetryResult<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [attempt, setAttempt] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout>();

  const calculateDelay = useCallback((attemptNumber: number): number => {
    const delay = finalConfig.delayMs * Math.pow(finalConfig.backoffFactor, attemptNumber - 1);
    return Math.min(delay, finalConfig.maxDelayMs);
  }, [finalConfig]);

  const executeOperation = useCallback(async (attemptNumber: number = 1): Promise<void> => {
    setLoading(true);
    setAttempt(attemptNumber);
    
    try {
      const result = await operation();
      setData(result);
      setError(null);
      setLoading(false);
    } catch (err) {
      const appError = errorHandler.handle(err as Error, {
        action: 'retry_operation',
        attempt: attemptNumber,
      });
      
      setError(appError);
      
      // Auto retry if enabled and we haven't exceeded max attempts
      if (autoRetry && attemptNumber < finalConfig.maxAttempts && appError.recoverable) {
        const delay = calculateDelay(attemptNumber);
        
        timeoutRef.current = setTimeout(() => {
          executeOperation(attemptNumber + 1);
        }, delay);
      } else {
        setLoading(false);
      }
    }
  }, [operation, finalConfig.maxAttempts, autoRetry, calculateDelay]);

  const retry = useCallback(async (): Promise<void> => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const nextAttempt = attempt < finalConfig.maxAttempts ? attempt + 1 : 1;
    await executeOperation(nextAttempt);
  }, [attempt, finalConfig.maxAttempts, executeOperation]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setData(null);
    setError(null);
    setLoading(false);
    setAttempt(0);
  }, []);

  const canRetry = !loading && (!error || error.recoverable) && attempt < finalConfig.maxAttempts;

  return {
    data,
    loading,
    error,
    retry,
    reset,
    attempt,
    canRetry,
  };
}