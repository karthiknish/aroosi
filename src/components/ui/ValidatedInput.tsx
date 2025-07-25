import React, { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  field: string;
  step: number;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  hint?: string;
  maxLength?: number;
  showCharacterCount?: boolean;
  validateOnMount?: boolean;
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
      className,
      ...props
    },
    ref
  ) => {
    const { isValid, error, isValidating, hasBeenValidated } =
      useFieldValidation(field, value, {
        step,
        validateOnMount,
        debounceMs: 500,
      });

    const showError = hasBeenValidated && !isValid && error;
    const showSuccess =
      hasBeenValidated && isValid && value && value.trim() !== "";
    const characterCount = value?.length || 0;
    const isOverLimit = maxLength && characterCount > maxLength;

    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
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
                "border-red-500 focus:border-red-500 focus:ring-red-500",
              showSuccess && "border-green-500 focus:border-green-500",
              className
            )}
            aria-invalid={showError}
            aria-describedby={
              showError ? `${field}-error` : hint ? `${field}-hint` : undefined
            }
            maxLength={maxLength}
            {...props}
          />

          {/* Validation status icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {isValidating && (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            )}
            {showSuccess && <CheckCircle className="h-4 w-4 text-green-500" />}
            {showError && <AlertCircle className="h-4 w-4 text-red-500" />}
          </div>
        </div>

        {/* Character count */}
        {showCharacterCount && maxLength && (
          <div className="flex justify-end">
            <span
              className={cn(
                "text-xs",
                isOverLimit ? "text-red-500" : "text-gray-500"
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
            className="flex items-center space-x-1 text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Hint text */}
        {hint && !showError && (
          <div id={`${field}-hint`} className="text-sm text-gray-500">
            {hint}
          </div>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";
