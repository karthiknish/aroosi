import { useState, useCallback, useMemo } from "react";
import {
  validateStep,
  getRequiredFields,
} from "@/lib/validation/profileValidation";

interface StepValidationState {
  isValid: boolean;
  errors: Record<string, string>;
  isValidating: boolean;
  completedFields: string[];
  requiredFields: string[];
  progress: number;
}

interface UseStepValidationOptions {
  step: number;
  data: Record<string, unknown>;
  onValidationChange?: (
    isValid: boolean,
    errors: Record<string, string>
  ) => void;
}

export const useStepValidation = ({
  step,
  data,
  onValidationChange,
}: UseStepValidationOptions) => {
  const [validationState, setValidationState] = useState<StepValidationState>({
    isValid: true,
    errors: {},
    isValidating: false,
    completedFields: [],
    requiredFields: [],
    progress: 0,
  });

  // Get required fields for current step
  const requiredFields = useMemo(() => {
    return getRequiredFields(step);
  }, [step]);

  // Calculate completed fields and progress
  const { completedFields, progress } = useMemo(() => {
    const completed = requiredFields.filter((field) => {
      const value = data[field];
      return (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0)
      );
    });

    const progressPercentage =
      requiredFields.length > 0
        ? (completed.length / requiredFields.length) * 100
        : 100;

    return {
      completedFields: completed,
      progress: Math.round(progressPercentage),
    };
  }, [data, requiredFields]);

  // Validate current step
  const validateCurrentStep = useCallback(async () => {
    setValidationState((prev) => ({ ...prev, isValidating: true }));

    try {
      const result = validateStep(data, step);

      const newState: StepValidationState = {
        isValid: result.isValid,
        errors: result.errors,
        isValidating: false,
        completedFields,
        requiredFields,
        progress,
      };

      setValidationState(newState);

      // Notify parent component of validation changes
      if (onValidationChange) {
        onValidationChange(result.isValid, result.errors);
      }

      return result;
    } catch (error) {
      console.error("Step validation error:", error);

      const errorState: StepValidationState = {
        isValid: false,
        errors: { general: "Validation error occurred. Please try again." },
        isValidating: false,
        completedFields,
        requiredFields,
        progress,
      };

      setValidationState(errorState);

      if (onValidationChange) {
        onValidationChange(false, errorState.errors);
      }

      return { isValid: false, errors: errorState.errors };
    }
  }, [
    data,
    step,
    completedFields,
    requiredFields,
    progress,
    onValidationChange,
  ]);

  // Get validation summary for display
  const getValidationSummary = useCallback(() => {
    const errorCount = Object.keys(validationState.errors).length;
    const missingRequired = requiredFields.filter(
      (field) => !completedFields.includes(field)
    );

    return {
      hasErrors: errorCount > 0,
      errorCount,
      missingRequiredCount: missingRequired.length,
      missingRequiredFields: missingRequired,
      canProceed: validationState.isValid && missingRequired.length === 0,
      summary:
        errorCount > 0
          ? `${errorCount} error${errorCount > 1 ? "s" : ""} need${errorCount === 1 ? "s" : ""} to be fixed`
          : missingRequired.length > 0
            ? `${missingRequired.length} required field${missingRequired.length > 1 ? "s" : ""} remaining`
            : "All requirements completed",
    };
  }, [
    validationState.errors,
    validationState.isValid,
    requiredFields,
    completedFields,
  ]);

  // Clear validation errors
  const clearValidation = useCallback(() => {
    setValidationState((prev) => ({
      ...prev,
      isValid: true,
      errors: {},
      isValidating: false,
    }));
  }, []);

  // Get field-specific error
  const getFieldError = useCallback(
    (field: string) => {
      return validationState.errors[field];
    },
    [validationState.errors]
  );

  // Check if field is required for current step
  const isFieldRequired = useCallback(
    (field: string) => {
      return requiredFields.includes(field);
    },
    [requiredFields]
  );

  // Check if field is completed
  const isFieldCompleted = useCallback(
    (field: string) => {
      return completedFields.includes(field);
    },
    [completedFields]
  );

  return {
    ...validationState,
    validateCurrentStep,
    getValidationSummary,
    clearValidation,
    getFieldError,
    isFieldRequired,
    isFieldCompleted,
    requiredFields,
    completedFields,
    progress,
  };
};
