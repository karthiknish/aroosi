import { useState, useEffect, useCallback, useRef } from "react";
import { validateField } from "@/lib/validation/profileValidation";

interface ValidationState {
  isValid: boolean;
  error?: string;
  isValidating: boolean;
  hasBeenValidated: boolean;
}

interface UseFieldValidationOptions {
  debounceMs?: number;
  validateOnMount?: boolean;
  step: number;
}

export const useFieldValidation = (
  field: string,
  value: unknown,
  options: UseFieldValidationOptions = {
    debounceMs: 500,
    validateOnMount: false,
    step: 1,
  }
) => {
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    isValidating: false,
    hasBeenValidated: false,
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { debounceMs = 500, validateOnMount = false, step } = options;

  const performValidation = useCallback(() => {
    setValidationState((prev) => ({ ...prev, isValidating: true }));

    const result = validateField(field, value, step);

    setValidationState({
      isValid: result.isValid,
      error: result.error,
      isValidating: false,
      hasBeenValidated: true,
    });
  }, [field, value, step]);

  // Debounced validation effect
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Don't validate empty values unless they've been validated before
    if (!value && !validationState.hasBeenValidated && !validateOnMount) {
      return;
    }

    // Set new timeout for validation
    debounceTimeoutRef.current = setTimeout(() => {
      performValidation();
    }, debounceMs);

    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    value,
    debounceMs,
    performValidation,
    validationState.hasBeenValidated,
    validateOnMount,
  ]);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount && value) {
      performValidation();
    }
  }, [validateOnMount, performValidation, value]);

  const clearValidation = useCallback(() => {
    setValidationState({
      isValid: true,
      isValidating: false,
      hasBeenValidated: false,
    });
  }, []);

  const forceValidation = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    performValidation();
  }, [performValidation]);

  return {
    ...validationState,
    clearValidation,
    forceValidation,
  };
};
