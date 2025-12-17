import React, { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidatedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "aria-invalid"> {
  label: string;
  field: string;
  step: number;
  value: string;
  onValueChange: (value: string) => void;
  // Optional: use a different value for validation than the displayed string
  validationValue?: unknown;
  required?: boolean;
  hint?: string;
  maxLength?: number;
  showCharacterCount?: boolean;
  validateOnMount?: boolean;
  externalError?: string;
}

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      label,
      field,
      step,
      value,
      onValueChange,
      required = false,
      hint,
      maxLength,
      showCharacterCount = false,
      validateOnMount = false,
      validationValue,
      externalError,
      className,
      ...props
    },
    ref
  ) => {
    const { isValid, error: internalError, isValidating, hasBeenValidated } =
          useFieldValidation(field, validationValue ?? value, {
        step,
        validateOnMount,
        debounceMs: 500,
      });

    const error = externalError || internalError;
    const showError = (hasBeenValidated && !isValid && error) || !!externalError;
    const showSuccess =
      !externalError && hasBeenValidated && isValid && value && value.trim() !== "";
    const characterCount = value?.length || 0;
    const isOverLimit = maxLength && characterCount > maxLength;

    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="text-sm font-medium text-neutral">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>

        <div className="relative">
          <Input
            ref={ref}
            id={field}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className={cn(
              "transition-colors duration-200",
              showError &&
                "border-danger focus:border-danger focus:ring-danger",
              showSuccess && "border-success focus:border-success",
              className
            )}
            aria-invalid={showError ? true : false}
            aria-describedby={
              showError ? `${field}-error` : hint ? `${field}-hint` : undefined
            }
            maxLength={maxLength}
            {...props}
          />

          {/* Validation status icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {isValidating && (
              <Loader2 className="h-4 w-4 text-neutral-light animate-spin" />
            )}
            {showSuccess && <CheckCircle className="h-4 w-4 text-success" />}
            {showError && <AlertCircle className="h-4 w-4 text-danger" />}
          </div>
        </div>

        {/* Character count */}
        {showCharacterCount && maxLength && (
          <div className="flex justify-end">
            <span
              className={cn(
                "text-xs",
                isOverLimit ? "text-danger" : "text-neutral-light"
              )}
            >
              {characterCount}/{maxLength}
            </span>
          </div>
        )}

        {/* Error message */}
        {showError && (
          <div
            id={`${field}-error`}
            className="flex items-center space-x-1 text-sm text-danger"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Hint text */}
        {hint && !showError && (
          <div id={`${field}-hint`} className="text-sm text-neutral-light">
            {hint}
          </div>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";
